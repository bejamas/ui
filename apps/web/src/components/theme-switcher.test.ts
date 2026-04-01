import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const sourceFile = path.resolve(import.meta.dir, "./ThemeSwitcher.astro");

describe("theme switcher", () => {
  test("preloads the stored theme choice into the tabs root before runtime boot", () => {
    const source = fs.readFileSync(sourceFile, "utf8");
    const preloadIndex = source.indexOf("tabsRoot.dataset.defaultValue = themeChoice;");
    const hiddenThemeEditorIndex = source.indexOf("<ThemeEditorGlobal />");

    expect(source).toContain("<script is:inline>");
    expect(source).toContain('data-theme-switcher-root');
    expect(source).toContain("data-theme-choice-tabs");
    expect(source).toContain("data-theme-tabs-preloaded");
    expect(source).toContain(
      "document.documentElement.dataset.themeChoice",
    );
    expect(source).not.toContain('localStorage.getItem("starlight-theme")');
    expect(source).toContain(
      `root.querySelector(
      'starlight-theme-select [data-slot="tabs"]',
    );`,
    );
    expect(source).toContain("tabsRoot.dataset.defaultValue = themeChoice;");
    expect(source).toContain("tabsRoot.dataset.value = themeChoice;");
    expect(source).toContain('tabsRoot.dataset.themeChoiceIndex = themeChoiceIndex;');
    expect(source).toContain("syncThemeChoiceControls(");
    expect(source).toContain("setThemeChoice(nextTheme);");
    expect(preloadIndex).toBeGreaterThan(-1);
    expect(hiddenThemeEditorIndex).toBeGreaterThan(-1);
    expect(preloadIndex).toBeLessThan(hiddenThemeEditorIndex);
  });

  test("disables the initial indicator transition only for the preloaded render", () => {
    const source = fs.readFileSync(sourceFile, "utf8");

    expect(source).toContain(
      'if (this.tabsEl?.hasAttribute("data-theme-tabs-preloaded")) {',
    );
    expect(source).toContain(
      'this.tabsEl?.removeAttribute("data-theme-tabs-preloaded");',
    );
    expect(source).toContain(
      '.theme-tabs[data-theme-tabs-preloaded] [data-slot="tabs-indicator"]',
    );
    expect(source).toContain(
      '.theme-tabs[data-theme-tabs-preloaded] [data-slot="tabs-trigger"]',
    );
    expect(source).toContain(
      '.theme-tabs[data-theme-tabs-preloaded][data-value="light"]',
    );
    expect(source).toContain(
      '.theme-tabs[data-theme-tabs-preloaded][data-theme-choice-index="1"]',
    );
    expect(source).toContain(
      '.theme-tabs[data-theme-tabs-preloaded][data-theme-choice-index="2"]',
    );
    expect(source).toContain("transition: none;");
  });
});
