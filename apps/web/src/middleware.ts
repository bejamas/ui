import { defineMiddleware } from "astro:middleware";
import { rewriteLegacyStyleRegistryUrl } from "./utils/style-registry-aliases";

export const onRequest = defineMiddleware(async (context, next) => {
  const rewrittenUrl = rewriteLegacyStyleRegistryUrl(context.url);
  const response = rewrittenUrl ? await next(rewrittenUrl) : await next();

  if (context.url.hostname.endsWith(".workers.dev")) {
    response.headers.set("X-Robots-Tag", "noindex");
  }

  return response;
});
