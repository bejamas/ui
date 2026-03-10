import { describe, expect, it } from "bun:test";
import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  PRESET_STYLES,
  STYLES,
  getCompiledGlobalStyleCss,
  getCompiledStyleCss,
} from "../src/server";
import {
  compileGlobalStyleCss,
  compileStyleCss,
} from "../src/style-css-compiler";
import { getStyleCss } from "../src/style-css-source";

function getSelectContentBlock(css: string) {
  const match = css.match(/\.cn-select-content\s*\{([\s\S]*?)\n  \}/);

  return match?.[1] ?? "";
}

describe("style catalog defaults", () => {
  it("exposes juno as a public style", () => {
    expect(STYLES.map((style) => style.name)).toContain("juno");
    expect(STYLES.map((style) => style.name)).toContain("maia");
    expect(STYLES.map((style) => style.name)).toContain("mira");
    expect(DEFAULT_DESIGN_SYSTEM_CONFIG.style).toBe("juno");
    expect(PRESET_STYLES.indexOf("juno")).toBe(3);
  });

  it("compiles the juno baseline style", async () => {
    const css = await getCompiledStyleCss("juno");
    const globalCss = await getCompiledGlobalStyleCss("juno");

    expect(css).toContain(".style-juno");
    expect(css).toContain(".cn-card");
    expect(globalCss).not.toContain(".style-juno");
    expect(globalCss).toContain(".cn-card");
  });

  it("compiles the vendored shadcn maia and mira styles", async () => {
    const maiaCss = await getCompiledStyleCss("maia");
    const miraCss = await getCompiledStyleCss("mira");
    const maiaGlobalCss = await getCompiledGlobalStyleCss("maia");

    expect(maiaCss).toContain(".style-maia");
    expect(maiaCss).toContain(".cn-card");
    expect(miraCss).toContain(".style-mira");
    expect(miraCss).toContain(".cn-card");
    expect(maiaGlobalCss).not.toContain(".style-maia");
    expect(maiaGlobalCss).toContain(".cn-card");
  });

  it("keeps generated compiled style artifacts in sync with source styles", async () => {
    for (const style of STYLES.map((entry) => entry.name)) {
      expect(await getCompiledStyleCss(style)).toBe(await compileStyleCss(style));
      expect(await getCompiledGlobalStyleCss(style)).toBe(
        await compileGlobalStyleCss(style),
      );
    }
  });

  it("keeps select popup motion in the shared component instead of theme overrides", () => {
    for (const style of ["vega", "nova", "maia", "lyra", "mira"] as const) {
      const selectContentBlock = getSelectContentBlock(getStyleCss(style));

      expect(selectContentBlock).not.toContain("data-open:animate-in");
      expect(selectContentBlock).not.toContain("data-closed:animate-out");
      expect(selectContentBlock).not.toContain("data-open:fade-in-0");
      expect(selectContentBlock).not.toContain("data-closed:fade-out-0");
      expect(selectContentBlock).not.toContain("data-open:zoom-in-95");
      expect(selectContentBlock).not.toContain("data-closed:zoom-out-95");
      expect(selectContentBlock).not.toContain("data-[side=bottom]:slide-in-from-top-2");
      expect(selectContentBlock).not.toContain("duration-100");
      expect(getStyleCss(style)).not.toContain(".cn-select-content-logical");
    }
  });
});
