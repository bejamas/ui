import { afterEach, describe, expect, test } from "bun:test";
import type { ThemeStyles } from "../types/theme";
import {
  HEADER_CUSTOM_PRESET_LABEL,
  HEADER_CUSTOM_PRESET_STORAGE_KEY,
  buildHeaderCustomPreset,
  getHeaderCustomPreset,
  isHeaderCustomPresetActive,
  setHeaderCustomPreset,
} from "./header-custom-preset";

const originalLocalStorage = globalThis.localStorage;

const styles = {
  light: {
    primary: "#D15B05",
    accent: "#E8F2F4",
    background: "#FFFFFF",
  },
  dark: {
    primary: "#F28A3A",
    accent: "#135E69",
    background: "#0A0A0A",
  },
} satisfies ThemeStyles;

afterEach(() => {
  globalThis.localStorage = originalLocalStorage;
});

describe("header custom preset", () => {
  test("builds a stable Custom Preset option from imported theme styles", () => {
    const preset = buildHeaderCustomPreset({
      id: "c2WNn9RMO",
      styles,
      themeRef: "custom-theme-42",
    });

    expect(preset?.label).toBe(HEADER_CUSTOM_PRESET_LABEL);
    expect(preset?.swatches.light.primary).toBe("#D15B05");
    expect(preset?.swatches.dark.accent).toBe("#135E69");
    expect(preset?.createHref).toBe(
      "/create?preset=c2WNn9RMO&themeRef=custom-theme-42",
    );
    expect(preset?.styles).toEqual(styles);
  });

  test("persists the full custom theme for restoring it after another selection", () => {
    const values = new Map<string, string>();
    globalThis.localStorage = {
      get length() {
        return values.size;
      },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => Array.from(values.keys())[index] ?? null,
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => {
        values.set(key, value);
      },
    } as Storage;

    setHeaderCustomPreset({
      id: "c2WNn9RMO",
      styles,
      themeRef: null,
    });

    expect(values.has(HEADER_CUSTOM_PRESET_STORAGE_KEY)).toBe(true);
    expect(getHeaderCustomPreset()).toMatchObject({
      id: "c2WNn9RMO",
      label: HEADER_CUSTOM_PRESET_LABEL,
      styles,
      themeRef: null,
    });
  });

  test("distinguishes a local custom theme from its curated seed", () => {
    const preset = buildHeaderCustomPreset({
      id: "c2WNn9RMO",
      styles,
      themeRef: null,
    });

    expect(
      isHeaderCustomPresetActive({
        preset,
        stored: { id: "c2WNn9RMO", name: HEADER_CUSTOM_PRESET_LABEL },
        themeRef: null,
      }),
    ).toBe(true);
    expect(
      isHeaderCustomPresetActive({
        preset,
        stored: { id: "c2WNn9RMO", name: "Juno - Public Sans" },
        themeRef: null,
      }),
    ).toBe(false);
  });
});
