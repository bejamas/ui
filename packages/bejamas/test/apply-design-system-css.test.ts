import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DesignSystemConfig } from "@bejamas/create-config/server";
import { transformDesignSystemCss } from "../src/utils/apply-design-system";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const astroGlobalsCss = readFileSync(
  path.resolve(repoRoot, "templates/astro/src/styles/globals.css"),
  "utf8",
);

const lyraMonoConfig: DesignSystemConfig = {
  style: "lyra",
  baseColor: "zinc",
  theme: "cyan",
  iconLibrary: "tabler",
  font: "geist-mono",
  radius: "default",
  menuColor: "default",
  menuAccent: "subtle",
  template: "astro",
  rtl: false,
  rtlLanguage: "ar",
};

describe("transformDesignSystemCss", () => {
  test("updates template CSS in place without embedding the component layer", () => {
    const result = transformDesignSystemCss(astroGlobalsCss, lyraMonoConfig);

    expect(result).toContain('@import "shadcn/tailwind.css";');
    expect(result).toContain('@import "@fontsource-variable/geist-mono";');
    expect(result).toContain("--font-mono: 'Geist Mono Variable', monospace;");
    expect(result).toContain("@apply font-mono;");
    expect(result).toContain("--primary: oklch(0.52 0.105 223.128);");
    expect(result).not.toContain("/* bejamas:create:start */");
    expect(result).not.toContain(".cn-button");
    expect(result).not.toContain(".cn-card");
  });

  test("allows init theme overrides to replace token values", () => {
    const result = transformDesignSystemCss(astroGlobalsCss, lyraMonoConfig, {
      theme: {},
      light: {
        primary: "oklch(0.31 0.07 240)",
      },
      dark: {
        primary: "oklch(0.81 0.08 240)",
      },
    });

    expect(result).toContain("--primary: oklch(0.31 0.07 240);");
    expect(result).toContain(".dark {\n  --primary: oklch(0.81 0.08 240);");
  });

  test("is idempotent when reapplied to already-patched CSS", () => {
    const once = transformDesignSystemCss(astroGlobalsCss, lyraMonoConfig);
    const twice = transformDesignSystemCss(once, lyraMonoConfig);

    expect(twice).toBe(once);
    expect(twice.match(/@import "shadcn\/tailwind\.css";/g)?.length).toBe(1);
    expect(
      twice.match(/@import "@fontsource-variable\/geist-mono";/g)?.length,
    ).toBe(1);
    expect(twice.match(/^:root \{/gm)?.length).toBe(1);
    expect(twice.match(/^\.dark \{/gm)?.length).toBe(1);
  });
});
