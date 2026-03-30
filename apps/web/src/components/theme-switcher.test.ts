import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const sourceFile = path.resolve(import.meta.dir, "./ThemeSwitcher.astro");

describe("theme switcher", () => {
  test("preloads the stored theme choice into the tabs root before runtime boot", () => {
    const source = fs.readFileSync(sourceFile, "utf8");

    expect(source).toContain("<script is:inline>");
    expect(source).toContain(
      "document.documentElement.dataset.themeChoice",
    );
    expect(source).toContain('localStorage.getItem("starlight-theme")');
    expect(source).toContain("tabsRoot.dataset.defaultValue = themeChoice;");
    expect(source).toContain("tabsRoot.dataset.value = themeChoice;");
    expect(source).toContain(
      'tabsRoot.setAttribute("data-theme-tabs-preloaded", "");',
    );
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
    expect(source).toContain("transition: none;");
  });
});
