import { describe, expect, test } from "bun:test";
import { encodePreset } from "@bejamas/create-config/server";
import {
  buildCreatePreviewUrl,
  parseCreateSearchParams,
  resolveCreatePreviewTarget,
  resolveCreateThemeRef,
} from "./create";

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
      theme: "bejamas-blue",
      font: "inter",
      fontHeading: "inherit",
      radius: "default",
      rtl: false,
      rtlLanguage: "ar",
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

  test("lets an explicit fontHeading query param override a decoded preset", () => {
    const preset = encodePreset({
      font: "inter",
      fontHeading: "inherit",
      theme: "neutral",
    });
    const result = parseCreateSearchParams(
      new URLSearchParams({
        preset,
        fontHeading: "playfair-display",
      }),
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.font).toBe("inter");
    expect(result.data.fontHeading).toBe("playfair-display");
  });

  test("normalizes fontHeading back to inherit when it matches the body font", () => {
    const preset = encodePreset({
      font: "inter",
      fontHeading: "playfair-display",
      theme: "neutral",
    });
    const result = parseCreateSearchParams(
      new URLSearchParams({
        preset,
        fontHeading: "inter",
      }),
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.font).toBe("inter");
    expect(result.data.fontHeading).toBe("inherit");
  });

  test("normalizes locked Lyra radius values from preset codes", () => {
    const result = parseCreateSearchParams(
      new URLSearchParams({ preset: "awNgr9d" }),
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.style).toBe("lyra");
    expect(result.data.radius).toBe("none");
  });

  test("accepts modern shadcn b-codes with longer font catalogs", () => {
    const result = parseCreateSearchParams(
      new URLSearchParams({ preset: "b4aRK5K0fb" }),
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.preset).toBe("b4aRK5K0fb");
    expect(result.data).toMatchObject({
      style: "maia",
      baseColor: "mauve",
      theme: "emerald",
      iconLibrary: "hugeicons",
      font: "ibm-plex-sans",
      fontHeading: "merriweather",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "inverted-translucent",
    });
  });

  test("does not preserve the raw preset string when URL params override preset fields", () => {
    const result = parseCreateSearchParams(
      new URLSearchParams({
        preset: "b4aRK5K0fb",
        fontHeading: "playfair-display",
      }),
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.preset).toBeNull();
    expect(result.data.fontHeading).toBe("playfair-display");
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
      theme: "bejamas-blue",
      font: "inter",
      fontHeading: "inherit",
      radius: "default",
      rtl: false,
      rtlLanguage: "ar",
    });
  });

  test("ignores template, rtl, and lang when restoring from the fallback preset", () => {
    const fallbackPreset = encodePreset({
      font: "playfair-display",
      radius: "large",
    });
    const result = parseCreateSearchParams(
      new URLSearchParams({
        template: "astro-monorepo",
        rtl: "true",
        lang: "he",
      }),
      { fallbackPreset },
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.font).toBe("playfair-display");
    expect(result.data.radius).toBe("large");
    expect(result.data.template).toBe("astro");
    expect(result.data.rtl).toBe(false);
    expect(result.data.rtlLanguage).toBe("ar");
  });

  test("ignores lang entirely in the create flow", () => {
    const result = parseCreateSearchParams(
      new URLSearchParams({
        lang: "fa",
      }),
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.rtl).toBe(false);
    expect(result.data.rtlLanguage).toBe("ar");
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

  test("restores themeRef from the URL before the cookie fallback", () => {
    expect(
      resolveCreateThemeRef(
        new URLSearchParams({ themeRef: "custom-url-123" }),
        { fallbackThemeRef: "custom-cookie-456" },
      ),
    ).toBe("custom-url-123");
  });

  test("restores themeRef from the fallback cookie when the URL is empty", () => {
    expect(
      resolveCreateThemeRef(new URLSearchParams(), {
        fallbackThemeRef: "custom-cookie-456",
      }),
    ).toBe("custom-cookie-456");
  });

  test("ignores invalid themeRef values", () => {
    expect(
      resolveCreateThemeRef(new URLSearchParams({ themeRef: "rome" }), {
        fallbackThemeRef: "default",
      }),
    ).toBeNull();
  });

  test("resolves a valid kitchen-sink preview target from the URL", () => {
    expect(
      resolveCreatePreviewTarget(
        new URLSearchParams({ item: "button-example" }),
      ),
    ).toBe("button");
  });

  test("still accepts unsuffixed preview targets for compatibility", () => {
    expect(
      resolveCreatePreviewTarget(new URLSearchParams({ item: "button" })),
    ).toBe("button");
  });

  test("falls back to the default create preview for invalid preview targets", () => {
    expect(
      resolveCreatePreviewTarget(new URLSearchParams({ item: "not-real" })),
    ).toBeNull();
  });

  test("builds the default create preview iframe URL when no preview target is set", () => {
    const preset = encodePreset({
      style: "juno",
      baseColor: "neutral",
      theme: "neutral",
    });

    expect(
      buildCreatePreviewUrl(
        {
          style: "juno",
          baseColor: "neutral",
          theme: "neutral",
          iconLibrary: "lucide",
          font: "geist",
          fontHeading: "inherit",
          radius: "default",
          menuAccent: "subtle",
          menuColor: "default",
          template: "astro",
          rtl: false,
          rtlLanguage: "ar",
        },
        preset,
      ),
    ).toBe(`/create/preview?preset=${preset}`);
  });

  test("builds an embed-mode kitchen-sink URL when a preview target is set", () => {
    const preset = encodePreset({
      style: "lyra",
      baseColor: "olive",
      theme: "orange",
      font: "geist",
      radius: "default",
      iconLibrary: "lucide",
      menuAccent: "subtle",
      menuColor: "default",
    });

    expect(
      buildCreatePreviewUrl(
        {
          style: "lyra",
          baseColor: "olive",
          theme: "orange",
          iconLibrary: "lucide",
          font: "geist",
          fontHeading: "inherit",
          radius: "default",
          menuAccent: "subtle",
          menuColor: "default",
          template: "astro",
          rtl: true,
          rtlLanguage: "he",
        },
        preset,
        {
          previewTarget: "select",
          themeRef: "custom-theme-123",
        },
      ),
    ).toBe(
      `/kitchen-sink/select?preset=${preset}&themeRef=custom-theme-123&embed=create`,
    );
  });
});
