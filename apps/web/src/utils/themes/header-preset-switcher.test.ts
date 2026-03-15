import { describe, expect, test } from "bun:test";
import { encodePreset } from "@bejamas/create-config/server";
import { buildHeaderPresetSwitcherState } from "./header-preset-switcher";

describe("header preset switcher state", () => {
  test("builds the curated presets with Style - Font labels", () => {
    const state = buildHeaderPresetSwitcherState({});

    expect(state.current.label).toBe("Juno - Inter");
    expect(state.presets.map((preset) => preset.label)).toEqual([
      "Juno - Inter",
      "Vega - Playfair Display",
      "Lyra - Geist Mono",
    ]);
    expect(state.presets[0]?.createHref).toMatch(/^\/create\?preset=/);
  });

  test("resolves encoded create presets with theme-ref overrides", () => {
    const preset = encodePreset({
      style: "juno",
      baseColor: "neutral",
      theme: "indigo",
      font: "geist",
    });
    const state = buildHeaderPresetSwitcherState({
      themeCookieValue: preset,
      themeRef: "custom-theme-42",
      themeOverrides: {
        light: {
          primary: "oklch(0.51 0.2 284)",
          accent: "oklch(0.74 0.16 64)",
        },
        dark: {
          primary: "oklch(0.93 0.01 0)",
          accent: "oklch(0.67 0.22 30)",
        },
      },
    });

    expect(state.current.label).toBe("Juno - Geist");
    expect(state.current.swatches.light.primary).toContain("0.5100 0.2000 284");
    expect(state.current.swatches.light.accent).toContain("0.7400 0.1600 64");
    expect(state.current.swatches.dark.primary).toContain("0.9300 0.0100 0");
    expect(state.current.themeRef).toBe("custom-theme-42");
    expect(state.selectedPresetId).toBeNull();
  });

  test("falls back gracefully for legacy preset cookies", () => {
    const state = buildHeaderPresetSwitcherState({
      themeCookieValue: "rome",
    });

    expect(state.current.label).toBe("Rome");
    expect(state.current.createHref).toBe("/create");
    expect(state.current.swatches.light.primary).toBeTruthy();
    expect(state.selectedPresetId).toBeNull();
  });
});
