import { describe, expect, it } from "bun:test";
import {
  DEFAULT_PRESET_CONFIG,
  decodePreset,
  encodePreset,
  isPresetCode,
  PRESET_STYLES,
} from "../src/server";

describe("preset codec versions", () => {
  it("keeps shadcn a-codes compatible for shared styles", () => {
    expect(decodePreset("abVJxYW")).toEqual({
      menuColor: "default",
      menuAccent: "subtle",
      radius: "default",
      font: "inter",
      fontHeading: "inherit",
      iconLibrary: "lucide",
      theme: "neutral",
      baseColor: "neutral",
      style: "maia",
    });

    expect(
      encodePreset({
        style: "maia",
        baseColor: "neutral",
        theme: "neutral",
        iconLibrary: "lucide",
        font: "inter",
        fontHeading: "inherit",
        radius: "default",
        menuAccent: "subtle",
        menuColor: "default",
      }),
    ).toBe("abVJxYW");
  });

  it("emits b-codes for bejamas-only styles", () => {
    const preset = encodePreset(DEFAULT_PRESET_CONFIG);

    expect(preset.startsWith("b")).toBe(true);
    expect(decodePreset(preset)).toEqual(DEFAULT_PRESET_CONFIG);
  });

  it("emits a-codes for upstream-compatible styles", () => {
    const preset = encodePreset({
      style: "lyra",
      baseColor: "neutral",
      theme: "neutral",
      iconLibrary: "lucide",
      font: "inter",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
    });

    expect(preset.startsWith("a")).toBe(true);
    expect(decodePreset(preset)).toEqual({
      menuColor: "default",
      menuAccent: "subtle",
      radius: "default",
      font: "inter",
      fontHeading: "inherit",
      iconLibrary: "lucide",
      theme: "neutral",
      baseColor: "neutral",
      style: "lyra",
    });
  });

  it("accepts both preset-code versions", () => {
    expect(isPresetCode("abVJxYW")).toBe(true);
    expect(isPresetCode(encodePreset({ style: "juno" }))).toBe(true);
  });

  it("emits c-codes when the heading font differs from the body font", () => {
    const preset = encodePreset({
      style: "juno",
      baseColor: "neutral",
      theme: "bejamas-blue",
      iconLibrary: "lucide",
      font: "geist",
      fontHeading: "playfair-display",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
    });

    expect(preset.startsWith("c")).toBe(true);
    expect(decodePreset(preset)).toEqual({
      style: "juno",
      baseColor: "neutral",
      theme: "bejamas-blue",
      iconLibrary: "lucide",
      font: "geist",
      fontHeading: "playfair-display",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
    });
  });

  it("decodes and re-encodes modern shadcn b-codes with heading fonts", () => {
    expect(decodePreset("b4aRK5K0fb")).toEqual({
      style: "maia",
      baseColor: "mauve",
      theme: "emerald",
      chartColor: "red",
      iconLibrary: "hugeicons",
      font: "ibm-plex-sans",
      fontHeading: "merriweather",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "inverted-translucent",
    });

    expect(
      encodePreset({
        style: "maia",
        baseColor: "mauve",
        theme: "emerald",
        chartColor: "red",
        iconLibrary: "hugeicons",
        font: "ibm-plex-sans",
        fontHeading: "merriweather",
        radius: "default",
        menuAccent: "subtle",
        menuColor: "inverted-translucent",
      }),
    ).toBe("b4aRK5K0fb");
  });

  it("round-trips curated bejamas blue without changing legacy codes", () => {
    const preset = encodePreset({
      style: "juno",
      baseColor: "neutral",
      theme: "bejamas-blue",
      iconLibrary: "lucide",
      font: "geist",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
    });

    expect(decodePreset(preset)).toEqual({
      style: "juno",
      baseColor: "neutral",
      theme: "bejamas-blue",
      iconLibrary: "lucide",
      font: "geist",
      fontHeading: "inherit",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
    });
    expect(
      encodePreset({
        style: "maia",
        baseColor: "neutral",
        theme: "neutral",
        iconLibrary: "lucide",
        font: "inter",
        fontHeading: "inherit",
        radius: "default",
        menuAccent: "subtle",
        menuColor: "default",
      }),
    ).toBe("abVJxYW");
  });

  it("round-trips translucent menu colors without changing older codes", () => {
    const preset = encodePreset({
      style: "maia",
      baseColor: "neutral",
      theme: "neutral",
      iconLibrary: "lucide",
      font: "inter",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default-translucent",
    });

    expect(preset.startsWith("a")).toBe(true);
    expect(decodePreset(preset)).toMatchObject({
      style: "maia",
      menuColor: "default-translucent",
    });
    expect(
      encodePreset({
        style: "maia",
        baseColor: "neutral",
        theme: "neutral",
        iconLibrary: "lucide",
        font: "inter",
        radius: "default",
        menuAccent: "subtle",
        menuColor: "default",
      }),
    ).toBe("abVJxYW");
  });

  it("keeps juno appended after shadcn styles", () => {
    expect(PRESET_STYLES).toEqual([
      "nova",
      "vega",
      "maia",
      "lyra",
      "mira",
      "juno",
    ]);
  });
});
