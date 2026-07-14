import { describe, expect, test } from "bun:test";
import { parseCssVariables } from "@/components/theme-editor/utils/themeEditorUtils";
import {
  CREATE_THEME_GROUP_LABELS,
  emptyThemeOverrides,
  formatThemeTokenLabel,
  getCreateThemeImagePreset,
  getCreateThemeSeedGroups,
  getCreateThemeSeedOption,
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

  test("imports radius and font tokens from pasted CSS", () => {
    const parsed = parseCssVariables(`
      :root {
        --background: #FFFFFF;
        --foreground: #0A0A0A;
        --card: #FFFFFF;
        --card-foreground: #0A0A0A;
        --popover: #FFFFFF;
        --popover-foreground: #0A0A0A;
        --primary: #D15B05;
        --primary-foreground: #FFFFFF;
        --secondary: #F3F6F8;
        --secondary-foreground: #0A0A0A;
        --muted: #F3F6F8;
        --muted-foreground: #5F6068;
        --accent: #E8F2F4;
        --accent-foreground: #036093;
        --destructive: #C0392B;
        --destructive-foreground: #FFFFFF;
        --border: #D5D9DE;
        --input: #D5D9DE;
        --ring: #D15B05;
        --chart-1: #D15B05;
        --chart-2: #28A9E0;
        --chart-3: #036093;
        --chart-4: #135E69;
        --chart-5: #D83269;
        --sidebar: #FFFFFF;
        --sidebar-foreground: #0A0A0A;
        --sidebar-primary: #D15B05;
        --sidebar-primary-foreground: #FFFFFF;
        --sidebar-accent: #F3F6F8;
        --sidebar-accent-foreground: #0A0A0A;
        --sidebar-border: #D5D9DE;
        --sidebar-ring: #D15B05;
        --radius: 0.5rem;
        --font-sans: “Helvetica Now Display”, Helvetica, Arial, sans-serif;
      }
    `);

    expect(Object.keys(parsed.light)).toHaveLength(34);
    expect(parsed.light.primary).toContain("oklch(");
    expect(parsed.light.radius).toBe("0.5rem");
    expect(parsed.light["font-sans"]).toBe(
      '"Helvetica Now Display", Helvetica, Arial, sans-serif',
    );
  });

  test("formats token labels for the theme panel", () => {
    expect(formatThemeTokenLabel("primary-foreground")).toBe(
      "Primary Foreground",
    );
    expect(formatThemeTokenLabel("chart-4")).toBe("Chart 4");
  });

  test("groups curated theme seeds ahead of tailwind seeds", () => {
    const groups = getCreateThemeSeedGroups("neutral");

    expect(CREATE_THEME_GROUP_LABELS.bejamas).toBe("Bejamas");
    expect(CREATE_THEME_GROUP_LABELS.tailwind).toBe("Tailwind");
    expect(groups.map((group) => group.group)).toEqual(["bejamas", "tailwind"]);
    expect(groups[0]?.options.map((option) => option.value)).toEqual([
      "bejamas-blue",
      "bejamas-neon-yellow",
      "bejamas-apple",
      "bejamas-orange",
      "bejamas-sunflower",
      "bejamas-violet",
      "bejamas-turquoise",
      "bejamas-magenta",
    ]);
    expect(groups[1]?.options.some((option) => option.value === "blue")).toBe(
      true,
    );
  });

  test("resolves the curated blue seed option", () => {
    expect(getCreateThemeSeedOption("neutral", "bejamas-blue")).toMatchObject({
      value: "bejamas-blue",
      label: "Marine",
      color: "oklch(0.4634 0.2647 264.76)",
      group: "bejamas",
    });

    expect(
      getCreateThemeSeedOption("neutral", "bejamas-neon-yellow"),
    ).toMatchObject({
      value: "bejamas-neon-yellow",
      label: "Lime",
      color: "oklch(91.98% 0.1905 128.5)",
      group: "bejamas",
    });
  });

  test("builds preset image metadata for built-in theme seeds", () => {
    expect(getCreateThemeImagePreset("bejamas-blue")).toEqual({
      value: "bejamas-blue",
      label: "Marine",
      slug: "marine",
      group: "bejamas",
      url: "https://gradient.bejamas.com/presets/bejamas/marine.png",
    });

    expect(getCreateThemeImagePreset("amber")).toEqual({
      value: "amber",
      label: "Amber",
      slug: "amber",
      group: "tailwind",
      url: "https://gradient.bejamas.com/presets/tailwind/amber.png",
    });

    expect(getCreateThemeImagePreset("custom-theme-42")).toBeNull();
  });
});
