import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

export const onRequest = defineRouteMiddleware((context) => {
  const { entry, siteTitle, head } = context.locals.starlightRoute;
  const pathname = context.url.pathname;

  const baseOgOrigin = "https://og.ui.bejamas.com";
  const entryTitle = entry?.data?.title ?? siteTitle ?? "bejamas/ui";
  const entryDescription =
    entry?.data?.description ?? "Modern component blueprints for Astro.";
  const resolvedSiteTitle = siteTitle ?? "bejamas/ui";

  upsertMetaTag(head, "name", "twitter:title", entryTitle);
  if (entryDescription) {
    upsertMetaTag(head, "name", "twitter:description", entryDescription);
  }

  // Skip homepage (uses static OG image).
  if (pathname === "/") {
    return;
  }

  const ogConfig = resolveOgConfig({
    pathname,
    url: String(context.url),
    entryTitle,
    entryDescription,
    siteTitle: resolvedSiteTitle,
  });

  if (ogConfig) {
    const ogImageUrl = new URL(
      `${ogConfig.path}?${ogConfig.params.toString()}`,
      baseOgOrigin,
    );
    upsertMetaTag(head, "property", "og:image", ogImageUrl.href);
    upsertMetaTag(head, "name", "twitter:image", `${ogImageUrl.href}&x=1`);
  }
});

type OgConfigInput = {
  pathname: string;
  url: string;
  entryTitle: string;
  entryDescription: string;
  siteTitle: string;
};

type OgConfig = {
  path: string;
  params: URLSearchParams;
};

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

const resolveOgConfig = ({
  pathname,
  url,
  entryTitle,
  entryDescription,
  siteTitle,
}: OgConfigInput): OgConfig | null => {
  if (pathname.startsWith("/components/")) {
    return {
      path: "/api/og/components",
      params: buildComponentParams({ url, entryTitle, siteTitle }),
    };
  }

  return {
    path: "/api/og/text",
    params: buildTextParams({ entryTitle, entryDescription }),
  };
};

const buildComponentParams = ({
  url,
  entryTitle,
  siteTitle,
}: {
  url: string;
  entryTitle: string;
  siteTitle: string;
}): URLSearchParams => {
  const params = new URLSearchParams();
  params.set("url", url);
  params.set("title", entryTitle);
  params.set("siteTitle", siteTitle);
  params.set("buildTime", Date.now().toString());
  return params;
};

const buildTextParams = ({
  entryTitle,
  entryDescription,
  siteTitle,
}: {
  entryTitle: string;
  entryDescription: string;
  siteTitle: string;
}): URLSearchParams => {
  const params = new URLSearchParams();
  params.set("title", entryTitle);
  params.set("description", entryDescription);
  params.set("siteTitle", siteTitle);
  return params;
};
