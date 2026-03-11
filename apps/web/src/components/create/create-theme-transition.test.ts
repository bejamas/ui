import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const customizerFile = path.resolve(
  import.meta.dir,
  "./CreateCustomizer.astro",
);
const themePanelFile = path.resolve(
  import.meta.dir,
  "./CreateThemePanel.astro",
);
const createPageFile = path.resolve(
  import.meta.dir,
  "../../scripts/create-page.ts",
);

describe("create theme panel transitions", () => {
  test("renders transition state hooks for the main form and theme panel", () => {
    const customizerSource = fs.readFileSync(customizerFile, "utf8");
    const themePanelSource = fs.readFileSync(themePanelFile, "utf8");

    expect(customizerSource).toContain("data-create-form-main");
    expect(customizerSource).toContain('data-panel-state="active"');
    expect(customizerSource).toContain("transition-[opacity,filter]");

    expect(themePanelSource).toContain("data-create-theme-panel");
    expect(themePanelSource).toContain('data-panel-state="inactive"');
    expect(themePanelSource).toContain("<section\n  hidden\n");
    expect(themePanelSource).toContain("transition-[opacity,filter]");
  });

  test("uses a staged runtime transition with reduced-motion fallback", () => {
    const source = fs.readFileSync(createPageFile, "utf8");

    expect(source).toContain("prefers-reduced-motion: reduce");
    expect(source).toContain("themePanelTransitionToken");
    expect(source).toContain("waitForThemePanelTransition");
    expect(source).toContain(
      'setThemePanelElementState(themeMainPanel, "exiting", false)',
    );
    expect(source).toContain(
      'setThemePanelElementState(themeEditorPanel, "entering", false)',
    );
    expect(source).toContain("themeBackButton?.focus()");
    expect(source).toContain("themeTrigger?.focus()");
  });

  test("syncs theme panel tabs through the shared global theme mode path", () => {
    const source = fs.readFileSync(createPageFile, "utf8");

    expect(source).toContain("setGlobalThemeChoice(nextMode");
    expect(source).toContain('window.addEventListener("theme-toggle-changed"');
    expect(source).toContain("syncActiveThemeMode()");
    expect(source).not.toContain(
      'activeThemeMode = (button.dataset.value as ThemeMode) ?? "light";',
    );
  });

  test("tracks shuffle count from the shared randomize handler", () => {
    const source = fs.readFileSync(createPageFile, "utf8");

    expect(source).toContain(
      'import { incrementShuffleCountRequest } from "@/utils/shuffles";',
    );
    expect(source).toContain("void incrementShuffleCountRequest();");
  });
});
