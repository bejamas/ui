import { describe, expect, test } from "bun:test";
import { buildInitUrl, resolveDesignSystemConfig } from "../src/commands/init";

describe("init RTL language support", () => {
  test("applies the requested RTL language when RTL is enabled", () => {
    const config = resolveDesignSystemConfig({
      baseColor: undefined,
      preset: undefined,
      template: "astro",
      rtl: true,
      lang: "he",
    });

    expect(config.rtl).toBe(true);
    expect(config.rtlLanguage).toBe("he");
  });

  test("falls back to Arabic when RTL is disabled", () => {
    const config = resolveDesignSystemConfig({
      baseColor: undefined,
      preset: undefined,
      template: "astro",
      rtl: false,
      lang: "fa",
    });

    expect(config.rtl).toBe(false);
    expect(config.rtlLanguage).toBe("ar");
  });

  test("includes lang in the init URL only for RTL presets", () => {
    const rtlUrl = buildInitUrl({
      style: "juno",
      baseColor: "neutral",
      theme: "neutral",
      iconLibrary: "lucide",
      font: "geist",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
      template: "astro",
      rtl: true,
      rtlLanguage: "fa",
    });
    const ltrUrl = buildInitUrl({
      style: "juno",
      baseColor: "neutral",
      theme: "neutral",
      iconLibrary: "lucide",
      font: "geist",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
      template: "astro",
      rtl: false,
      rtlLanguage: "he",
    });

    expect(rtlUrl).toContain("rtl=true");
    expect(rtlUrl).toContain("lang=fa");
    expect(ltrUrl).not.toContain("lang=");
  });
});
