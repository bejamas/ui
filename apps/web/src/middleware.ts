import { defineMiddleware } from "astro:middleware";
import { rewriteLegacyStyleRegistryUrl } from "./utils/style-registry-aliases";

export const onRequest = defineMiddleware((context, next) => {
  const rewrittenUrl = rewriteLegacyStyleRegistryUrl(context.url);

  if (rewrittenUrl) {
    return next(rewrittenUrl);
  }

  return next();
});
