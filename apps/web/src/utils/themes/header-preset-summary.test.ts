import { describe, expect, test } from "bun:test";
import { encodePreset } from "@bejamas/create-config/browser";
import { buildHeaderPresetSwitcherState } from "./header-preset-switcher";
import {
  resolveHeaderPresetSelection,
  getThemeSwatchesFromStyles,
} from "./header-preset-summary";

describe("header preset summary", () => {
  test("keeps shuffled preset create links and cookie swatches before runtime boot", () => {
    const baseState = buildHeaderPresetSwitcherState({});
    const shuffled = encodePreset({
      style: "vega",
      baseColor: "olive",
      theme: "amber",
      font: "geist",
      menuColor: "default",
      menuAccent: "subtle",
      radius: "default",
      iconLibrary: "lucide",
      fontHeading: "inherit",
    });
    const swatches = getThemeSwatchesFromStyles({
      light: {
        primary: "oklch(0.62 0.18 82)",
        accent: "oklch(0.81 0.15 100)",
      },
      dark: {
        primary: "oklch(0.93 0.01 0)",
        accent: "oklch(0.74 0.14 92)",
      },
    } as any);

    const selection = resolveHeaderPresetSelection({
      current: baseState.current,
      presets: baseState.presets,
      stored: {
        id: shuffled,
        swatches,
        name: "Vega - Geist",
      },
      themeRef: "custom-theme-42",
    });

    expect(selection.selectedPresetId).toBeNull();
    expect(selection.summary?.label).toBe("Vega - Geist");
    expect(selection.summary?.swatches.light.primary).toBe(swatches.primaryLight);
    expect(selection.summary?.createHref).toBe(
      `/create?preset=${encodeURIComponent(shuffled)}&themeRef=custom-theme-42`,
    );
  });

  test("falls back to local custom presets when only the preset id is stored", () => {
    const baseState = buildHeaderPresetSwitcherState({});

    const selection = resolveHeaderPresetSelection({
      current: baseState.current,
      presets: baseState.presets,
      stored: {
        id: "custom-test",
      },
      themeRef: null,
      customPresets: {
        "custom-test": {
          name: "My Preset",
          styles: {
            light: {
              primary: "oklch(0.5 0.2 260)",
              accent: "oklch(0.7 0.15 90)",
            },
            dark: {
              primary: "oklch(0.96 0.02 260)",
              accent: "oklch(0.82 0.12 90)",
            },
          } as any,
        },
      },
    });

    expect(selection.selectedPresetId).toBeNull();
    expect(selection.summary?.label).toBe("My Preset");
    expect(selection.summary?.swatches.light.primary).toBe("oklch(0.5 0.2 260)");
    expect(selection.summary?.createHref).toBe("/create");
  });
});
