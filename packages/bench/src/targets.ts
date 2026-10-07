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

export async function inspectTarget(
  side: Side,
  input: string,
  timeout: number,
): Promise<Target> {
  const url = normalizeUrl(input);
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeout),
      headers: { accept: "text/html,application/xhtml+xml" },
    });
  } catch (error) {
    const reason =
      error instanceof Error
        ? ((error.cause as Error | undefined)?.message ?? error.message)
        : String(error);
    throw new BenchError(
      `Could not reach the ${side} URL ${url.href}: ${reason}`,
    );
  }
  if (!response.ok) {
    throw new BenchError(
      `The ${side} URL ${url.href} responded with HTTP ${response.status}.`,
    );
  }
  const contentType = response.headers.get("content-type") ?? "";
  const html = await response.text();
  if (!/html/i.test(contentType) && !/<html[\s>]/i.test(html)) {
    throw new BenchError(
      `The ${side} URL ${url.href} did not return an HTML page (${contentType || "no content type"}).`,
    );
  }
  const finalUrl = new URL(response.url || url.href);
  return {
    side,
    input,
    url: url.href,
    finalUrl: finalUrl.href,
    status: response.status,
    local: isLocalHost(finalUrl.hostname),
    devServer: detectDevServer(html),
  };
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
