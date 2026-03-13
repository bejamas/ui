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

  test("uses the configured UI base URL for localhost init flows", () => {
    const url = buildInitUrl(
      {
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
        rtlLanguage: "ar",
      },
      undefined,
      {
        ...process.env,
        BEJAMAS_UI_URL: "http://localhost:4322/",
      },
    );

    expect(url.startsWith("http://localhost:4322/init?")).toBe(true);
  });

  test("derives the init URL from REGISTRY_URL when only local /r is provided", () => {
    const url = buildInitUrl(
      {
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
        rtlLanguage: "ar",
      },
      undefined,
      {
        ...process.env,
        REGISTRY_URL: "http://localhost:4322/r",
      },
    );

    expect(url.startsWith("http://localhost:4322/init?")).toBe(true);
  });
});
