import type { ThemeStyles } from "../../../utils/types/theme";
import { colorFormatter } from "../../../utils/themes/color-converter";
import { normalizeThemeTokenValue } from "../../../utils/themes/theme-tokens";

const validTokens = new Set([
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "footer",
  "footer-foreground",
  "footer-primary",
  "footer-primary-foreground",
  "footer-border",
]);

export type ThemeStyleValues = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

export const convertColor = (
  color: string,
  format: "oklch" | "hsl" | "rgb" | "hex",
): string => {
  if (!color) return color;

  return colorFormatter(color, format, "4");
};

export const convertStyleColors = (
  styles: ThemeStyleValues,
  format: "oklch" | "hsl" | "rgb" | "hex",
): ThemeStyleValues => {
  const convertObj = (obj: Record<string, string>) => {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertColor(value, format);
    }
    return result;
  };

  return {
    light: convertObj(styles.light),
    dark: convertObj(styles.dark),
  };
};

export const generateCssExport = (styles: ThemeStyleValues, name: string) => {
  const lines: string[] = [];
  lines.push(`/* Theme: ${name || "Theme"} */`);
  lines.push("");

  lines.push(":root {");
  for (const [key, value] of Object.entries(styles.light)) {
    lines.push(`  --${key}: ${value};`);
  }
  lines.push("}");
  lines.push("");

  lines.push(".dark {");
  for (const [key, value] of Object.entries(styles.dark)) {
    lines.push(`  --${key}: ${value};`);
  }
  lines.push("}");

  return lines.join("\n");
};

export const parseCssVariables = (css: string): ThemeStyleValues => {
  const result: ThemeStyleValues = { light: {}, dark: {} };

  const rootMatch =
    css.match(/:root\s*\{([^}]+)\}/s) || css.match(/html\s*\{([^}]+)\}/s);
  if (rootMatch) {
    extractVariables(rootMatch[1], result.light);
  }

  const darkMatch =
    css.match(/\.dark\s*\{([^}]+)\}/s) ||
    css.match(/html\.dark\s*\{([^}]+)\}/s) ||
    css.match(/:root\.dark\s*\{([^}]+)\}/s) ||
    css.match(/\[data-theme="dark"\]\s*\{([^}]+)\}/s);
  if (darkMatch) {
    extractVariables(darkMatch[1], result.dark);
  }

  return result;
};

export const extractVariables = (
  block: string,
  target: Record<string, string>,
) => {
  const varRegex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let match;

  while ((match = varRegex.exec(block)) !== null) {
    const name = match[1].trim();
    let value = match[2].trim();

    if (!validTokens.has(name)) continue;

    const hslSpacePattern =
      /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/;
    const hslMatch = value.match(hslSpacePattern);

    if (hslMatch) {
      const [, h, s, l] = hslMatch;
      value = `hsl(${h} ${s}% ${l}%)`;
    }

    target[name] = normalizeThemeTokenValue(name, value);
  }
};

export const buildCliCommand = (args: {
  presetName: string;
  shortId: string | null;
  pm: "pnpm" | "npm" | "yarn" | "bun";
}) => {
  if (!args.shortId) {
    return "Share your theme first to get the CLI command";
  }

  const slug = args.presetName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const registryUrl = `https://ui.bejamas.com/r/themes/${slug}-${args.shortId}.json`;

  const commands: Record<string, string> = {
    pnpm: `pnpm dlx shadcn@latest add ${registryUrl}`,
    npm: `npx shadcn@latest add ${registryUrl}`,
    yarn: `yarn dlx shadcn@latest add ${registryUrl}`,
    bun: `bunx shadcn@latest add ${registryUrl}`,
  };

  return commands[args.pm] || commands.bun;
};

export const toThemeStyleValues = (
  styles: ThemeStyles,
): ThemeStyleValues => ({
  light: styles.light as Record<string, string>,
  dark: styles.dark as Record<string, string>,
});
