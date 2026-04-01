import * as culori from "culori";
import type { Hsl } from "culori";

type ColorFormat = "hex" | "rgb" | "hsl" | "oklch";

export const formatNumber = (num?: number) => {
  if (typeof num !== "number" || !Number.isFinite(num)) return "0";
  return num % 1 === 0 ? num : num.toFixed(4);
};

export const formatAlphaPercent = (alpha?: number) => {
  if (typeof alpha !== "number" || !Number.isFinite(alpha)) {
    return "";
  }

  if (alpha >= 1) {
    return "";
  }

  return ` / ${formatNumber(alpha * 100)}%`;
};

export const formatHsl = (hsl: Hsl) => {
  return `hsl(${formatNumber(hsl.h)} ${formatNumber(hsl.s * 100)}% ${formatNumber(hsl.l * 100)}%${formatAlphaPercent(hsl.alpha)})`;
};

export const formatOklch = (oklch: culori.Oklch) => {
  return `oklch(${formatNumber(oklch.l)} ${formatNumber(oklch.c)} ${formatNumber(oklch.h)}${formatAlphaPercent(oklch.alpha)})`;
};

export const colorFormatter = (
  colorValue: string,
  format: ColorFormat = "hsl",
  tailwindVersion: "3" | "4" = "3",
): string => {
  try {
    const color = culori.parse(colorValue);
    if (!color) throw new Error("Invalid color input");

    switch (format) {
      case "hsl": {
        const hsl = culori.converter("hsl")(color);
        if (tailwindVersion === "4") {
          return formatHsl(hsl);
        }
        return `${formatNumber(hsl.h)} ${formatNumber(hsl.s * 100)}% ${formatNumber(hsl.l * 100)}%`;
      }
      case "rgb":
        return culori.formatRgb(color); // e.g., "rgb(64, 128, 192)"
      case "oklch": {
        const oklch = culori.converter("oklch")(color);
        return formatOklch(oklch);
      }
      case "hex":
        return culori.formatHex(color); // e.g., "#4080c0"
      default:
        return colorValue;
    }
  } catch (error) {
    console.error(`Failed to convert color: ${colorValue}`, error);
    return colorValue;
  }
};

export const convertToHSL = (colorValue: string): string =>
  colorFormatter(colorValue, "hsl");
