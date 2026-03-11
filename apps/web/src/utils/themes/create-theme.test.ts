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

    expect(merged.light.background).toContain("oklch(0.9");
    expect(merged.dark.foreground).toContain("oklch(0.8");
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

    expect(parsed.light.footer).toContain("oklch(0.2");
    expect(parsed.light["footer-border"]).toContain("oklch(0.4");
    expect(parsed.dark["footer-primary"]).toContain("oklch(0.7");
  });

  test("normalizes imported hsl tokens to oklch", () => {
    const parsed = parseCssVariables(`
      :root {
        --primary: hsl(240 5% 84%);
      }

      .dark {
        --primary: 240 5% 84%;
      }
    `);

    expect(parsed.light.primary).toContain("oklch(");
    expect(parsed.dark.primary).toContain("oklch(");
  });

  test("formats token labels for the theme panel", () => {
    expect(formatThemeTokenLabel("primary-foreground")).toBe(
      "Primary Foreground",
    );
    expect(formatThemeTokenLabel("chart-4")).toBe("Chart 4");
  });
});
