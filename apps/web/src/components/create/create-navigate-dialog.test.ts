import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const customizerFile = path.resolve(import.meta.dir, "./CreateCustomizer.astro");
const dialogFile = path.resolve(import.meta.dir, "./CreateNavigateDialog.astro");

describe("create navigate dialog", () => {
  test("adds a Navigate menu action with the shadcn-style shortcut", () => {
    const source = fs.readFileSync(customizerFile, "utf8");

    expect(source).toContain('data-value="navigate"');
    expect(source).toContain("Navigate...");
    expect(source).toContain("<DropdownMenuShortcut>⌘P</DropdownMenuShortcut>");
    expect(source).not.toContain("<DropdownMenuShortcut>P</DropdownMenuShortcut>");
  });

  test("renders a dialog-backed command list over the shared kitchen-sink catalog", () => {
    const source = fs.readFileSync(dialogFile, "utf8");

    expect(source).toContain("@bejamas/ui/components/dialog");
    expect(source).toContain("@bejamas/ui/components/input");
    expect(source).toContain('data-create-navigate-dialog');
    expect(source).toContain('data-create-navigate-input');
    expect(source).toContain('data-create-navigate-list');
    expect(source).toContain('data-create-navigate-item');
    expect(source).toContain('data-create-preview-default');
    expect(source).toContain('data-preview-item=""');
    expect(source).toContain('data-create-preview-target={page.id}');
    expect(source).toContain("KITCHEN_SINK_PAGES.map");
  });
});
