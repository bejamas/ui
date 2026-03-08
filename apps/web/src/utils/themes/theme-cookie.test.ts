import { describe, expect, test } from "bun:test";
import {
  encodeThemeCookie,
  parseThemeCookie,
} from "./theme-cookie";

describe("theme cookie helpers", () => {
  test("parses a plain preset-code cookie value", () => {
    expect(parseThemeCookie("a2fA")).toEqual({ id: "a2fA" });
  });

  test("parses a legacy swatch cookie value", () => {
    expect(
      parseThemeCookie(
        "custom-abc|light-primary|light-accent|dark-primary|dark-accent|My Theme",
      ),
    ).toEqual({
      id: "custom-abc",
      swatches: {
        primaryLight: "light-primary",
        accentLight: "light-accent",
        primaryDark: "dark-primary",
        accentDark: "dark-accent",
      },
      name: "My Theme",
    });
  });

  test("encodes legacy cookie values compatibly", () => {
    expect(
      encodeThemeCookie(
        "custom-abc",
        {
          primaryLight: "light-primary",
          accentLight: "light-accent",
          primaryDark: "dark-primary",
          accentDark: "dark-accent",
        },
        "My Theme",
      ),
    ).toBe(
      "custom-abc|light-primary|light-accent|dark-primary|dark-accent|My Theme",
    );
  });
});
