import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fonts } from "../src/catalog/fonts";
import {
  buildBaseStyleCssObject,
  buildStyleItem,
  buildStyleTokenMap,
  buildFontItem,
  transformRegistrySource,
} from "../scripts/build-web-style-registry";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");

function read(relativePath: string) {
  return readFileSync(path.resolve(repoRoot, relativePath), "utf8");
}

describe("style registry build", () => {
  it("keeps the shared style item css slim", () => {
    const css = buildBaseStyleCssObject();

    expect(css).toEqual({
      '@import "tw-animate-css"': {},
      '@import "shadcn/tailwind.css"': {},
      "@layer base": {
        "*": {
          "@apply border-border outline-ring/50": {},
        },
        body: {
          "@apply bg-background text-foreground": {},
        },
      },
    });
    expect(JSON.stringify(css)).not.toContain(".cn-card");
    expect(JSON.stringify(css)).not.toContain(".cn-button");
  });

  it("emits standalone font registry items for each style bundle", async () => {
    const styleItem = await buildStyleItem({ id: "bejamas-juno", name: "juno", title: "Juno" });
    const fontItem = buildFontItem(fonts.find((font) => font.name === "font-inter")!);

    expect(styleItem.files).toEqual([]);
    expect(styleItem.css).toEqual(buildBaseStyleCssObject());
    expect(fontItem).toMatchObject({
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: "font-inter",
      type: "registry:font",
    });
    expect(fontItem).toHaveProperty("font.import", "Inter");
  });

  it("expands style hooks in representative component sources", () => {
    const tokenMap = buildStyleTokenMap("juno");
    const button = transformRegistrySource(
      read("packages/registry/src/ui/button/Button.astro"),
      tokenMap,
    );
    const dropdownContent = transformRegistrySource(
      read("packages/registry/src/ui/dropdown-menu/DropdownMenuContent.astro"),
      tokenMap,
    );

    expect(button).toContain('from "@/lib/utils"');
    expect(button).toContain("shadow-none hover:bg-primary/90");
    expect(button).toContain("px-3 py-2 text-sm");
    expect(button).not.toContain("cn-button-variant-default");
    expect(button).not.toContain("cn-button-size-default");
    expect(button).not.toContain('"cn-button"');

    expect(dropdownContent).toContain("cn-menu-target");
    expect(dropdownContent).toContain("min-w-32 rounded-md p-1 shadow-md ring-1");
    expect(dropdownContent).toContain(
      "data-[side=inline-start]:slide-in-from-right-2",
    );
    expect(dropdownContent).not.toContain("cn-dropdown-menu-content");
    expect(dropdownContent).not.toContain("cn-dropdown-menu-content-logical");
  });

  it("converts raw style declarations into inline arbitrary utilities", () => {
    const tokenMap = buildStyleTokenMap("juno");
    const tabsIndicator = tokenMap.get("cn-tabs-list-variant-indicator");

    expect(tabsIndicator).toContain(
      "[--tabs-indicator-radius:calc(var(--radius)_-_2px)]",
    );
  });
});
