import { describe, expect, it } from "bun:test";
import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  STYLES,
  getCompiledGlobalStyleCss,
  getCompiledStyleCss,
} from "../src/server";

describe("style catalog defaults", () => {
  it("exposes bejamas as a public style", () => {
    expect(STYLES.map((style) => style.name)).toContain("bejamas");
    expect(STYLES.map((style) => style.name)).toContain("maia");
    expect(STYLES.map((style) => style.name)).toContain("mira");
    expect(DEFAULT_DESIGN_SYSTEM_CONFIG.style).toBe("bejamas");
  });

  it("compiles the bejamas baseline style", async () => {
    const css = await getCompiledStyleCss("bejamas");
    const globalCss = await getCompiledGlobalStyleCss("bejamas");

    expect(css).toContain(".style-bejamas");
    expect(css).toContain(".cn-card");
    expect(globalCss).not.toContain(".style-bejamas");
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
});
