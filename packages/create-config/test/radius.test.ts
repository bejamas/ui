import { describe, expect, it } from "bun:test";
import {
  getStyleDefaultRadius,
  normalizeDesignSystemConfig,
  resolveEffectiveRadius,
} from "../src/server";

describe("style-linked radius defaults", () => {
  it("maps styles to the expected default radius", () => {
    expect(getStyleDefaultRadius("juno")).toBe("default");
    expect(getStyleDefaultRadius("vega")).toBe("default");
    expect(getStyleDefaultRadius("nova")).toBe("default");
    expect(getStyleDefaultRadius("lyra")).toBe("none");
    expect(getStyleDefaultRadius("maia")).toBe("large");
    expect(getStyleDefaultRadius("mira")).toBe("default");
  });

  it("uses the style default only while radius remains in default mode", () => {
    expect(resolveEffectiveRadius("lyra", "default")).toBe("none");
    expect(resolveEffectiveRadius("maia", "default")).toBe("large");
    expect(resolveEffectiveRadius("lyra", "large")).toBe("none");
    expect(resolveEffectiveRadius("maia", "none")).toBe("none");
  });

  it("normalizes locked style options to their canonical values", () => {
    expect(
      normalizeDesignSystemConfig({
        style: "lyra",
        baseColor: "neutral",
        theme: "neutral",
        iconLibrary: "lucide",
        font: "inter",
        radius: "large",
        menuAccent: "subtle",
        menuColor: "default",
        template: "astro",
        rtl: false,
        rtlLanguage: "ar",
      }).radius,
    ).toBe("none");
  });
});
