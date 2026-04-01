import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const layoutFile = path.resolve(import.meta.dir, "./BlockExampleLayout.astro");

describe("block example layout", () => {
  test("uses the shared theme-choice bootstrap helper instead of local theme bootstrap logic", () => {
    const source = fs.readFileSync(layoutFile, "utf8");

    expect(source).toContain("buildThemeChoiceBootstrapInlineScript");
    expect(source).toContain("themeChoiceBootstrapScript");
    expect(source).not.toContain('const storageKey = "starlight-theme";');
    expect(source).not.toContain("function applyTheme(theme)");
  });
});

