import { describe, expect, it } from "bun:test";
import {
  TEMPLATE_VALUES,
  designSystemConfigSchema,
} from "@bejamas/create-config/browser";
import {
  CREATE_FONT_GROUPS,
  CREATE_LOCKABLE_PARAMS,
  CREATE_PICKER_LABELS,
  CREATE_PICKER_GROUP_LABELS,
  createRandomDesignSystemConfig,
  getFontGroupForFontValue,
  getCreatePickerOptions,
  getCreatePickerSelectedOption,
  getFontValuesForGroup,
  hasCreateLockableParam,
  isCreateFontGroup,
} from "@/utils/create-sidebar";

function withMockedRandom<T>(value: number, run: () => T) {
  const originalRandom = Math.random;
  Math.random = () => value;

  try {
    return run();
  } finally {
    Math.random = originalRandom;
  }
}

describe("create sidebar helpers", () => {
  it("exposes the expected customizer labels", () => {
    expect(CREATE_PICKER_LABELS.style).toBe("Style");
    expect(CREATE_PICKER_LABELS.baseColor).toBe("Base Color");
    expect(CREATE_PICKER_LABELS.template).toBe("Template");
    expect(CREATE_PICKER_LABELS.rtlLanguage).toBe("Language");
  });

  it("derives theme options from the active base color", () => {
    const neutralOptions = getCreatePickerOptions({
      baseColor: "neutral",
      style: "juno",
    });
    const oliveOptions = getCreatePickerOptions({
      baseColor: "olive",
      style: "juno",
    });

    expect(
      neutralOptions.theme.some((option) => option.value === "olive"),
    ).toBe(false);
    expect(
      neutralOptions.theme.some((option) => option.value === "bejamas-blue"),
    ).toBe(true);
    expect(
      neutralOptions.theme.some(
        (option) => option.value === "bejamas-neon-yellow",
      ),
    ).toBe(true);
    expect(oliveOptions.theme.some((option) => option.value === "olive")).toBe(
      true,
    );
    expect(
      oliveOptions.theme.some((option) => option.value === "bejamas-blue"),
    ).toBe(true);
    expect(
      oliveOptions.theme.some(
        (option) => option.value === "bejamas-neon-yellow",
      ),
    ).toBe(true);
  });

  it("keeps template options aligned with the supported template values", () => {
    const options = getCreatePickerOptions({
      baseColor: "neutral",
      style: "juno",
    });

    expect(options.template.map((option) => option.value)).toEqual(
      TEMPLATE_VALUES,
    );
  });

  it("exposes the supported RTL language options", () => {
    const options = getCreatePickerOptions({
      baseColor: "neutral",
      style: "juno",
    });

    expect(options.rtlLanguage).toEqual([
      { value: "ar", label: "Arabic", markerValue: "ar" },
      { value: "fa", label: "Persian", markerValue: "fa" },
      { value: "he", label: "Hebrew", markerValue: "he" },
    ]);
  });

  it("uses a style-linked default marker for the radius picker", () => {
    const lyraOptions = getCreatePickerOptions({
      baseColor: "neutral",
      style: "lyra",
    });
    const maiaOptions = getCreatePickerOptions({
      baseColor: "neutral",
      style: "maia",
    });

    expect(lyraOptions.radius[0]).toMatchObject({
      value: "default",
      label: "Style default",
      markerValue: "none",
    });
    expect(maiaOptions.radius[0]).toMatchObject({
      value: "default",
      label: "Style default",
      markerValue: "large",
    });
  });

  it("exposes grouped style options with descriptions", () => {
    const options = getCreatePickerOptions({
      baseColor: "neutral",
      style: "juno",
    });

    expect(CREATE_PICKER_GROUP_LABELS.bejamas).toBe("Bejamas");
    expect(CREATE_PICKER_GROUP_LABELS.shadcn).toBe("shadcn");
    expect(options.style[0]).toMatchObject({
      value: "juno",
      label: "Juno",
      group: "bejamas",
      description: "Balanced and versatile baseline for Bejamas interfaces.",
    });
    expect(
      options.style.filter((option) => option.group === "shadcn").length,
    ).toBeGreaterThan(0);
    expect(options.style.every((option) => Boolean(option.description))).toBe(
      true,
    );
  });

  it("groups font options by font family category", () => {
    const options = getCreatePickerOptions({
      baseColor: "neutral",
      style: "juno",
    });

    expect(CREATE_PICKER_GROUP_LABELS.sans).toBe("Sans Serif");
    expect(CREATE_PICKER_GROUP_LABELS.serif).toBe("Serif");
    expect(CREATE_PICKER_GROUP_LABELS.mono).toBe("Monospace");

    expect(
      options.font.find((option) => option.value === "inter"),
    ).toMatchObject({
      group: "sans",
    });
    expect(
      options.font.find((option) => option.value === "playfair-display"),
    ).toMatchObject({
      group: "serif",
    });
    expect(
      options.font.find((option) => option.value === "jetbrains-mono"),
    ).toMatchObject({
      group: "mono",
    });

    expect(options.font.map((option) => option.group)).toEqual([
      ...Array(10).fill("sans"),
      ...Array(5).fill("serif"),
      ...Array(2).fill("mono"),
    ]);
  });

  it("exposes font-group helpers for the grouped font picker", () => {
    expect(CREATE_FONT_GROUPS).toEqual(["sans", "serif", "mono"]);
    expect(isCreateFontGroup("sans")).toBe(true);
    expect(isCreateFontGroup("display")).toBe(false);
    expect(getFontGroupForFontValue("inter")).toBe("sans");
    expect(getFontGroupForFontValue("merriweather")).toBe("serif");
    expect(getFontGroupForFontValue("geist-mono")).toBe("mono");
    expect(getFontGroupForFontValue("missing-font")).toBeNull();
    expect(getFontValuesForGroup("sans")).toContain("inter");
    expect(getFontValuesForGroup("serif")).toContain("playfair-display");
    expect(getFontValuesForGroup("mono")).toContain("jetbrains-mono");
  });

  it("shows the effective synced radius while default mode is active", () => {
    expect(
      getCreatePickerSelectedOption("radius", {
        baseColor: "neutral",
        style: "lyra",
        radius: "default",
      }),
    ).toMatchObject({
      value: "default",
      label: "None",
      markerValue: "none",
    });

    expect(
      getCreatePickerSelectedOption("radius", {
        baseColor: "neutral",
        style: "maia",
        radius: "default",
      }),
    ).toMatchObject({
      value: "default",
      label: "Large",
      markerValue: "large",
    });
  });

  it("keeps explicit radius overrides when a style changes", () => {
    expect(
      getCreatePickerSelectedOption("radius", {
        baseColor: "neutral",
        style: "lyra",
        radius: "large",
      }),
    ).toMatchObject({
      value: "large",
      label: "Large",
    });
  });

  it("exposes all four menu color options", () => {
    const options = getCreatePickerOptions({
      baseColor: "neutral",
      style: "juno",
    });

    expect(options.menuColor.map((option) => option.value)).toEqual([
      "default",
      "inverted",
      "default-translucent",
      "inverted-translucent",
    ]);
  });

  it("builds random configs that satisfy the schema", () => {
    for (let index = 0; index < 25; index += 1) {
      const result = designSystemConfigSchema.safeParse(
        createRandomDesignSystemConfig(),
      );

      expect(result.success).toBe(true);
    }
  });

  it("keeps sticky template and rtl values during shuffle", () => {
    const config = createRandomDesignSystemConfig({
      template: "astro-with-component-docs-monorepo",
      rtl: true,
      rtlLanguage: "he",
    });

    expect(config.template).toBe("astro-with-component-docs-monorepo");
    expect(config.rtl).toBe(true);
    expect(config.rtlLanguage).toBe("he");
  });

  it("exposes the supported lockable params", () => {
    expect(CREATE_LOCKABLE_PARAMS).toEqual([
      "style",
      "baseColor",
      "theme",
      "iconLibrary",
      "font",
      "radius",
      "menuColor",
      "menuAccent",
    ]);
    expect(hasCreateLockableParam("theme")).toBe(true);
    expect(hasCreateLockableParam("rtlLanguage")).toBe(false);
  });

  it("preserves locked fields during shuffle", () => {
    const config = withMockedRandom(0, () =>
      createRandomDesignSystemConfig(
        {
          style: "mira",
          baseColor: "olive",
          theme: "orange",
          iconLibrary: "remixicon",
          font: "playfair-display",
          radius: "large",
          menuColor: "inverted",
          menuAccent: "bold",
          template: "astro",
          rtl: false,
          rtlLanguage: "ar",
        },
        {
          locked: ["style", "font", "menuColor"],
        },
      ),
    );

    expect(config.style).toBe("mira");
    expect(config.font).toBe("playfair-display");
    expect(config.menuColor).toBe("inverted");
    expect(config.baseColor).toBe("neutral");
  });

  it("constrains shuffled fonts to the locked font group when the row lock is off", () => {
    const config = withMockedRandom(0.99, () =>
      createRandomDesignSystemConfig(
        {
          style: "juno",
          baseColor: "neutral",
          theme: "neutral",
          iconLibrary: "lucide",
          font: "inter",
          radius: "default",
          menuColor: "default",
          menuAccent: "subtle",
          template: "astro",
          rtl: false,
          rtlLanguage: "ar",
        },
        {
          lockedFontGroup: "mono",
        },
      ),
    );

    expect(getFontGroupForFontValue(config.font)).toBe("mono");
  });

  it("lets the row-level font lock win over a locked font group", () => {
    const config = withMockedRandom(0.99, () =>
      createRandomDesignSystemConfig(
        {
          style: "juno",
          baseColor: "neutral",
          theme: "neutral",
          iconLibrary: "lucide",
          font: "inter",
          radius: "default",
          menuColor: "default",
          menuAccent: "subtle",
          template: "astro",
          rtl: false,
          rtlLanguage: "ar",
        },
        {
          locked: ["font"],
          lockedFontGroup: "mono",
        },
      ),
    );

    expect(config.font).toBe("inter");
  });

  it("keeps the base color when theme is locked to a base theme", () => {
    const config = withMockedRandom(0, () =>
      createRandomDesignSystemConfig(
        {
          style: "juno",
          baseColor: "olive",
          theme: "olive",
          iconLibrary: "lucide",
          font: "geist",
          radius: "default",
          menuColor: "default",
          menuAccent: "subtle",
          template: "astro",
          rtl: false,
          rtlLanguage: "ar",
        },
        {
          locked: ["theme"],
        },
      ),
    );

    expect(config.baseColor).toBe("olive");
    expect(config.theme).toBe("olive");
  });

  it("keeps the base color when theme is locked with a custom theme", () => {
    const config = withMockedRandom(0, () =>
      createRandomDesignSystemConfig(
        {
          style: "juno",
          baseColor: "olive",
          theme: "orange",
          iconLibrary: "lucide",
          font: "geist",
          radius: "default",
          menuColor: "default",
          menuAccent: "subtle",
          template: "astro",
          rtl: false,
          rtlLanguage: "ar",
        },
        {
          locked: ["theme"],
          hasCustomTheme: true,
        },
      ),
    );

    expect(config.baseColor).toBe("olive");
    expect(config.theme).toBe("orange");
  });

  it("avoids translucent menus when bold accent is locked", () => {
    const config = withMockedRandom(0.99, () =>
      createRandomDesignSystemConfig(
        {
          style: "juno",
          baseColor: "neutral",
          theme: "neutral",
          iconLibrary: "lucide",
          font: "geist",
          radius: "default",
          menuColor: "default",
          menuAccent: "bold",
          template: "astro",
          rtl: false,
          rtlLanguage: "ar",
        },
        {
          locked: ["menuAccent"],
        },
      ),
    );

    expect(config.menuAccent).toBe("bold");
    expect(config.menuColor.endsWith("-translucent")).toBe(false);
  });

  it("forces subtle accent when menu color is locked to translucent", () => {
    const config = withMockedRandom(0.99, () =>
      createRandomDesignSystemConfig(
        {
          style: "juno",
          baseColor: "neutral",
          theme: "neutral",
          iconLibrary: "lucide",
          font: "geist",
          radius: "default",
          menuColor: "default-translucent",
          menuAccent: "bold",
          template: "astro",
          rtl: false,
          rtlLanguage: "ar",
        },
        {
          locked: ["menuColor"],
        },
      ),
    );

    expect(config.menuColor).toBe("default-translucent");
    expect(config.menuAccent).toBe("subtle");
  });
});
