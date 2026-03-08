import { describe, expect, it } from "bun:test";
import { getFontPackageName, catalogs } from "@bejamas/create-config/browser";
import fs from "node:fs";
import path from "node:path";

const stylesheetPath = path.resolve(import.meta.dir, "theme-fonts.css");
const packageJsonPath = path.resolve(import.meta.dir, "../../package.json");
const astroConfigPath = path.resolve(import.meta.dir, "../../astro.config.mjs");

describe("theme font preload stylesheet", () => {
  it("imports every font from the create catalog", () => {
    const css = fs.readFileSync(stylesheetPath, "utf8");

    for (const font of catalogs.fonts) {
      const packageName = getFontPackageName(
        font.name.replace("font-", "") as Parameters<typeof getFontPackageName>[0],
      );
      expect(css).toContain(`@import "${packageName}/index.css";`);
    }
  });

  it("keeps the imported font packages installed in apps/web", () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
    };

    for (const font of catalogs.fonts) {
      const packageName = getFontPackageName(
        font.name.replace("font-", "") as Parameters<typeof getFontPackageName>[0],
      );
      expect(typeof pkg.dependencies?.[packageName]).toBe("string");
    }
  });

  it("is loaded globally by the docs app", () => {
    const astroConfig = fs.readFileSync(astroConfigPath, "utf8");

    expect(astroConfig).toContain('./src/styles/theme-fonts.css');
  });
});
