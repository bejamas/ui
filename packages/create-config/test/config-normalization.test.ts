import { describe, expect, it } from "bun:test";
import { normalizeDesignSystemConfig } from "../src/server";

const baseConfig = {
  style: "nova",
  baseColor: "neutral",
  theme: "neutral",
  iconLibrary: "lucide",
  font: "inter",
  fontHeading: "inherit",
  radius: "default",
  template: "astro",
  rtl: false,
  rtlLanguage: "ar",
} as const;

describe("design system config normalization", () => {
  it("coerces bold accent to subtle for default translucent menus", () => {
    expect(
      normalizeDesignSystemConfig({
        ...baseConfig,
        menuAccent: "bold",
        menuColor: "default-translucent",
      }).menuAccent,
    ).toBe("subtle");
  });

  it("coerces bold accent to subtle for inverted translucent menus", () => {
    expect(
      normalizeDesignSystemConfig({
        ...baseConfig,
        menuAccent: "bold",
        menuColor: "inverted-translucent",
      }).menuAccent,
    ).toBe("subtle");
  });
});
