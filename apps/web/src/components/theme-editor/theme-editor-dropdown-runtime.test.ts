import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const panelFile = path.resolve(import.meta.dir, "./ThemeEditorPanel.astro");

describe("theme editor preset dropdown runtime", () => {
  test("uses radio items and dropdown value-change/set for preset selection", () => {
    const source = fs.readFileSync(panelFile, "utf8");

    expect(source).toContain("DropdownMenuRadioItem");
    expect(source).toContain('x-ref="presetMenu"');
    expect(source).toContain('defaultValue={presetKeys[0]}');
    expect(source).toContain('dropdown?.addEventListener("dropdown-menu:value-change"');
    expect(source).toContain('data-slot", "dropdown-menu-radio-item"');
    expect(source).toContain('dropdown-menu-radio-item-indicator');
    expect(source).toContain('new CustomEvent("dropdown-menu:set", {');
    expect(source).toContain("syncPresetDropdownSelection()");
    expect(source).not.toContain('[data-slot="dropdown-menu-item"]');
    expect(source).not.toContain('dropdown-menu-item-indicator');
  });
});
