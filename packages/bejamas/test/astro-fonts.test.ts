import { describe, expect, test } from "bun:test";
import {
  mergeManagedAstroFonts,
  parseManagedAstroFonts,
  patchAstroConfigSource,
  patchAstroLayoutSource,
  patchStarlightHeadSource,
  toManagedAstroFont,
} from "../src/utils/astro-fonts";

const sansFont = {
  name: "Geist",
  provider: "fontsource" as const,
  cssVariable: "--font-sans",
  subsets: ["latin"] as [string, ...string[]],
};

const monoFont = {
  name: "Geist Mono",
  provider: "fontsource" as const,
  cssVariable: "--font-mono",
  subsets: ["latin"] as [string, ...string[]],
};

const interFont = {
  name: "Inter",
  provider: "google" as const,
  cssVariable: "--font-sans",
  subsets: ["latin"] as [string, ...string[]],
};

const headingFont = {
  name: "Playfair Display",
  provider: "google" as const,
  cssVariable: "--font-heading",
  subsets: ["latin"] as [string, ...string[]],
};

describe("astro font helpers", () => {
  test("patchAstroConfigSource bootstraps Astro fonts config", () => {
    const source = `// @ts-check\nimport { defineConfig } from 'astro/config';\n\nexport default defineConfig({\n  vite: {}\n});\n`;
    const result = patchAstroConfigSource(source, [sansFont]);

    expect(result).toContain(
      'import { defineConfig, fontProviders } from "astro/config";',
    );
    expect(result).toContain("// bejamas:astro-fonts:start");
    expect(result).toContain('name: "Geist"');
    expect(result).toContain("provider: fontProviders.fontsource()");
    expect(result).toContain('cssVariable: "--font-sans"');
    expect(result).toContain("fonts: BEJAMAS_ASTRO_FONTS");
    expect(result).toContain(
      '/** @type {NonNullable<import("astro/config").AstroUserConfig["fonts"]>} */',
    );
    expect(result).not.toContain("experimental: { fonts: BEJAMAS_ASTRO_FONTS }");
  });

  test("patchAstroConfigSource preserves other slots and replaces the active slot", () => {
    const source = patchAstroConfigSource(
      `// @ts-check\nimport { defineConfig } from 'astro/config';\n\nexport default defineConfig({\n  vite: {}\n});\n`,
      [sansFont, monoFont],
    );
    const merged = mergeManagedAstroFonts(
      parseManagedAstroFonts(source),
      interFont,
    );
    const result = patchAstroConfigSource(source, merged);
    const parsed = parseManagedAstroFonts(result);

    expect(parsed).toEqual([
      {
        name: "Geist Mono",
        provider: "fontsource",
        cssVariable: "--font-mono",
        subsets: ["latin"],
      },
      {
        name: "Inter",
        provider: "google",
        cssVariable: "--font-sans",
        subsets: ["latin"],
      },
    ]);
    expect(result.match(/fonts: BEJAMAS_ASTRO_FONTS/g)?.length).toBe(1);
    expect(result).not.toContain("experimental: { fonts: BEJAMAS_ASTRO_FONTS }");
  });

  test("patchAstroConfigSource migrates legacy experimental fonts config", () => {
    const source = `// @ts-check\nimport { defineConfig, fontProviders } from "astro/config";\n\n// bejamas:astro-fonts:start\nconst BEJAMAS_ASTRO_FONTS = [\n  {\n    provider: fontProviders.google(),\n    name: "Geist",\n    cssVariable: "--font-sans",\n    subsets: ["latin"],\n  },\n];\n// bejamas:astro-fonts:end\n\nexport default defineConfig({\n  experimental: { fonts: BEJAMAS_ASTRO_FONTS },\n  vite: {},\n});\n`;
    const result = patchAstroConfigSource(source, [interFont]);

    expect(result).toContain("fonts: BEJAMAS_ASTRO_FONTS");
    expect(result).not.toContain("experimental: { fonts: BEJAMAS_ASTRO_FONTS }");
    expect(result).toContain('name: "Inter"');
    expect(result).toContain("provider: fontProviders.google()");
  });

  test("patchAstroConfigSource preserves unrelated experimental flags", () => {
    const source = `// @ts-check\nimport { defineConfig, fontProviders } from "astro/config";\n\n// bejamas:astro-fonts:start\nconst BEJAMAS_ASTRO_FONTS = [\n  {\n    provider: fontProviders.google(),\n    name: "Geist",\n    cssVariable: "--font-sans",\n    subsets: ["latin"],\n  },\n];\n// bejamas:astro-fonts:end\n\nexport default defineConfig({\n  experimental: {\n    fonts: BEJAMAS_ASTRO_FONTS,\n    contentIntellisense: true,\n  },\n  vite: {},\n});\n`;
    const result = patchAstroConfigSource(source, [sansFont]);

    expect(result).toContain("fonts: BEJAMAS_ASTRO_FONTS");
    expect(result).toContain("contentIntellisense: true");
    expect(result).not.toContain("experimental: { fonts: BEJAMAS_ASTRO_FONTS }");
  });

  test("patchAstroLayoutSource injects Font tags and applies a mono body class when mono is active", () => {
    const source = `---\nimport "@/styles/globals.css";\n---\n\n<html><head></head><body /></html>\n`;
    const result = patchAstroLayoutSource(
      source,
      [sansFont, monoFont],
      "--font-mono",
    );

    expect(result).toContain('import { Font } from "astro:assets";');
    expect(result).toContain('<Font cssVariable="--font-sans" />');
    expect(result).toContain('<Font cssVariable="--font-mono" />');
    expect(result).toMatch(/<body\b[^>]*class="font-mono"[^>]*\/>/);
  });

  test("patchAstroLayoutSource injects a separate heading font without changing the body class", () => {
    const source = `---\nimport "@/styles/globals.css";\n---\n\n<html><head></head><body class="min-h-screen"></body></html>\n`;
    const result = patchAstroLayoutSource(
      source,
      [interFont, headingFont],
      "--font-sans",
    );

    expect(result).toContain('<Font cssVariable="--font-sans" />');
    expect(result).toContain('<Font cssVariable="--font-heading" />');
    expect(result).toContain('<body class="min-h-screen"></body>');
  });

  test("patchAstroLayoutSource preserves existing body classes and removes managed mono classes for sans", () => {
    const source = `---\nimport "@/styles/globals.css";\n---\n\n<html><head></head><body class="min-h-screen font-mono" data-test="true"></body></html>\n`;
    const result = patchAstroLayoutSource(source, [sansFont], "--font-sans");

    expect(result).toContain('<body data-test="true" class="min-h-screen"></body>');
  });

  test("patchStarlightHeadSource injects Font tags after the default Starlight head", () => {
    const source = `---\nimport DefaultHead from "@astrojs/starlight/components/Head.astro";\n---\n\n<DefaultHead />\n`;
    const result = patchStarlightHeadSource(source, [sansFont]);

    expect(result).toContain('import { Font } from "astro:assets";');
    expect(result).toContain("<DefaultHead />");
    expect(result).toContain('<Font cssVariable="--font-sans" />');
  });

  test("patchAstroConfigSource can wire the Starlight Head override", () => {
    const source = `// @ts-check\nimport { defineConfig } from "astro/config";\nimport starlight from "@astrojs/starlight";\n\nexport default defineConfig({\n  integrations: [\n    starlight({\n      title: "Docs"\n    }),\n  ],\n});\n`;
    const result = patchAstroConfigSource(source, [sansFont], {
      starlightHeadOverride: true,
    });

    expect(result).toContain('Head: "./src/components/Head.astro"');
  });

  test("toManagedAstroFont maps Geist families to the Astro Fontsource provider", () => {
    expect(toManagedAstroFont("geist")).toMatchObject({
      name: "Geist",
      provider: "fontsource",
      cssVariable: "--font-sans",
    });
    expect(toManagedAstroFont("geist-mono")).toMatchObject({
      name: "Geist Mono",
      provider: "fontsource",
      cssVariable: "--font-mono",
    });
    expect(toManagedAstroFont("inter")).toMatchObject({
      name: "Inter",
      provider: "google",
      cssVariable: "--font-sans",
    });
    expect(toManagedAstroFont("font-heading-playfair-display")).toMatchObject({
      name: "Playfair Display",
      provider: "google",
      cssVariable: "--font-heading",
    });
  });
});
