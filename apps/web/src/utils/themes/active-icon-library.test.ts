import { describe, expect, test } from "bun:test";
import { encodePreset } from "@bejamas/create-config/server";
import { encodeThemeCookie } from "./theme-cookie";
import { resolveActiveIconLibrary } from "./active-icon-library";

describe("resolveActiveIconLibrary", () => {
  test("prefers the preset query over the cookie", () => {
    const queryPreset = encodePreset({ iconLibrary: "tabler" });
    const cookiePreset = encodeThemeCookie(
      encodePreset({ iconLibrary: "remixicon" }),
    );

    const result = resolveActiveIconLibrary(
      new URLSearchParams({ preset: queryPreset }),
      cookiePreset,
    );

    expect(result).toBe("tabler");
  });

  test("restores the icon library from the theme cookie when present", () => {
    const cookiePreset = encodeThemeCookie(
      encodePreset({ iconLibrary: "phosphor" }),
    );

    const result = resolveActiveIconLibrary(new URLSearchParams(), cookiePreset);

    expect(result).toBe("phosphor");
  });

  test("falls back to lucide for invalid or legacy cookie values", () => {
    expect(resolveActiveIconLibrary(new URLSearchParams(), "rome")).toBe("lucide");
    expect(resolveActiveIconLibrary(new URLSearchParams({ preset: "oops" }))).toBe(
      "lucide",
    );
  });
});
