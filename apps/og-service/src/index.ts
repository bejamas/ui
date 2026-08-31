import { handleComponentsOg } from "../api/og/components";
import { handleTextOg } from "../api/og/text";
import { handleScreenshot } from "../api/screenshot";

type RouteHandler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
) => Promise<Response>;

const routes = new Map<string, RouteHandler>([
  ["/api/og/components", handleComponentsOg],
  ["/api/og/text", (request, _env, ctx) => handleTextOg(request, ctx)],
  ["/api/screenshot", handleScreenshot],
]);

function logError(message: string, error: unknown, request: Request): void {
  console.error(
    JSON.stringify({
      message,
      error: error instanceof Error ? error.message : String(error),
      path: new URL(request.url).pathname,
    }),
  );
}

async function cacheImageResponse(
  request: Request,
  ctx: ExecutionContext,
  handler: () => Promise<Response>,
): Promise<Response> {
  const isFreshRequest = new URL(request.url).searchParams.has("fresh");

  if (!isFreshRequest) {
    const cachedResponse = await caches.default.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  const response = await handler();
  const isImage = response.headers.get("Content-Type")?.startsWith("image/");

  if (!isFreshRequest && response.ok && isImage) {
    ctx.waitUntil(
      caches.default.put(request, response.clone()).catch((error) => {
        logError("Failed to cache OG response", error, request);
      }),
    );
  }

  return response;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return Response.redirect("https://ui.bejamas.com", 308);
    }

    if (request.method !== "GET") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET" },
      });
    }

    const handler = routes.get(url.pathname);
    if (!handler) {
      return new Response("Not Found", { status: 404 });
    }

    try {
      return await cacheImageResponse(request, ctx, () =>
        handler(request, env, ctx),
      );
    } catch (error) {
      logError("Unhandled OG Worker error", error, request);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
