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
  STYLE_LAYER_ORDER_DECLARATION,
} from "../src/style-css-compiler";
import { getStyleCss } from "../src/style-css-source";

function getSelectContentBlock(css: string) {
  const match = css.match(/\.cn-select-content\s*\{([\s\S]*?)\n  \}/);

  return match?.[1] ?? "";
}

function getCssBlock(css: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n  \\}`));

  return match?.[1] ?? "";
}

describe("style catalog defaults", () => {
  it("exposes juno as a public style", () => {
    expect(STYLES.map((style) => style.name)).toContain("juno");
    expect(STYLES.map((style) => style.name)).toContain("maia");
    expect(STYLES.map((style) => style.name)).toContain("mira");
    expect(DEFAULT_DESIGN_SYSTEM_CONFIG.style).toBe("juno");
    expect(PRESET_STYLES.indexOf("juno")).toBe(5);
  });

  it("compiles the juno baseline style", async () => {
    const css = await getCompiledStyleCss("juno");
    const globalCss = await getCompiledGlobalStyleCss("juno");

    expect(css).toContain(STYLE_LAYER_ORDER_DECLARATION);
    expect(css).toContain("@layer components");
    expect(css).toContain(".style-juno");
    expect(css).toContain(".cn-card");
    expect(css).toContain(".cn-menu-translucent");
    expect(globalCss).toContain(STYLE_LAYER_ORDER_DECLARATION);
    expect(globalCss).toContain("@layer components");
    expect(globalCss).not.toContain(".style-juno");
    expect(globalCss).toContain(".cn-card");
    expect(globalCss).toContain(".cn-menu-translucent");
  });

  it("compiles the vendored shadcn maia and mira styles", async () => {
    const maiaCss = await getCompiledStyleCss("maia");
    const miraCss = await getCompiledStyleCss("mira");
    const maiaGlobalCss = await getCompiledGlobalStyleCss("maia");

    expect(maiaCss).toContain("@layer components");
    expect(maiaCss).toContain(".style-maia");
    expect(maiaCss).toContain(".cn-card");
    expect(maiaCss).toContain(".cn-menu-translucent");
    expect(miraCss).toContain("@layer components");
    expect(miraCss).toContain(".style-mira");
    expect(miraCss).toContain(".cn-card");
    expect(maiaGlobalCss).toContain("@layer components");
    expect(maiaGlobalCss).not.toContain(".style-maia");
    expect(maiaGlobalCss).toContain(".cn-card");
  });

  it("keeps generated compiled style artifacts in sync with source styles", async () => {
    for (const style of STYLES.map((entry) => entry.name)) {
      expect(await getCompiledStyleCss(style)).toBe(
        await compileStyleCss(style),
      );
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
      expect(selectContentBlock).not.toContain(
        "data-[side=bottom]:slide-in-from-top-2",
      );
      expect(selectContentBlock).not.toContain("duration-100");
      expect(getStyleCss(style)).not.toContain(".cn-select-content-logical");
    }
  });

  it("keeps Juno dialog styling in a single style-layer definition", () => {
    const junoCss = getStyleCss("juno");

    expect(junoCss).not.toContain(
      ".cn-dropdown-menu-content,\n  .cn-popover-content,\n  .cn-tooltip-content,\n  .cn-select-content,\n  .cn-combobox-content,\n  .cn-dialog-content,",
    );
    expect(junoCss).not.toContain(
      "@apply bg-background/30 duration-300 supports-backdrop-filter:backdrop-blur-sm;",
    );
    expect(junoCss).not.toContain(
      "@apply grid max-w-[calc(100%-2rem)] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-250 ease-out [--tw-animation-fill-mode:both] sm:max-w-lg;",
    );
  });

  it("keeps tooltip motion and arrow nudges aligned in every style", () => {
    for (const style of STYLES.map((entry) => entry.name)) {
      const css = getStyleCss(style);
      const tooltipContentBlock = getCssBlock(css, ".cn-tooltip-content");
      const tooltipContentLogicalBlock = getCssBlock(
        css,
        ".cn-tooltip-content-logical",
      );
      const tooltipArrowBlock = getCssBlock(css, ".cn-tooltip-arrow");
      const tooltipArrowLogicalBlock = getCssBlock(
        css,
        ".cn-tooltip-arrow-logical",
      );

      expect(css).toContain(".cn-tooltip-content");
      expect(css).toContain(".cn-tooltip-arrow");
      expect(css).toContain(".cn-tooltip-arrow-logical");
      expect(tooltipContentBlock).toContain("data-[state=delayed-open]:animate-in");
      expect(tooltipContentBlock).toContain("pointer-events-none");
      expect(tooltipContentBlock).toContain("data-open:pointer-events-auto");
      expect(tooltipContentBlock).toContain("data-closed:pointer-events-none");
      expect(tooltipContentBlock).not.toContain("data-starting-style:opacity-0");
      expect(tooltipContentBlock).not.toContain("data-ending-style:scale-95");
      expect(tooltipContentBlock).not.toContain("data-instant:animate-none!");
      expect(tooltipArrowBlock).not.toContain("pointer-events-none");
      expect(tooltipArrowBlock).toContain("data-[side=top]:-bottom-1");
      expect(tooltipArrowBlock).toContain("data-[side=bottom]:-top-1");
      expect(tooltipArrowBlock).toContain("data-[side=left]:-right-1");
      expect(tooltipArrowBlock).toContain("data-[side=right]:-left-1");
      expect(tooltipArrowBlock).not.toContain("top-1/2!");
      expect(tooltipArrowBlock).not.toContain("translate-y-[calc(-50%-2px)]");
      expect(tooltipArrowLogicalBlock).not.toContain("pointer-events-none");
      expect(tooltipArrowLogicalBlock).toContain("data-[side=inline-start]:-right-1");
      expect(tooltipArrowLogicalBlock).toContain("data-[side=inline-end]:-left-1");
      expect(tooltipArrowLogicalBlock).not.toContain("top-1/2!");
      expect(tooltipArrowLogicalBlock).not.toContain("-translate-y-1/2");
      expect(tooltipContentLogicalBlock).toContain(
        "data-[side=inline-start]:slide-in-from-right-2",
      );
      expect(tooltipContentLogicalBlock).toContain(
        "data-[side=inline-end]:slide-in-from-left-2",
      );

      if (style === "juno" || style === "maia") {
        expect(tooltipArrowBlock).toContain("data-[side=left]:translate-x-[-1.5px]");
        expect(tooltipArrowBlock).toContain("data-[side=right]:translate-x-[1.5px]");
        expect(tooltipArrowLogicalBlock).toContain(
          "data-[side=inline-start]:translate-x-[-1.5px]",
        );
        expect(tooltipArrowLogicalBlock).toContain(
          "data-[side=inline-end]:translate-x-[1.5px]",
        );
      } else {
        expect(tooltipArrowBlock).not.toContain("data-[side=left]:translate-x-[-1.5px]");
        expect(tooltipArrowBlock).not.toContain("data-[side=right]:translate-x-[1.5px]");
        expect(tooltipArrowLogicalBlock).not.toContain(
          "data-[side=inline-start]:translate-x-[-1.5px]",
        );
        expect(tooltipArrowLogicalBlock).not.toContain(
          "data-[side=inline-end]:translate-x-[1.5px]",
        );
      }
    }
  });

  it("keeps sidebar outline styles compatible with direct color variables", () => {
    for (const style of STYLES.map((entry) => entry.name)) {
      const css = getStyleCss(style);

      expect(css).not.toContain("hsl(var(--sidebar-border))");
      expect(css).not.toContain("hsl(var(--sidebar-accent))");
      expect(css).toContain("box-shadow: 0 0 0 1px var(--sidebar-border);");
    }
  });

  it("exposes explicit tabs list variant and size selectors in every style", () => {
    for (const style of STYLES.map((entry) => entry.name)) {
      const css = getStyleCss(style);

      expect(css).toContain(".cn-tabs-list-variant-indicator");
      expect(css).toContain(".cn-tabs-list-variant-default");
      expect(css).toContain(".cn-tabs-list-variant-line");
      expect(css).toContain(".cn-tabs-list-variant-line-animated");
      expect(css).toContain(".cn-tabs-list-size-default");
      expect(css).toContain(".cn-tabs-list-size-sm");
      expect(css).toContain(".cn-tabs-list-size-lg");
      expect(css).toContain("--tabs-indicator-radius");
    }
  });
});
