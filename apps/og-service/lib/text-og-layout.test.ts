import { describe, expect, test } from "bun:test";
import { resolveTextOgLayout } from "./text-og-layout";

describe("text OG layout", () => {
  test("fits the current long blog title without rendering a description", () => {
    const layout = resolveTextOgLayout({
      title:
        "How we handle interactive components in Astro without reaching for React",
      description:
        "data-slot is a set of headless JavaScript packages that attach interactive behavior to HTML marked with data-slot attributes.",
      showTwitterFooter: false,
      hideDescription: true,
    });

    expect(layout.renderDescription).toBe(false);
    expect(layout.titleFontSize).toBe(80);
    expect(layout.titleLineClamp).toBeUndefined();
  });

  test("keeps short non-blog text OG images on the large title and description preset", () => {
    const layout = resolveTextOgLayout({
      title: "bejamas/ui",
      description: "Modern component blueprints for Astro.",
      showTwitterFooter: false,
      hideDescription: false,
    });

    expect(layout.renderDescription).toBe(true);
    expect(layout.maxWidth).toBe(760);
    expect(layout.titleFontSize).toBe(80);
    expect(layout.descriptionFontSize).toBe(40);
    expect(layout.descriptionLineClamp).toBe(3);
  });

  test("falls back to title clamping instead of clipping an extreme title", () => {
    const layout = resolveTextOgLayout({
      title: Array.from({ length: 40 }, () => "extraordinary").join(" "),
      description: "A short description.",
      showTwitterFooter: false,
      hideDescription: false,
    });

    expect(layout.renderDescription).toBe(true);
    expect(layout.titleFontSize).toBe(50);
    expect(layout.descriptionLineClamp).toBe(1);
    expect(layout.titleLineClamp).toBeGreaterThan(0);
  });
});
