import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const customizerFile = path.resolve(
  import.meta.dir,
  "./CreateCustomizer.astro",
);
const dialogFile = path.resolve(import.meta.dir, "./CreateProjectDialog.astro");
const createPageFile = path.resolve(
  import.meta.dir,
  "../../scripts/create-page.ts",
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

  test("uses the data-slot switch contract for monorepo only", () => {
    const source = fs.readFileSync(createPageFile, "utf8");

    expect(source).toContain('new CustomEvent("switch:set"');
    expect(source).toContain(
      'createProjectMonorepoField?.addEventListener("switch:change"',
    );
    expect(source).toContain('field?.hasAttribute("data-checked")');
    expect(source).not.toContain(
      'createProjectMonorepoField?.addEventListener("change"',
    );
    expect(source).not.toContain("createProjectMonorepoField.checked");
    expect(source).not.toContain("createProjectDocsField");
    expect(source).not.toContain("data-create-project-docs");
    expect(source).not.toContain("data-create-project-rtl");
    expect(source).not.toContain("data-create-project-rtl-language-select");
  });
});
