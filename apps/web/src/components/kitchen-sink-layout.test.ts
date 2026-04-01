import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const layoutFile = path.resolve(import.meta.dir, "./KitchenSinkLayout.astro");

describe("kitchen sink layout", () => {
  test("supports create embed mode with client-side preview bootstrap on static pages", () => {
    const source = fs.readFileSync(layoutFile, "utf8");

    expect(source).not.toContain('Astro.url.searchParams.get("embed") === "create"');
    expect(source).toContain("buildThemeChoiceBootstrapInlineScript");
    expect(source).toContain("themeChoiceBootstrapScript");
    expect(source).toContain('id="create-theme-css"');
    expect(source).toContain('id="create-style-css"');
    expect(source).toContain('"__BEJAMAS_CREATE_PREVIEW__"');
    expect(source).toContain('document.documentElement.dataset.createEmbed = "true"');
    expect(source).toContain('body.dataset.controller = [body.dataset.controller, "create-preview"]');
    expect(source).toContain('import("@/stimulus/create")');
    expect(source).toContain("data-theme-choice-tabs");
    expect(source).toContain("data-theme-tabs-preloaded");
    expect(source).toContain("tabsRoot.dataset.themeChoiceIndex = themeChoiceIndex;");
    expect(source).toContain(
      'if (this.tabsEl?.hasAttribute("data-theme-tabs-preloaded")) {',
    );
    expect(source).toContain(
      'this.tabsEl?.removeAttribute("data-theme-tabs-preloaded");',
    );
    expect(source).toContain(
      '.ks-theme-tabs[data-theme-tabs-preloaded] [data-slot="tabs-indicator"]',
    );
    expect(source).not.toContain('const storageKey = "starlight-theme";');
  });
});
