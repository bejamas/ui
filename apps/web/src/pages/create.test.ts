import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const createPageFile = path.resolve(import.meta.dir, "./create.astro");

describe("create page stable customizer overrides", () => {
  test("pins dropdown menu highlighted and selected states to the muted dark create palette", () => {
    const source = fs.readFileSync(createPageFile, "utf8");

    expect(source).toContain('[data-create-main-menu-content], [data-create-picker-content]');
    expect(source).toContain('[data-slot="dropdown-menu-item"][data-highlighted]');
    expect(source).toContain('[data-slot="dropdown-menu-item"][data-selected]');
    expect(source).toContain("background: rgba(255, 255, 255, 0.06) !important;");
    expect(source).toContain("color: rgba(255, 255, 255, 0.92) !important;");
  });
});
