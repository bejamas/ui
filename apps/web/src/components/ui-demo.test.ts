import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const uiDemoPath = "apps/web/src/components/UiDemo.astro";

describe("UiDemo", () => {
  it("renders registry components without a local themed wrapper", () => {
    const source = readFileSync(uiDemoPath, "utf8");

    expect(source).not.toContain("RegistrySurface");
    expect(source).toContain("@bejamas/registry/ui/button");
    expect(source).toContain("@bejamas/registry/ui/card");
    expect(source).toContain(
      "https://gradient.bejamas.com/presets/bejamas/marine.png",
    );
    expect(source).not.toContain("/api/gradient.png");
  });
});
