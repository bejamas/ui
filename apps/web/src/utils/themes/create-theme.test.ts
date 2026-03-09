import { describe, expect, test } from "bun:test";
import { parseCssVariables } from "@/components/theme-editor/utils/themeEditorUtils";
import {
  emptyThemeOverrides,
  formatThemeTokenLabel,
  hasThemeOverrides,
  mergeThemeStyles,
} from "./create-theme";

describe("create theme helpers", () => {
  test("treats empty overrides as inactive", () => {
    expect(hasThemeOverrides(emptyThemeOverrides())).toBe(false);
  });

  test("merges light and dark token overrides onto baseline styles", () => {
    const merged = mergeThemeStyles(
      {
        light: {
          background: "oklch(1 0 0)",
          foreground: "oklch(0 0 0)",
        } as any,
        dark: {
          background: "oklch(0 0 0)",
          foreground: "oklch(1 0 0)",
        } as any,
      },
      {
        light: { background: "oklch(0.9 0 0)" },
        dark: { foreground: "oklch(0.8 0 0)" },
      },
    );

    expect(merged.light.background).toBe("oklch(0.9 0 0)");
    expect(merged.dark.foreground).toBe("oklch(0.8 0 0)");
  });

  test("parses footer tokens from imported css", () => {
    const parsed = parseCssVariables(`
      :root {
        --footer: oklch(0.2 0 0);
        --footer-border: oklch(0.4 0 0);
      }

      .dark {
        --footer-primary: oklch(0.7 0.1 30);
      }
    `);

    expect(parsed.light.footer).toBe("oklch(0.2 0 0)");
    expect(parsed.light["footer-border"]).toBe("oklch(0.4 0 0)");
    expect(parsed.dark["footer-primary"]).toBe("oklch(0.7 0.1 30)");
  });

  test("formats token labels for the theme panel", () => {
    expect(formatThemeTokenLabel("primary-foreground")).toBe(
      "Primary Foreground",
    );
    expect(formatThemeTokenLabel("chart-4")).toBe("Chart 4");
  });
});
