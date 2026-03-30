import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const createPageFile = path.resolve(
  import.meta.dir,
  "../../pages/create.astro",
);
const createEditorControllerFile = path.resolve(
  import.meta.dir,
  "../../stimulus/controllers/create_editor_controller.ts",
);
const createBootstrapFile = path.resolve(
  import.meta.dir,
  "../../utils/create-bootstrap.ts",
);
const createTypesFile = path.resolve(
  import.meta.dir,
  "../../stimulus/types/create.ts",
);

describe("create preset store sync", () => {
  test("listens for global preset-store changes and applies them through the editor controller", () => {
    const pageSource = fs.readFileSync(createPageFile, "utf8");
    const controllerSource = fs.readFileSync(createEditorControllerFile, "utf8");

    expect(pageSource).toContain(
      "bejamas:preset-change@window->create-editor#handlePresetStoreChange",
    );
    expect(controllerSource).toContain(
      "handlePresetStoreChange(event: CustomEvent<PresetStoreChangeDetail>)",
    );
    expect(controllerSource).toContain("this.suppressPresetStoreChange");
    expect(controllerSource).toContain(
      "const presetSelection = this.resolvePresetStoreSelection(event.detail);",
    );
    expect(controllerSource).toContain("this.paletteSnapshot = null;");
    expect(controllerSource).toContain("clearCustomTheme: true");
    expect(controllerSource).toContain('history: "push"');
    expect(controllerSource).toContain(
      "this.shouldIgnorePresetStoreSelection(presetSelection)",
    );
    expect(controllerSource).toContain("decodePreset");
    expect(controllerSource).toContain("designSystemConfigSchema.safeParse");
  });

  test("stores serializable history state so popstate can restore create config, theme state, and preview target", () => {
    const controllerSource = fs.readFileSync(createEditorControllerFile, "utf8");
    const typesSource = fs.readFileSync(createTypesFile, "utf8");
    const bootstrapSource = fs.readFileSync(createBootstrapFile, "utf8");

    expect(typesSource).toContain("export type CreateHistoryState = {");
    expect(typesSource).toContain("themeOverrides: ThemeOverrides;");
    expect(controllerSource).toContain("async handlePopstate(event: PopStateEvent)");
    expect(controllerSource).toContain("this.isCreateHistoryState(event.state)");
    expect(controllerSource).toContain("this.restoreHistoryState(event.state);");
    expect(controllerSource).toContain("private buildHistoryState(");
    expect(controllerSource).toContain("private restoreHistoryState(state: CreateHistoryState)");
    expect(controllerSource).toContain(
      "this.buildHistoryState(config, preset)",
    );
    expect(controllerSource).toContain("previewTarget: this.currentPreviewTarget");
    expect(controllerSource).toContain("forceIframeReload: true");
    expect(controllerSource).toContain("resolveCreateBootstrapState(");
    expect(bootstrapSource).toContain("allowCookieFallback");
    expect(bootstrapSource).toContain("THEME_REF_COOKIE_NAME");
  });
});
