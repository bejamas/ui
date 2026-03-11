import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const customizerFile = path.resolve(
  import.meta.dir,
  "./CreateCustomizer.astro",
);
const dialogFile = path.resolve(
  import.meta.dir,
  "./CreateNavigateDialog.astro",
);
const createPageFile = path.resolve(
  import.meta.dir,
  "../../scripts/create-page.ts",
);
const createPreviewFile = path.resolve(
  import.meta.dir,
  "../../scripts/create-preview.ts",
);

describe("create navigate dialog", () => {
  test("adds a Navigate menu action with the shadcn-style shortcut", () => {
    const source = fs.readFileSync(customizerFile, "utf8");

    expect(source).toContain('data-value="navigate"');
    expect(source).toContain("Navigate...");
    expect(source).toContain("<DropdownMenuShortcut>⌘P</DropdownMenuShortcut>");
    expect(source).not.toContain(
      "<DropdownMenuShortcut>P</DropdownMenuShortcut>",
    );
  });

  test("renders a dialog-backed command list over the shared kitchen-sink catalog", () => {
    const source = fs.readFileSync(dialogFile, "utf8");

    expect(source).toContain("@bejamas/ui/components/command");
    expect(source).toContain("<CommandDialog");
    expect(source).toContain('class="w-[min(94vw,40rem)] max-w-2xl! p-3"');
    expect(source).toContain("data-create-navigate-dialog");
    expect(source).toContain("data-create-navigate-command");
    expect(source).toContain("data-create-navigate-input");
    expect(source).toContain('placeholder="Search component examples..."');
    expect(source).toContain('heading="Component Examples"');
    expect(source).toContain("<CommandEmpty>No matching pages.</CommandEmpty>");
    expect(source).toContain("value={CREATE_PREVIEW_COMMAND_VALUE}");
    expect(source).toContain("data-create-preview-default");
    expect(source).toContain("value={page.id}");
    expect(source).toContain("<CommandShortcut>JS</CommandShortcut>");
    expect(source).toContain("KITCHEN_SINK_PAGES.map");
    expect(source).not.toContain("@bejamas/ui/components/dialog");
    expect(source).not.toContain("@bejamas/ui/components/input");
    expect(source).not.toContain("SearchIcon");
    expect(source).not.toContain("<Badge");
  });

  test("wires navigate selection through the shared command runtime", () => {
    const source = fs.readFileSync(createPageFile, "utf8");

    expect(source).toContain("[data-create-navigate-command]");
    expect(source).toContain('new CustomEvent("command:set"');
    expect(source).toContain(
      'navigateCommand?.addEventListener("command:select"',
    );
    expect(source).toContain("CREATE_PREVIEW_COMMAND_VALUE");
    expect(source).not.toContain("activeNavigateIndex");
    expect(source).not.toContain("getNavigateVisibleItems");
    expect(source).not.toContain("syncNavigateDialogFilter");
    expect(source).not.toContain("[data-create-navigate-list]");
  });

  test("bridges the navigate shortcut from the focused preview iframe back to the parent page", () => {
    const createPageSource = fs.readFileSync(createPageFile, "utf8");
    const createPreviewSource = fs.readFileSync(createPreviewFile, "utf8");

    expect(createPreviewSource).toContain(
      'window.addEventListener(\n  "keydown"',
    );
    expect(createPreviewSource).toContain(
      'type: "bejamas:create-navigate-open"',
    );
    expect(createPreviewSource).toContain("window.parent.postMessage");
    expect(createPreviewSource).toContain("event.preventDefault()");

    expect(createPageSource).toContain('window.addEventListener(\n  "message"');
    expect(createPageSource).toContain(
      "event.source !== previewFrame.contentWindow",
    );
    expect(createPageSource).toContain(
      'event.data?.type !== "bejamas:create-navigate-open"',
    );
    expect(createPageSource).toContain("setNavigateDialogOpen(true)");
  });
});
