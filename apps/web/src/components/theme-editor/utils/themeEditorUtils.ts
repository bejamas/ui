import type { ThemeStyleProps } from "../../../utils/types/theme";

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

  const oklchMatch = color.match(
    /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/i,
  );

  if (!oklchMatch) return color;

  const L = parseFloat(oklchMatch[1]);
  const C = parseFloat(oklchMatch[2]);
  const H = parseFloat(oklchMatch[3]);
  const alpha = oklchMatch[4] ? parseFloat(oklchMatch[4]) : 1;

  if (format === "oklch") return color;

  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  let rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toSrgb = (c: number) => {
    c = Math.max(0, Math.min(1, c));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  let r = Math.round(toSrgb(rLin) * 255);
  let g = Math.round(toSrgb(gLin) * 255);
  let bl = Math.round(toSrgb(bLin) * 255);

  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  bl = Math.max(0, Math.min(255, bl));

  if (format === "hex") {
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    if (alpha < 1) {
      return `#${toHex(r)}${toHex(g)}${toHex(bl)}${toHex(Math.round(alpha * 255))}`;
    }
    return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
  }

  if (format === "rgb") {
    if (alpha < 1) {
      return `rgb(${r} ${g} ${bl} / ${alpha})`;
    }
    return `rgb(${r} ${g} ${bl})`;
  }

  if (format === "hsl") {
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = bl / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const lum = (max + min) / 2;

    let hue = 0;
    let sat = 0;

    if (max !== min) {
      const d = max - min;
      sat = lum > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case rNorm:
          hue = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
          break;
        case gNorm:
          hue = ((bNorm - rNorm) / d + 2) / 6;
          break;
        case bNorm:
          hue = ((rNorm - gNorm) / d + 4) / 6;
          break;
      }
    }

    const hDeg = Math.round(hue * 360);
    const sPct = Math.round(sat * 100);
    const lPct = Math.round(lum * 100);

    if (alpha < 1) {
      return `hsl(${hDeg} ${sPct}% ${lPct}% / ${alpha})`;
    }
    return `hsl(${hDeg} ${sPct}% ${lPct}%)`;
  }

  return color;
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

    target[name] = value;
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
  styles: ThemeStyleProps,
): ThemeStyleValues => ({
  light: styles.light as Record<string, string>,
  dark: styles.dark as Record<string, string>,
});
