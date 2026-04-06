import { describe, expect, it } from "bun:test";
import {
  buildRegistryBaseCss,
  buildRegistryBaseItem,
  buildStyleIndexItem,
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

  it("installs only the selected icon package from base config", () => {
    const lucideItem = buildRegistryBaseItem({
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
    const tablerItem = buildRegistryBaseItem({
      style: "juno",
      font: "inter",
      fontHeading: "inherit",
      iconLibrary: "tabler",
      baseColor: "neutral",
      theme: "neutral",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
      template: "astro",
      rtl: false,
      rtlLanguage: "ar",
    });

    expect(lucideItem.dependencies).toContain("@lucide/astro");
    expect(tablerItem.dependencies).toContain("@iconify-json/tabler");
    expect(tablerItem.dependencies).not.toContain("@lucide/astro");
  });

  it("keeps the style index free of hard-coded icon packages", () => {
    const styleItem = buildStyleIndexItem("juno");

    expect(styleItem.dependencies).toContain("bejamas");
    expect(styleItem.dependencies).toContain("class-variance-authority");
    expect(styleItem.dependencies).not.toContain("@lucide/astro");
  });
});
