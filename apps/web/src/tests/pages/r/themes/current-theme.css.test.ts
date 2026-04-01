import { describe, expect, test } from "bun:test";
import type { AstroCookies } from "astro";
import { encodePreset } from "@bejamas/create-config/server";
import { GET } from "../../../../pages/r/themes/current-theme.css";

describe("current-theme.css", () => {
  test("falls back to the default legacy preset without a cookie", async () => {
    const response = await GET({
      cookies: {
        get() {
          return undefined;
        },
      } as unknown as AstroCookies,
    });
    const css = await response.text();

    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    );
    expect(response.headers.get("Vary")).toBe("Cookie");
    expect(css).toContain("--font-sans: Inter");
    expect(css).toContain("--shadow-md:");
    expect(css).toContain("@layer components");
    expect(css).toContain(".cn-card");
    expect(css).not.toContain(".style-juno");
    expect(css).not.toContain("dynamically generated at");
  });

  test("decodes a create preset code from the theme cookie", async () => {
    const preset = encodePreset({
      style: "lyra",
      font: "playfair-display",
      radius: "large",
      baseColor: "olive",
      theme: "orange",
    });
    const response = await GET({
      cookies: {
        get(name: string) {
          if (name !== "theme") {
            return undefined;
          }

          return { value: preset };
        },
      } as unknown as AstroCookies,
    });
    const css = await response.text();

    expect(css).toContain("Playfair Display Variable");
    expect(css).toContain("--radius: 0;");
    expect(css).toContain(
      "@layer base, starlight.reset, starlight, bejamas, theme, components, utilities;",
    );
    expect(css).toContain("@layer components");
    expect(css).toContain(".cn-card");
    expect(css).not.toContain(".style-lyra");
    expect(css).toContain("oklch(");
    expect(css).not.toContain("hsl(");
  });

  test("keeps body and heading font tokens separate for distinct heading presets", async () => {
    const preset = encodePreset({
      style: "juno",
      font: "inter",
      fontHeading: "playfair-display",
      theme: "neutral",
    });
    const response = await GET({
      cookies: {
        get(name: string) {
          if (name !== "theme") {
            return undefined;
          }

          return { value: preset };
        },
      } as unknown as AstroCookies,
    });
    const css = await response.text();

    expect(css).toContain("--font-sans: 'Inter Variable', sans-serif;");
    expect(css).toContain("--font-heading: 'Playfair Display Variable', serif;");
  });

  test("decodes upstream-compatible a-codes from create preset cookies", async () => {
    const response = await GET({
      cookies: {
        get(name: string) {
          if (name !== "theme") {
            return undefined;
          }

          return { value: "abVJxYW" };
        },
      } as unknown as AstroCookies,
    });
    const css = await response.text();

    expect(css).toContain(".cn-card");
    expect(css).toContain("--radius: 0.875rem;");
    expect(css).not.toContain(".style-maia");
  });

  test("uses modern shadcn b-codes with separate body and heading fonts", async () => {
    const response = await GET({
      cookies: {
        get(name: string) {
          if (name !== "theme") {
            return undefined;
          }

          return { value: "b4aRK5K0fb" };
        },
      } as unknown as AstroCookies,
    });
    const css = await response.text();

    expect(css).toContain("--font-sans: 'IBM Plex Sans Variable', sans-serif;");
    expect(css).toContain("--font-heading: 'Merriweather Variable', serif;");
  });

  test("decodes shared luma b-codes from create preset cookies", async () => {
    const preset = encodePreset({
      style: "luma",
      theme: "neutral",
      font: "inter",
    });
    const response = await GET({
      cookies: {
        get(name: string) {
          if (name !== "theme") {
            return undefined;
          }

          return { value: preset };
        },
      } as unknown as AstroCookies,
    });
    const css = await response.text();

    expect(css).toContain("--font-sans: 'Inter Variable', sans-serif;");
    expect(css).toContain("--radius: 0.625rem;");
    expect(css).toContain(".cn-card");
    expect(css).not.toContain("--shadow-color:");
    expect(css).toContain(
      "--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);",
    );
    expect(css).not.toContain(".style-luma");
  });

  test("decodes bejamas-theme luma c-codes from create preset cookies", async () => {
    const preset = encodePreset({
      style: "luma",
      theme: "bejamas-blue",
      font: "inter",
    });
    const response = await GET({
      cookies: {
        get(name: string) {
          if (name !== "theme") {
            return undefined;
          }

          return { value: preset };
        },
      } as unknown as AstroCookies,
    });
    const css = await response.text();

    expect(css).toContain("--font-sans: 'Inter Variable', sans-serif;");
    expect(css).toContain("--radius: 0.625rem;");
    expect(css).toContain(".cn-card");
    expect(css).not.toContain("--shadow-color:");
    expect(css).toContain(
      "--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);",
    );
    expect(css).not.toContain(".style-luma");
  });

  test("uses the style-linked default radius for create presets", async () => {
    const preset = encodePreset({
      style: "lyra",
      radius: "default",
    });
    const response = await GET({
      cookies: {
        get(name: string) {
          if (name !== "theme") {
            return undefined;
          }

          return { value: preset };
        },
      } as unknown as AstroCookies,
    });
    const css = await response.text();

    expect(css).toContain("--radius: 0;");
  });

  test("uses a legacy preset id from the theme cookie when present", async () => {
    const response = await GET({
      cookies: {
        get(name: string) {
          if (name !== "theme") {
            return undefined;
          }

          return { value: "rome" };
        },
      } as unknown as AstroCookies,
    });
    const css = await response.text();

    expect(css).toContain("--radius: 1.5rem;");
    expect(css).toContain("@layer components");
    expect(css).toContain(".cn-card");
    expect(css).not.toContain(".style-juno");
  });
});
