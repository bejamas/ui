import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const customizerFile = path.resolve(
  import.meta.dir,
  "./CreateCustomizer.astro",
);
const themeListPanelFile = path.resolve(
  import.meta.dir,
  "./CreateThemeListPanel.astro",
);
const palettePanelFile = path.resolve(
  import.meta.dir,
  "./CreatePalettePanel.astro",
);
const createSidebarControllerFile = path.resolve(
  import.meta.dir,
  "../../stimulus/controllers/create_sidebar_controller.ts",
);
const createPickerControllerFile = path.resolve(
  import.meta.dir,
  "../../stimulus/controllers/create_picker_controller.ts",
);
const createEditorControllerFile = path.resolve(
  import.meta.dir,
  "../../stimulus/controllers/create_editor_controller.ts",
);
const createPageFile = path.resolve(
  import.meta.dir,
  "../../pages/create.astro",
);

describe("create theme panel transitions", () => {
  test("renders transition state hooks for the main form and theme panels", () => {
    const customizerSource = fs.readFileSync(customizerFile, "utf8");
    const themeListSource = fs.readFileSync(themeListPanelFile, "utf8");
    const paletteSource = fs.readFileSync(palettePanelFile, "utf8");

    expect(customizerSource).toContain("data-create-form-main");
    expect(customizerSource).toContain('data-panel-state="active"');
    expect(customizerSource).toContain("create-panel-transition");

    expect(themeListSource).toContain("data-create-theme-list-panel");
    expect(themeListSource).toContain('data-panel-state="inactive"');
    expect(themeListSource).toContain("<section\n  hidden\n");
    expect(themeListSource).toContain("create-panel-transition");

    expect(paletteSource).toContain("data-create-palette-panel");
    expect(paletteSource).toContain('data-panel-state="inactive"');
    expect(paletteSource).toContain("<section\n  hidden\n");
    expect(paletteSource).toContain("create-panel-transition");
    expect(themeListSource).toContain('type="button"');
    expect(paletteSource).toContain('type="button"');
  });

  test("uses a staged Stimulus transition with reduced-motion fallback", () => {
    const source = fs.readFileSync(createSidebarControllerFile, "utf8");
    const pickerSource = fs.readFileSync(createPickerControllerFile, "utf8");

    expect(source).toContain("prefers-reduced-motion: reduce");
    expect(source).toContain("transitionToken");
    expect(source).toContain("waitForPanelTransition");
    expect(source).toContain(
      'currentElement.dataset.panelState = "exiting"',
    );
    expect(source).toContain(
      'targetElement.dataset.panelState = "entering"',
    );
    expect(source).toContain("getFocusTargetForPanel(target)?.focus()");
    expect(source).toContain('static outlets = ["create-picker"]');
    expect(source).toContain("picker.render(state)");
    expect(source).not.toContain("syncPickerUi");
    expect(pickerSource).toContain("syncRadiusDefaultItem");
    expect(pickerSource).toContain("syncFontHeadingInheritItem");
    expect(pickerSource).toContain('this.dispatch("change"');
    expect(pickerSource).toContain('new CustomEvent("dropdown-menu:set"');
    expect(pickerSource).not.toContain("data-selected");
  });

  test("syncs sidebar theme mode through the shared global theme change path", () => {
    const pageSource = fs.readFileSync(createPageFile, "utf8");
    const controllerSource = fs.readFileSync(createEditorControllerFile, "utf8");

    expect(pageSource).toContain(
      "create-picker:change->create-editor#handlePickerChange",
    );
    expect(pageSource).toContain(
      "theme-toggle-changed@window->create-editor#handleThemeToggle",
    );
    expect(controllerSource).toContain("this.activeThemeMode = this.resolveCurrentThemeMode()");
    expect(controllerSource).toContain(
      "this.createSidebarOutlet.themeModeValue = this.activeThemeMode;",
    );
  });

  test("tracks shuffle count from the shared randomize handler", () => {
    const source = fs.readFileSync(createEditorControllerFile, "utf8");

    expect(source).toContain(
      'import { incrementShuffleCountRequest } from "@/utils/shuffles";',
    );
    expect(source).toContain("void incrementShuffleCountRequest();");
  });
});
