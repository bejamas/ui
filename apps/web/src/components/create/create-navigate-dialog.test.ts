import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const customizerFile = path.resolve(
  import.meta.dir,
  "./CreateCustomizer.astro",
);
const headerFile = path.resolve(import.meta.dir, "./CreateSidebarHeader.astro");
const dialogFile = path.resolve(
  import.meta.dir,
  "./CreateNavigateDialog.astro",
);
const createPageFile = path.resolve(
  import.meta.dir,
  "../../pages/create.astro",
);
const editorControllerFile = path.resolve(
  import.meta.dir,
  "../../stimulus/controllers/create_editor_controller.ts",
);
const navigateControllerFile = path.resolve(
  import.meta.dir,
  "../../stimulus/controllers/create_navigate_controller.ts",
);
const createPreviewFile = path.resolve(
  import.meta.dir,
  "../../stimulus/controllers/create_preview_controller.ts",
);
const previewPageFile = path.resolve(
  import.meta.dir,
  "../../pages/create/preview.astro",
);

describe("create navigate dialog", () => {
  test("wires sidebar buttons to the shared Stimulus navigate event", () => {
    const customizerSource = fs.readFileSync(customizerFile, "utf8");
    const headerSource = fs.readFileSync(headerFile, "utf8");

    expect(customizerSource).toContain('data-controller="create-sidebar"');
    expect(headerSource).toContain('data-action="click->create-sidebar#openNavigate"');
    expect(headerSource).toContain("data-create-header-navigate");
    expect(headerSource).toContain("data-create-header-search");
  });

  test("renders a dialog-backed command list with Stimulus controller targets", () => {
    const source = fs.readFileSync(dialogFile, "utf8");

    expect(source).toContain("@bejamas/ui/components/command");
    expect(source).toContain("<CommandDialog");
    expect(source).toContain('class="p-3"');
    expect(source).toContain('data-controller="create-navigate"');
    expect(source).toContain("data-create-navigate-dialog");
    expect(source).toContain("data-create-navigate-command");
    expect(source).toContain("data-create-navigate-input");
    expect(source).toContain('data-create-navigate-target="dialog"');
    expect(source).toContain('data-create-navigate-target="command"');
    expect(source).toContain('data-create-navigate-target="input"');
    expect(source).toContain('placeholder="Search component examples..."');
    expect(source).toContain('heading="Component Examples"');
    expect(source).toContain("<CommandEmpty>No matching pages.</CommandEmpty>");
    expect(source).toContain("value={CREATE_PREVIEW_COMMAND_VALUE}");
    expect(source).toContain("data-create-preview-default");
    expect(source).toContain("value={page.id}");
    expect(source).toContain("KITCHEN_SINK_PAGES.map");
    expect(source).not.toContain("@bejamas/ui/components/dialog");
    expect(source).not.toContain("@bejamas/ui/components/input");
  });

  test("wires navigate selection through the editor and navigate Stimulus controllers", () => {
    const pageSource = fs.readFileSync(createPageFile, "utf8");
    const editorSource = fs.readFileSync(editorControllerFile, "utf8");
    const navigateSource = fs.readFileSync(navigateControllerFile, "utf8");

    expect(pageSource).toContain('data-controller="create-editor"');
    expect(pageSource).toContain(
      "create-navigate:select-target->create-editor#handleNavigateSelectTarget",
    );
    expect(pageSource).toContain('import "@/stimulus/create";');
    expect(navigateSource).toContain('new CustomEvent("command:set"');
    expect(navigateSource).toContain("this.dispatch(\"select-target\"");
    expect(editorSource).toContain("this.createNavigateOutlet.setSelectedTarget");
    expect(editorSource).toContain("this.createNavigateOutlet.open()");
  });

  test("bridges the navigate shortcut from the focused preview iframe back to the parent page", () => {
    const createPageSource = fs.readFileSync(editorControllerFile, "utf8");
    const createPreviewSource = fs.readFileSync(createPreviewFile, "utf8");
    const previewPageSource = fs.readFileSync(previewPageFile, "utf8");

    expect(previewPageSource).toContain('data-controller="create-preview"');
    expect(previewPageSource).toContain('import "@/stimulus/create";');
    expect(createPreviewSource).toContain("openNavigateShortcut(event: KeyboardEvent)");
    expect(createPreviewSource).toContain(
      'type: "bejamas:create-navigate-open"',
    );
    expect(createPreviewSource).toContain("window.parent.postMessage");
    expect(createPreviewSource).toContain("event.preventDefault()");

    expect(createPageSource).toContain("handleWindowMessage");
    expect(createPageSource).toContain(
      "event.source !== this.frameTarget.contentWindow",
    );
    expect(createPageSource).toContain(
      'event.data?.type !== "bejamas:create-navigate-open"',
    );
    expect(createPageSource).toContain("this.openNavigate();");
  });
});
