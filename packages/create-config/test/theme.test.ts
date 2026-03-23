import { describe, expect, it } from "bun:test";
import {
  buildRegistryBaseCss,
  buildRegistryBaseItem,
  buildRegistryStyleCss,
} from "../src/server";

describe("registry base item", () => {
  it("keeps init css slim while style css stays self-styled", () => {
    const baseItem = buildRegistryBaseItem({
      style: "juno",
      font: "inter",
      fontHeading: "inherit",
      iconLibrary: "lucide",
      baseColor: "neutral",
      theme: "neutral",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
    });
    const styleCss = buildRegistryStyleCss("juno");

    expect(baseItem.css).toEqual(buildRegistryBaseCss());
    expect(Object.keys(baseItem.css ?? {})).toContain(
      '@import "bejamas/tailwind.css"',
    );
    expect(baseItem.dependencies).toContain("bejamas");
    expect(JSON.stringify(baseItem.css)).not.toContain(".cn-card");
    expect(JSON.stringify(baseItem.css)).not.toContain(".cn-button");
    expect(JSON.stringify(styleCss)).toContain(".cn-card");
  });

  it("omits inherited heading font registry dependencies", () => {
    const baseItem = buildRegistryBaseItem({
      style: "juno",
      font: "inter",
      fontHeading: "inherit",
      iconLibrary: "lucide",
      baseColor: "neutral",
      theme: "neutral",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
      template: "astro",
      rtl: false,
      rtlLanguage: "ar",
    });

    expect(baseItem.registryDependencies).toEqual(["utils", "font-inter"]);
    expect(baseItem.docs).toBe("Font family: 'Inter Variable', sans-serif");
  });

  it("adds a distinct heading font registry dependency when selected", () => {
    const baseItem = buildRegistryBaseItem({
      style: "juno",
      font: "inter",
      fontHeading: "playfair-display",
      iconLibrary: "lucide",
      baseColor: "neutral",
      theme: "neutral",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
      template: "astro",
      rtl: false,
      rtlLanguage: "ar",
    });

    expect(baseItem.registryDependencies).toEqual([
      "utils",
      "font-inter",
      "font-heading-playfair-display",
    ]);
    expect(baseItem.docs).toContain("Heading font family");
  });
});
