import puppeteer, { type Browser } from "@cloudflare/puppeteer";
import { buildCacheHeaders } from "../lib/cache";
import { decodeQueryValue } from "../lib/query";
import { capturePreviewScreenshot } from "../lib/screenshot";

const DEFAULT_DOCS_BASE_URL = "https://ui.bejamas.com";
const PREVIEW_SELECTOR = ".sl-bejamas-component-preview";

function resolveTargetUrl(rawUrl: string, docsBaseUrl: URL): URL | null {
  const trimmed = rawUrl.trim();

  try {
    return new URL(trimmed, docsBaseUrl);
  } catch {
    return null;
  }
}

function isAllowedTargetUrl(targetUrl: URL, docsBaseUrl: URL): boolean {
  return (
    targetUrl.origin === docsBaseUrl.origin &&
    (targetUrl.protocol === "https:" || targetUrl.protocol === "http:")
  );
}

export async function handleScreenshot(
  request: Request,
  env: Env,
): Promise<Response> {
  const requestUrl = new URL(request.url);
  const resolvedUrl = decodeQueryValue(requestUrl.searchParams.get("url"));

  if (!resolvedUrl) {
    return new Response("Missing `url` query param", { status: 400 });
  }

  const docsBaseUrl = new URL(env.DOCS_BASE_URL ?? DEFAULT_DOCS_BASE_URL);
  const targetUrl = resolveTargetUrl(resolvedUrl, docsBaseUrl);

  if (!targetUrl || !isAllowedTargetUrl(targetUrl, docsBaseUrl)) {
    return new Response("URL must use the configured docs origin.", {
      status: 400,
    });
  }

  targetUrl.searchParams.set("og", "1");

  let browser: Browser | undefined;

  try {
    // Browser Run and Puppeteer expose the same runtime fetch contract. Bun's
    // ambient fetch type adds a non-standard `preconnect` property, so adapt the
    // binding here instead of weakening the generated Cloudflare environment.
    const browserWorker = {
      fetch: env.BROWSER.fetch.bind(env.BROWSER) as typeof fetch,
    };
    browser = await puppeteer.launch(browserWorker);
    const page = await browser.newPage();
    await page.setViewport({
      width: 1200,
      height: 630,
      deviceScaleFactor: 2,
    });

    await page.goto(targetUrl.toString(), {
      waitUntil: "networkidle2",
      timeout: 15_000,
    });

    const preview = await page.waitForSelector(PREVIEW_SELECTOR, {
      timeout: 5_000,
    });

    if (!preview) {
      return new Response(
        `Element ${PREVIEW_SELECTOR} not found on ${targetUrl.toString()}`,
        { status: 404 },
      );
    }

    const screenshot = await capturePreviewScreenshot(page, preview);
    const headers = buildCacheHeaders(
      decodeQueryValue(requestUrl.searchParams.get("buildTime")),
      requestUrl.searchParams.has("fresh"),
    );

    return new Response(screenshot, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "image/png",
        "Content-Disposition": 'inline; filename="og-image.png"',
      },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "OG screenshot failed",
        error: error instanceof Error ? error.message : String(error),
        target: targetUrl.toString(),
      }),
    );

    return new Response("An error occurred while generating the screenshot.", {
      status: 500,
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error(
          JSON.stringify({
            message: "Failed to close Browser Run session",
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }
  }
}
