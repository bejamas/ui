import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

type HeadTag = {
  tag: string;
  attrs?: Record<string, string | boolean | undefined>;
  [key: string]: unknown;
};

const upsertMetaTag = (
  head: HeadTag[],
  attrKey: "property" | "name",
  attrValue: string,
  content: string,
) => {
  const existingTag = head.find(
    (tag) => tag.tag === "meta" && tag.attrs?.[attrKey] === attrValue,
  );

  if (existingTag) {
    existingTag.attrs = {
      ...existingTag.attrs,
      content,
    };
    return;
  }

  head.push({
    tag: "meta",
    attrs: { [attrKey]: attrValue, content },
  });
};

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

  // Ensure we only have a single Open Graph/twitter image meta tag.
  upsertMetaTag(head, "property", "og:image", ogImageUrl.href);
  upsertMetaTag(head, "name", "twitter:image", `${ogImageUrl.href}&x=1`);
});
