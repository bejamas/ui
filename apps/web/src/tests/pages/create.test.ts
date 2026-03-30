import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const createPageFile = path.resolve(
  import.meta.dir,
  "../../pages/create.astro",
);

describe("create page stable customizer overrides", () => {
  test("boots from a static shell and keeps the create page hidden until Stimulus applies real state", () => {
    const source = fs.readFileSync(createPageFile, "utf8");

    expect(source).toContain("data-create-pending");
    expect(source).toContain("visibility: hidden;");
    expect(source).toContain('"__BEJAMAS_CREATE__"');
  });

  test("pins dropdown menu highlighted state to the muted dark create palette", () => {
    const source = fs.readFileSync(createPageFile, "utf8");

    expect(source).toContain(
      "[data-create-picker-content]",
    );
    expect(source).toContain(
      '[data-slot="dropdown-menu-radio-item"]',
    );
    expect(source).toContain(
      "background: rgba(255, 255, 255, 0.06) !important;",
    );
    expect(source).toContain("color: rgba(255, 255, 255, 0.92) !important;");
  });
});
