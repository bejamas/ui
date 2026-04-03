import type { CollectionEntry } from "astro:content";

export type BlogEntry = CollectionEntry<"blog">;
export type BlogAuthor = BlogEntry["data"]["authors"][number];

export function getBlogHref(slug: string) {
  return `/blog/${slug}`;
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
