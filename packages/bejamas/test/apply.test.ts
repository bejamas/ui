import { describe, expect, test } from "bun:test";
import { encodePreset } from "@bejamas/create-config/server";

import {
  ApplyOnlyError,
  ApplyPresetError,
  getPresetUrlOnly,
  parseApplyOnlyParts,
  resolveApplyOnly,
  resolveApplyPreset,
  resolveApplyPresetSource,
  validateApplyOnlyPreset,
} from "../src/commands/apply";

describe("apply command helpers", () => {
  test("resolves positional and flag presets", () => {
    expect(
      resolveApplyPreset({
        cwd: process.cwd(),
        positionalPreset: "a0",
        preset: undefined,
        only: undefined,
        yes: false,
        silent: false,
      }),
    ).toBe("a0");

    expect(
      resolveApplyPreset({
        cwd: process.cwd(),
        positionalPreset: "a0",
        preset: "a0",
        only: undefined,
        yes: false,
        silent: false,
      }),
    ).toBe("a0");
  });

  test("rejects conflicting positional and flag presets", () => {
    expect(() =>
      resolveApplyPreset({
        cwd: process.cwd(),
        positionalPreset: "a0",
        preset: "b0",
        only: undefined,
        yes: false,
        silent: false,
      }),
    ).toThrow(ApplyPresetError);
  });

  test("parses unique --only parts and font aliases", () => {
    expect(parseApplyOnlyParts("theme,font,fonts")).toEqual(["theme", "font"]);
    expect(resolveApplyOnly("font")).toEqual(["font"]);
  });

  test("rejects missing and invalid --only values", () => {
    expect(() => resolveApplyOnly(true)).toThrow(ApplyOnlyError);
    expect(() => parseApplyOnlyParts("components")).toThrow(ApplyOnlyError);
    expect(() =>
      validateApplyOnlyPreset({
        preset: undefined,
        only: ["theme"],
      }),
    ).toThrow(ApplyOnlyError);
  });

  test("reads --only from preset URLs", () => {
    expect(
      getPresetUrlOnly("https://ui.bejamas.com/init?preset=a0&only=theme,font"),
    ).toBe("theme,font");
  });

  test("accepts create and init URLs containing preset codes", () => {
    const preset = encodePreset({
      style: "luma",
      font: "inter",
      theme: "neutral",
    });

    expect(
      resolveApplyPresetSource(
        `https://ui.bejamas.com/create?preset=${preset}&themeRef=custom-123`,
      ),
    ).toEqual({
      preset,
      themeRef: "custom-123",
      only: undefined,
    });

    expect(
      resolveApplyPresetSource(
        `https://ui.bejamas.com/init?preset=${preset}&only=font`,
      ),
    ).toEqual({
      preset,
      themeRef: undefined,
      only: "font",
    });
  });

  test("rejects preset URLs outside create and init", () => {
    const preset = encodePreset({
      style: "luma",
      font: "inter",
      theme: "neutral",
    });

    expect(() =>
      resolveApplyPresetSource(`https://ui.bejamas.com/docs?preset=${preset}`),
    ).toThrow(ApplyPresetError);
  });
});
