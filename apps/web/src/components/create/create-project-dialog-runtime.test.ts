import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const customizerFile = path.resolve(
  import.meta.dir,
  "./CreateCustomizer.astro",
);
const dialogFile = path.resolve(import.meta.dir, "./CreateProjectDialog.astro");
const dialogControllerFile = path.resolve(
  import.meta.dir,
  "../../stimulus/controllers/create_project_dialog_controller.ts",
);
const editorControllerFile = path.resolve(
  import.meta.dir,
  "../../stimulus/controllers/create_editor_controller.ts",
);

describe("create project dialog runtime", () => {
  test("hides rtl controls from the main create sidebar", () => {
    const source = fs.readFileSync(customizerFile, "utf8");

    expect(source).not.toContain("data-create-rtl");
    expect(source).not.toContain("data-create-rtl-language");
    expect(source).not.toContain(">Direction<");
    expect(source).not.toContain(">RTL<");
  });

  test("renders the Create dialog controls and command output hooks", () => {
    const source = fs.readFileSync(dialogFile, "utf8");

    expect(source).toContain("data-create-project-monorepo");
    expect(source).toContain("data-create-project-package-tabs");
    expect(source).toContain("data-create-project-copy-command");
    expect(source).toContain("data-create-project-command={packageManager}");
    expect(source).not.toContain("data-create-project-docs");
    expect(source).not.toContain("data-create-project-rtl");
    expect(source).not.toContain("data-create-project-rtl-language-select");
  });

  test("uses Stimulus targets and shared switch/tabs events for project options", () => {
    const dialogSource = fs.readFileSync(dialogFile, "utf8");
    const controllerSource = fs.readFileSync(dialogControllerFile, "utf8");
    const editorSource = fs.readFileSync(editorControllerFile, "utf8");

    expect(dialogSource).toContain(
      'data-action="switch:change->create-project-dialog#monorepoChanged"',
    );
    expect(dialogSource).toContain(
      'data-action="tabs:change->create-project-dialog#packageManagerChanged"',
    );
    expect(controllerSource).toContain('new CustomEvent("tabs:set"');
    expect(controllerSource).toContain(
      'this.monorepoFieldTarget?.hasAttribute("data-checked")',
    );
    expect(editorSource).toContain(
      "CREATE_PROJECT_PACKAGE_MANAGER_STORAGE_KEY",
    );
  });
});
