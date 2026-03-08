import { describe, expect, it } from "bun:test";
import {
  getStyleDefaultRadius,
  resolveEffectiveRadius,
} from "../src/server";

describe("style-linked radius defaults", () => {
  it("maps styles to the expected default radius", () => {
    expect(getStyleDefaultRadius("bejamas")).toBe("default");
    expect(getStyleDefaultRadius("vega")).toBe("default");
    expect(getStyleDefaultRadius("nova")).toBe("default");
    expect(getStyleDefaultRadius("lyra")).toBe("none");
    expect(getStyleDefaultRadius("maia")).toBe("large");
    expect(getStyleDefaultRadius("mira")).toBe("default");
  });

  it("uses the style default only while radius remains in default mode", () => {
    expect(resolveEffectiveRadius("lyra", "default")).toBe("none");
    expect(resolveEffectiveRadius("maia", "default")).toBe("large");
    expect(resolveEffectiveRadius("lyra", "large")).toBe("large");
    expect(resolveEffectiveRadius("maia", "none")).toBe("none");
  });
});
