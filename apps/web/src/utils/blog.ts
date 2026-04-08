import type { CollectionEntry } from "astro:content";

export type BlogEntry = CollectionEntry<"blog">;
export type BlogAuthor = BlogEntry["data"]["authors"][number];
type BlogEnvironment = Record<string, string | undefined>;

interface BlogVisibilityOptions {
  includeDrafts?: boolean;
}

interface DraftEnvironmentOptions {
  isDev?: boolean;
  env?: BlogEnvironment;
}

export function getBlogHref(slug: string) {
  return `/blog/${slug}`;
}

export function isVercelPreviewEnvironment(env: BlogEnvironment = process.env) {
  return env.VERCEL_ENV === "preview" || env.VERCEL_TARGET_ENV === "preview";
}

export function shouldIncludeDraftBlogEntries(
  options: DraftEnvironmentOptions = {},
) {
  const { isDev = false, env = process.env } = options;
  return isDev || isVercelPreviewEnvironment(env);
}

export function isBlogPathname(pathname: string) {
  const normalizedPathname =
    pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";

  return (
    normalizedPathname === "/blog" || normalizedPathname.startsWith("/blog/")
  );
}

export function shouldNoindexBlogPage(
  pathname: string,
  env: BlogEnvironment = process.env,
) {
  return isVercelPreviewEnvironment(env) && isBlogPathname(pathname);
}

export function filterVisibleBlogEntries<T extends { data: { draft?: boolean } }>(
  entries: readonly T[],
  options: BlogVisibilityOptions = {},
) {
  if (options.includeDrafts) {
    return [...entries];
  }

  return entries.filter((entry) => !entry.data.draft);
}

export function sortBlogEntries<T extends { data: { publishDate: Date } }>(
  entries: readonly T[],
) {
  return [...entries].sort(
    (a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime(),
  );
}

export function getAuthorInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function hasDistinctUpdatedDate(
  publishDate: Date,
  updatedDate?: Date,
) {
  return Boolean(
    updatedDate && updatedDate.getTime() !== publishDate.getTime(),
  );
}
