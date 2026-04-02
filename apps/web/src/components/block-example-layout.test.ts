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

  test("syncs preset images from built-in create presets instead of the old gradient query flow", () => {
    const source = fs.readFileSync(layoutFile, "utf8");

    expect(source).toContain("resolveGradientThemeFromPresetId");
    expect(source).toContain("PRESET_CHANGE_EVENT");
    expect(source).toContain("PRESET_STORAGE_KEY");
    expect(source).toContain("syncGradientImages({ theme });");
    expect(source).not.toContain("getCurrentMode");
    expect(source).not.toContain("theme-toggle-changed");
  });
});
