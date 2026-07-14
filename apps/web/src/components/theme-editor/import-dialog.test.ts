import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(
  path.resolve(
    process.cwd(),
    "apps/web/src/components/theme-editor/ImportDialog.astro",
  ),
  "utf8",
);
const createThemeListSource = readFileSync(
  path.resolve(
    process.cwd(),
    "apps/web/src/components/create/CreateThemeListPanel.astro",
  ),
  "utf8",
);
const createSidebarControllerSource = readFileSync(
  path.resolve(
    process.cwd(),
    "apps/web/src/stimulus/controllers/create_sidebar_controller.ts",
  ),
  "utf8",
);

describe("ImportDialog", () => {
  test("renders non-submitting action buttons", () => {
    expect(source).toContain(
      '<Button type="button" variant="outline" data-slot="dialog-close">',
    );
    expect(source).toContain('type="button"\n        id={confirmButtonId}');
  });

  test("scopes create controls and binds them outside the sidebar portal", () => {
    expect(createThemeListSource).toContain('<ImportDialog scope="create" />');
    expect(source).toContain("data-create-theme-import-dialog=");
    expect(source).toContain("data-create-theme-import-textarea=");
    expect(source).toContain("data-create-theme-import-confirm=");
    expect(source).toContain(
      "dialog:change->create-sidebar#themeImportDialogChanged",
    );
    expect(createSidebarControllerSource).toContain(
      'document.querySelector<HTMLButtonElement>(\n      "[data-create-theme-import-confirm]"',
    );
    expect(createSidebarControllerSource).toContain(
      'document.querySelector<HTMLTextAreaElement>(\n      "[data-create-theme-import-textarea]"',
    );
    expect(createSidebarControllerSource).toContain(
      'confirmButton.addEventListener("click", this.boundImportConfirm)',
    );
    expect(createSidebarControllerSource).toContain(
      'new CustomEvent("dialog:set"',
    );
  });
});
