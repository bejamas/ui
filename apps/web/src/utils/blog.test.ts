import { describe, expect, test } from "bun:test";

import {
  filterVisibleBlogEntries,
  getAuthorInitials,
  hasDistinctUpdatedDate,
  shouldIncludeDraftBlogEntries,
  shouldNoindexBlogPage,
  sortBlogEntries,
} from "./blog";

describe("blog utils", () => {
  test("sorts posts newest first", () => {
    const older = {
      id: "older",
      data: { publishDate: new Date("2026-03-29T09:00:00Z"), draft: false },
    };
    const newer = {
      id: "newer",
      data: { publishDate: new Date("2026-03-30T09:00:00Z"), draft: false },
    };

    expect(sortBlogEntries([older, newer]).map((entry) => entry.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  test("filters draft posts unless drafts are explicitly included", () => {
    const published = {
      id: "published",
      data: { publishDate: new Date("2026-03-29T09:00:00Z"), draft: false },
    };
    const draft = {
      id: "draft",
      data: { publishDate: new Date("2026-03-30T09:00:00Z"), draft: true },
    };

    expect(filterVisibleBlogEntries([published, draft]).map((entry) => entry.id)).toEqual([
      "published",
    ]);
    expect(
      filterVisibleBlogEntries([published, draft], { includeDrafts: true }).map(
        (entry) => entry.id,
      ),
    ).toEqual(["published", "draft"]);
  });

  test("includes draft posts in dev and preview builds", () => {
    expect(shouldIncludeDraftBlogEntries()).toBe(false);
    expect(shouldIncludeDraftBlogEntries({ isDev: true })).toBe(true);
    expect(
      shouldIncludeDraftBlogEntries({ env: { VERCEL_ENV: "preview" } }),
    ).toBe(true);
    expect(
      shouldIncludeDraftBlogEntries({ env: { VERCEL_TARGET_ENV: "preview" } }),
    ).toBe(true);
  });

  test("marks preview blog pages as noindex", () => {
    expect(shouldNoindexBlogPage("/blog", { VERCEL_ENV: "preview" })).toBe(
      true,
    );
    expect(
      shouldNoindexBlogPage("/blog/introducing-data-slot", {
        VERCEL_ENV: "preview",
      }),
    ).toBe(true);
    expect(
      shouldNoindexBlogPage("/docs/introduction", { VERCEL_ENV: "preview" }),
    ).toBe(false);
    expect(shouldNoindexBlogPage("/blog", { VERCEL_ENV: "production" })).toBe(
      false,
    );
  });

  test("builds initials from the first two name parts", () => {
    expect(getAuthorInitials("Mojtaba Seyedi")).toBe("MS");
    expect(getAuthorInitials("Ada Lovelace Byron")).toBe("AL");
  });

  test("only reports updated dates when they differ from the publish date", () => {
    const publishDate = new Date("2026-03-30T00:00:00Z");

    expect(hasDistinctUpdatedDate(publishDate, publishDate)).toBe(false);
    expect(
      hasDistinctUpdatedDate(publishDate, new Date("2026-03-31T00:00:00Z")),
    ).toBe(true);
  });
});
