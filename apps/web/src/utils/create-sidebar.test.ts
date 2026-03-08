import { describe, expect, it } from "bun:test";
import { TEMPLATE_VALUES, designSystemConfigSchema } from "@bejamas/create-config/browser";
import {
  CREATE_PICKER_LABELS,
  createRandomDesignSystemConfig,
  getCreatePickerOptions,
  getCreatePickerSelectedOption,
} from "@/utils/create-sidebar";

describe("create sidebar helpers", () => {
  it("exposes the expected customizer labels", () => {
    expect(CREATE_PICKER_LABELS.style).toBe("Style");
    expect(CREATE_PICKER_LABELS.baseColor).toBe("Base Color");
    expect(CREATE_PICKER_LABELS.template).toBe("Template");
  });

  it("derives theme options from the active base color", () => {
    const neutralOptions = getCreatePickerOptions({
      baseColor: "neutral",
      style: "bejamas",
    });
    const oliveOptions = getCreatePickerOptions({
      baseColor: "olive",
      style: "bejamas",
    });

    expect(neutralOptions.theme.some((option) => option.value === "olive")).toBe(false);
    expect(oliveOptions.theme.some((option) => option.value === "olive")).toBe(true);
  });

  it("keeps template options aligned with the supported template values", () => {
    const options = getCreatePickerOptions({
      baseColor: "neutral",
      style: "bejamas",
    });

    expect(options.template.map((option) => option.value)).toEqual(TEMPLATE_VALUES);
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
    });

    expect(config.template).toBe("astro-with-component-docs-monorepo");
    expect(config.rtl).toBe(true);
  });
});
