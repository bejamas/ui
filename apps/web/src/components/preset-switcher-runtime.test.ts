import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const presetSwitcherFile = path.resolve(import.meta.dir, "./PresetSwitcher.astro");
const presetSwitcherIslandFile = path.resolve(
  import.meta.dir,
  "./PresetSwitcherIsland.astro",
);

describe("preset switcher dropdown runtime", () => {
  test("uses the dropdown event API for preset selection", () => {
    const source = fs.readFileSync(presetSwitcherFile, "utf8");
    const islandSource = fs.readFileSync(presetSwitcherIslandFile, "utf8");

    expect(source).toContain('value={key}');
    expect(source).toContain("<DropdownMenuRadioItem");
    expect(source).toContain('this.addEventListener("dropdown-menu:value-change", this.onValueChange);');
    expect(source).toContain('data-value="${key}"');
    expect(source).toContain('data-slot="dropdown-menu-radio-item"');
    expect(source).toContain('new CustomEvent("dropdown-menu:set", {');
    expect(source).not.toContain("data-selected");
    expect(source).not.toContain('content?.addEventListener("click"');
    expect(source).not.toContain('content?.addEventListener("keydown"');

    expect(islandSource).toContain('value={key}');
    expect(islandSource).toContain("<DropdownMenuRadioItem");
    expect(islandSource).toContain('this.addEventListener("dropdown-menu:value-change", this.onValueChange);');
    expect(islandSource).toContain('data-value="${key}"');
    expect(islandSource).toContain('data-slot="dropdown-menu-radio-item"');
    expect(islandSource).toContain('new CustomEvent("dropdown-menu:set", {');
    expect(islandSource).not.toContain("data-selected");
    expect(islandSource).not.toContain('content?.addEventListener("click"');
    expect(islandSource).not.toContain('content?.addEventListener("keydown"');
  });
});
