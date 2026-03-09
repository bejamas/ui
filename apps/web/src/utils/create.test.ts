import { describe, expect, test } from "bun:test";
import { encodePreset } from "@bejamas/create-config/server";
import { parseCreateSearchParams } from "./create";

describe("parseCreateSearchParams", () => {
  test("uses the default config when neither URL nor fallback preset is provided", () => {
    const result = parseCreateSearchParams(new URLSearchParams());

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toMatchObject({
      style: "juno",
      baseColor: "neutral",
      theme: "neutral",
      font: "geist",
      radius: "default",
      template: "astro",
      rtl: false,
    });
  });

  test("uses a fallback preset when the URL does not include one", () => {
    const fallbackPreset = encodePreset({
      font: "playfair-display",
      radius: "large",
      baseColor: "olive",
      theme: "orange",
    });
    const result = parseCreateSearchParams(new URLSearchParams(), {
      fallbackPreset,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.font).toBe("playfair-display");
    expect(result.data.radius).toBe("large");
    expect(result.data.baseColor).toBe("olive");
    expect(result.data.theme).toBe("orange");
  });

  test("keeps URL preset precedence over the fallback preset", () => {
    const fallbackPreset = encodePreset({
      font: "playfair-display",
    });
    const urlPreset = encodePreset({
      font: "geist-mono",
    });
    const result = parseCreateSearchParams(
      new URLSearchParams({ preset: urlPreset }),
      { fallbackPreset },
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.font).toBe("geist-mono");
  });

  test("ignores an invalid fallback preset", () => {
    const result = parseCreateSearchParams(new URLSearchParams(), {
      fallbackPreset: "not-a-preset",
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toMatchObject({
      style: "juno",
      baseColor: "neutral",
      theme: "neutral",
      font: "geist",
      radius: "default",
      template: "astro",
      rtl: false,
    });
  });

  test("still takes template and rtl from the URL when restoring from the fallback preset", () => {
    const fallbackPreset = encodePreset({
      font: "playfair-display",
      radius: "large",
    });
    const result = parseCreateSearchParams(
      new URLSearchParams({
        template: "astro-monorepo",
        rtl: "true",
      }),
      { fallbackPreset },
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.font).toBe("playfair-display");
    expect(result.data.radius).toBe("large");
    expect(result.data.template).toBe("astro-monorepo");
    expect(result.data.rtl).toBe(true);
  });

  test("keeps explicit invalid URL presets as errors instead of silently falling back", () => {
    const fallbackPreset = encodePreset({
      font: "playfair-display",
    });
    const result = parseCreateSearchParams(
      new URLSearchParams({ preset: "invalid" }),
      { fallbackPreset },
    );

    expect(result).toEqual({
      success: false,
      error: "Invalid preset code.",
    });
  });
});
