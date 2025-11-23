import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

export const onRequest = defineRouteMiddleware((context) => {
  // Only add the dynamic og image for components pages.
  if (!context.url.pathname.startsWith("/components/")) {
    return;
  }

  // We use the build time to invalidate the cache of the og image.
  const buildTime = new Date().getTime();
  const { entry, siteTitle } = context.locals.starlightRoute;

  const params = new URLSearchParams({
    url: String(context.url),
    title: entry.data.title,
    siteTitle,
    buildTime: String(buildTime),
  });

  const ogImageUrl = new URL(
    `/api/og?${params.toString()}`,
    "https://og.ui.bejamas.com",
  );

  // Get the array of all tags to include in the `<head>` of the current page.
  const { head } = context.locals.starlightRoute;

  // Add the `<meta/>` tags for the Open Graph images.
  head.push({
    tag: "meta",
    attrs: { property: "og:image", content: ogImageUrl.href },
  });
  head.push({
    tag: "meta",
    attrs: { name: "twitter:image", content: `${ogImageUrl.href}?x=1` },
  });
});
