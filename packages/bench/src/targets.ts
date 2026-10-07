import type { Browser, Response } from "playwright-core";
import { BenchError } from "./errors";
import type { Comparability, Side, Target } from "./types";

const PRIVATE_IPV4 = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(?:1[6-9]|2\d|3[01])\./,
  /^0\.0\.0\.0$/,
];

export function isLocalHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "::1" ||
    PRIVATE_IPV4.some((pattern) => pattern.test(host))
  );
}

/** Accepts `localhost:4321` or `example.com` as well as full http(s) URLs. */
export function normalizeUrl(input: string) {
  const value = input.trim();
  if (!value) throw new BenchError("A URL is required.");
  let url: URL;
  try {
    url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `http://${value}`,
    );
  } catch {
    throw new BenchError(`Invalid URL: ${input}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BenchError(`Only http and https URLs are supported: ${input}`);
  }
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(value) && !isLocalHost(url.hostname)) {
    url.protocol = "https:";
  }
  return url;
}

// Development servers ship unminified code, HMR clients and on-demand
// transforms, so their performance numbers say nothing about production.
const DEV_SERVER_MARKERS: [string, RegExp][] = [
  ["Astro", /astro\/dist\/runtime\/client\/dev-toolbar|astro-dev-toolbar/],
  ["Vite", /\/@vite\/client/],
  [
    "Next.js",
    // Production Turbopack builds also ship a `turbopack-*.js` runtime chunk, so
    // match only the dev-only HMR client, devtools and webpack runtime.
    /\/_next\/static\/[^"']*(?:hmr-client|next-devtools|_browser_dev_|react-refresh)|\/_next\/static\/chunks\/webpack\.js\?v=|\/_next\/webpack-hmr/,
  ],
  ["webpack", /webpack-dev-server|__webpack_hmr/],
  ["React Refresh", /@react-refresh|react-refresh-runtime/],
];

export function detectDevServer(html: string) {
  return (
    DEV_SERVER_MARKERS.find(([, pattern]) => pattern.test(html))?.[0] ?? null
  );
}

/** Bot-protection pages would be measured instead of the site. */
const CHALLENGE_HEADERS = ["x-vercel-mitigated", "cf-mitigated"];

/**
 * Load the URL in the browser that takes the measurements. Bot protection on
 * hosts such as Vercel and Cloudflare challenges plain HTTP clients but lets
 * Chrome through, so a fetch-based check would reject reachable sites.
 */
export async function inspectTarget(
  browser: Browser,
  side: Side,
  input: string,
  timeout: number,
): Promise<Target> {
  const url = normalizeUrl(input);
  const context = await browser.newContext({ serviceWorkers: "block" });
  try {
    const page = await context.newPage();
    let response: Response | null;
    try {
      response = await page.goto(url.href, {
        waitUntil: "domcontentloaded",
        timeout,
      });
    } catch (error) {
      const reason = (error instanceof Error ? error.message : String(error))
        .split("\n")[0]!
        .replace(/^page\.goto: /, "");
      throw new BenchError(
        `Could not reach the ${side} URL ${url.href}: ${reason}`,
      );
    }
    if (!response) {
      throw new BenchError(`The ${side} URL ${url.href} returned no response.`);
    }
    const headers = response.headers();
    if (CHALLENGE_HEADERS.some((name) => headers[name] === "challenge")) {
      throw new BenchError(
        `The ${side} URL ${url.href} is behind a bot challenge, which would be measured instead of the page. Allow the benchmark through or measure a local build.`,
      );
    }
    if (!response.ok()) {
      throw new BenchError(
        `The ${side} URL ${url.href} responded with HTTP ${response.status()}.`,
      );
    }
    const contentType = headers["content-type"] ?? "";
    const html = await response.text().catch(() => "");
    if (!/html/i.test(contentType) && !/<html[\s>]/i.test(html)) {
      throw new BenchError(
        `The ${side} URL ${url.href} did not return an HTML page (${contentType || "no content type"}).`,
      );
    }
    const finalUrl = new URL(page.url());
    return {
      side,
      input,
      url: url.href,
      finalUrl: finalUrl.href,
      status: response.status(),
      local: isLocalHost(finalUrl.hostname),
      devServer: detectDevServer(html),
    };
  } finally {
    await context.close();
  }
}

/** Whether timing results from the two targets can be compared fairly. */
export function assessComparability(
  original: Target,
  ported: Target,
): Comparability {
  const reasons: string[] = [];
  if (original.local !== ported.local) {
    reasons.push(
      `The ${original.local ? "original" : "ported"} URL is local and the ${original.local ? "ported" : "original"} URL is remote, so network, CDN and protocol differences are mixed into timings.`,
    );
  }
  for (const target of [original, ported]) {
    if (target.devServer) {
      reasons.push(
        `The ${target.side} URL is served by a development server (${target.devServer}); use a production build.`,
      );
    }
  }
  return { comparable: reasons.length === 0, reasons };
}

/**
 * Resolve which URL is which. Named flags are preferred because positional
 * URLs are easy to swap, which silently inverts every comparison.
 */
export function resolveTargetUrls(
  flags: { original?: string; ported?: string },
  positional: readonly string[],
): { original: string; ported: string; warning?: string } {
  const named = flags.original !== undefined || flags.ported !== undefined;
  if (named && positional.length > 0) {
    throw new BenchError(
      `Pass the URLs either as --original and --ported or positionally, not both (got ${positional.join(" ")}).`,
    );
  }
  if (named) {
    const missing = (["original", "ported"] as const).filter(
      (key) => flags[key] === undefined,
    );
    if (missing.length > 0) {
      throw new BenchError(
        `Missing ${missing.map((key) => `--${key} <url>`).join(" and ")}.`,
      );
    }
    return { original: flags.original!, ported: flags.ported! };
  }
  if (positional.length !== 2) {
    throw new BenchError("Pass both URLs: --original <url> --ported <url>.");
  }
  const [original, ported] = positional as [string, string];
  return {
    original,
    ported,
    warning: `Reading ${original} as the original and ${ported} as the port. Use --original and --ported to avoid swapping them.`,
  };
}
