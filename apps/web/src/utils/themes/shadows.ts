import { colorFormatter } from "./color-converter";
import { applyStyleToElement } from "./apply-style-to-element";
import type { ThemeEditorState } from "../types/editor";
import { defaultThemeState } from "./config";

export const legacy_getShadowMap = (themeEditorState: ThemeEditorState) => {
  const mode = themeEditorState.currentMode;
  const styles = {
    ...defaultThemeState.styles[mode],
    ...themeEditorState.styles[mode],
  };

  const shadowColor = styles["shadow-color"];
  const borderColor = styles["border"] || shadowColor;
  const surfaceColor = styles["card"] || styles["background"] || shadowColor;

  // Helper: parse oklch() string → [l, c, h]
  const parseOklch = (s: string) => {
    const m = colorFormatter(s, "oklch").match(/oklch\(([^)]+)\)/);
    if (!m) return [0, 0, 0];
    return m[1].split(/\s+/).map((x) => parseFloat(x));
  };
  // Compute automatic tint factor from border vs surface
  const computeAutoTint = (shadow: string, border: string, surface: string) => {
    const [ls, cs] = parseOklch(shadow);
    const [lb, cb, hb] = parseOklch(border);
    const [lf] = parseOklch(surface);
    const deltaL = Math.abs(lb - lf);
    const chroma = cb;
    const base = Math.max(0, (chroma - 0.04) * 2.2); // grows with chroma
    const contrast = Math.max(0, (deltaL - 0.08) * 1.25); // grows with lightness delta
    let t = Math.min(0.35, base + contrast);
    if (chroma < 0.03 && deltaL < 0.06) t = 0; // nearly neutral, skip
    if (lb > 0.9 && ls < 0.3) t *= 0.6; // very light border with dark shadow: soften
    return t;
  };

  const borderTint = computeAutoTint(shadowColor, borderColor, surfaceColor);
  const blendedColor =
    borderTint > 0
      ? colorFormatter(
          (() => {
            const from = colorFormatter(shadowColor, "oklch");
            const to = colorFormatter(borderColor, "oklch");
            const parse = (s: string) => {
              const m = s.match(/oklch\(([^)]+)\)/);
              if (!m) return [0, 0, 0];
              return m[1].split(/\s+/).map((x) => parseFloat(x));
            };
            const [l1, c1, h1] = parse(from);
            const [l2, c2, h2] = parse(to);
            const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
            const l = lerp(l1, l2, borderTint);
            const c = lerp(c1, c2, borderTint);
            const h = lerp(h1, h2, borderTint);
            return `oklch(${l} ${c} ${h})`;
          })(),
          "hsl",
          "3"
        )
      : colorFormatter(shadowColor, "hsl", "3");
  const hsl = blendedColor;
  const offsetX = styles["shadow-offset-x"];
  const offsetY = styles["shadow-offset-y"];
  const blur = styles["shadow-blur"];
  const spread = styles["shadow-spread"];
  const opacity = parseFloat(styles["shadow-opacity"]);
  const color = (opacityMultiplier: number) =>
    `hsl(${hsl} / ${(opacity * opacityMultiplier).toFixed(2)})`;

  const secondLayer = (fixedOffsetY: string, fixedBlur: string): string => {
    // Use the same offsetX as the first layer
    const offsetX2 = offsetX;
    // Use the fixed offsetY specific to the shadow size
    const offsetY2 = fixedOffsetY;
    // Use the fixed blur specific to the shadow size
    const blur2 = fixedBlur;
    // Calculate spread relative to the first layer's spread variable
    const spread2 =
      (parseFloat(spread?.replace("px", "") ?? "0") - 1).toString() + "px";
    // Use the same color function (opacity can still be overridden by --shadow-opacity)
    const color2 = color(1.0); // Default opacity for second layer is 0.1 in examples

    return `${offsetX2} ${offsetY2} ${blur2} ${spread2} ${color2}`;
  };

  // Map shadow names to their CSS variable string structures
  const shadowMap: { [key: string]: string } = {
    // Single layer shadows - use base variables directly
    "shadow-2xs": `${offsetX} ${offsetY} ${blur} ${spread} ${color(0.5)}`, // Assumes vars set appropriately (e.g., y=1, blur=0, spread=0)
    "shadow-xs": `${offsetX} ${offsetY} ${blur} ${spread} ${color(0.5)}`, // Assumes vars set appropriately (e.g., y=1, blur=2, spread=0)
    "shadow-2xl": `${offsetX} ${offsetY} ${blur} ${spread} ${color(2.5)}`, // Assumes vars set appropriately (e.g., y=25, blur=50, spread=-12)

    // Two layer shadows - use base vars for layer 1, mix fixed/calculated for layer 2
    "shadow-sm": `${offsetX} ${offsetY} ${blur} ${spread} ${color(
      1.0
    )}, ${secondLayer("1px", "2px")}`,
    shadow: `${offsetX} ${offsetY} ${blur} ${spread} ${color(1.0)}, ${secondLayer("1px", "2px")}`, // Alias for the 'shadow:' example line

    "shadow-md": `${offsetX} ${offsetY} ${blur} ${spread} ${color(
      1.0
    )}, ${secondLayer("2px", "4px")}`,

    "shadow-lg": `${offsetX} ${offsetY} ${blur} ${spread} ${color(
      1.0
    )}, ${secondLayer("4px", "6px")}`,

    "shadow-xl": `${offsetX} ${offsetY} ${blur} ${spread} ${color(
      1.0
    )}, ${secondLayer("8px", "10px")}`,
  };

  return shadowMap;
};

// Elevated/"better" shadows: two-layer model (key + ambient), Tailwind-style keys
// Keeps 2xs/xs minimal (single-layer), and scales blur/offset while reducing opacity
export const getShadowMap = (
  themeEditorState: ThemeEditorState,
  options?: {
    includeThirdLayer?: boolean; // reserved for future use
  }
) => {
  const mode = themeEditorState.currentMode;
  const styles = {
    ...defaultThemeState.styles[mode],
    ...themeEditorState.styles[mode],
  };

  const shadowColor = styles["shadow-color"];
  const borderColor = styles["border"] || shadowColor;
  const surfaceColor = styles["card"] || styles["background"] || shadowColor;
  const parseOklch = (s: string) => {
    const m = colorFormatter(s, "oklch").match(/oklch\(([^)]+)\)/);
    if (!m) return [0, 0, 0];
    return m[1].split(/\s+/).map((x) => parseFloat(x));
  };
  const computeAutoTint = (shadow: string, border: string, surface: string) => {
    const [ls, cs] = parseOklch(shadow);
    const [lb, cb] = parseOklch(border);
    const [lf] = parseOklch(surface);
    const deltaL = Math.abs(lb - lf);
    const chroma = cb;
    const base = Math.max(0, (chroma - 0.04) * 2.2);
    const contrast = Math.max(0, (deltaL - 0.08) * 1.25);
    let t = Math.min(0.35, base + contrast);
    if (chroma < 0.03 && deltaL < 0.06) t = 0;
    if (lb > 0.9 && ls < 0.3) t *= 0.6;
    return t;
  };
  const borderTint = computeAutoTint(shadowColor, borderColor, surfaceColor);
  const blendedColor =
    borderTint > 0
      ? colorFormatter(
          (() => {
            const from = colorFormatter(shadowColor, "oklch");
            const to = colorFormatter(borderColor, "oklch");
            const parse = (s: string) => {
              const m = s.match(/oklch\(([^)]+)\)/);
              if (!m) return [0, 0, 0];
              return m[1].split(/\s+/).map((x) => parseFloat(x));
            };
            const [l1, c1, h1] = parse(from);
            const [l2, c2, h2] = parse(to);
            const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
            const l = lerp(l1, l2, borderTint);
            const c = lerp(c1, c2, borderTint);
            const h = lerp(h1, h2, borderTint);
            return `oklch(${l} ${c} ${h})`;
          })(),
          "hsl",
          "3"
        )
      : colorFormatter(shadowColor, "hsl", "3");
  const hsl = blendedColor;
  const baseOffsetX = parseFloat(
    (styles["shadow-offset-x"] || "0").replace("px", "")
  );
  const baseOffsetY = parseFloat(
    (styles["shadow-offset-y"] || "1px").replace("px", "")
  );
  const baseBlur = parseFloat(
    (styles["shadow-blur"] || "2px").replace("px", "")
  );
  const baseSpread = parseFloat(
    (styles["shadow-spread"] || "0px").replace("px", "")
  );
  const baseOpacity = parseFloat(styles["shadow-opacity"]) || 0.15;
  // Dark-surface boost: if the surface is dark (low L), increase opacity and reduce blur
  const [surfaceL] = parseOklch(surfaceColor);
  const darkFactor = Math.max(0, Math.min(1, (0.5 - surfaceL) * 2));
  const effectiveBaseOpacity = Math.min(
    0.65,
    baseOpacity * (1 + 1.4 * darkFactor) + 0.05 * darkFactor
  );

  const color = (multiplier: number) =>
    `hsl(${hsl} / ${(effectiveBaseOpacity * multiplier).toFixed(2)})`;

  const toPx = (n: number) => `${Number(n.toFixed(1))}px`;

  // Light angle for subtle x-offset (in radians)
  const lightAngle = (25 * Math.PI) / 180;
  const xFromY = (oy: number) => oy * Math.tan(lightAngle) * 0.35;

  // Scaling helpers tuned for natural elevation
  const layerParams = {
    // key layer (closer, sharper)
    key: (scale: number) => {
      const oy = Math.max(0, baseOffsetY * scale);
      const ox = baseOffsetX + xFromY(oy);
      const blurMod = 1 - 0.35 * darkFactor;
      const blur = Math.max(0.5, baseBlur * Math.pow(scale, 1.35) * blurMod);
      const spread = baseSpread - Math.max(0, scale * 0.9) + 0.5 * darkFactor;
      const opacityMul = Math.max(0.18, 0.8 * Math.pow(0.88, scale));
      return { ox, oy, blur, spread, opacityMul };
    },
    // penumbra layer (between key and ambient)
    penumbra: (scale: number) => {
      const oy = Math.max(0.5, baseOffsetY * (scale * 0.8));
      const ox = baseOffsetX + xFromY(oy);
      const blurMod = 1 - 0.35 * darkFactor;
      const blur = Math.max(1, baseBlur * Math.pow(scale, 1.6) * blurMod);
      const spread = baseSpread - Math.max(0, scale * 0.7) + 0.5 * darkFactor;
      const opacityMul = Math.max(0.12, 0.35 * Math.pow(0.9, scale));
      return { ox, oy, blur, spread, opacityMul };
    },
    // ambient layer (wider, softer)
    ambient: (scale: number) => {
      const oy = Math.max(0.5, baseOffsetY * (scale * 0.5));
      const ox = baseOffsetX + xFromY(oy);
      const blurMod = 1 - 0.35 * darkFactor;
      const blur = Math.max(2, baseBlur * Math.pow(scale, 2.0) * blurMod);
      const spread = baseSpread - Math.max(0, scale * 1.1) + 0.5 * darkFactor;
      const opacityMul = Math.max(0.08, 0.26 * Math.pow(0.9, scale));
      return { ox, oy, blur, spread, opacityMul };
    },
  } as const;

  const compose = (s: ReturnType<typeof layerParams.key>) =>
    `${toPx(s.ox)} ${toPx(s.oy)} ${toPx(s.blur)} ${toPx(s.spread)} ${color(s.opacityMul)}`;

  const makeTwoLayer = (scale: number) => {
    const k = layerParams.key(scale);
    const a = layerParams.ambient(scale);
    return `${compose(k)}, ${compose(a)}`;
  };

  const makeThreeLayer = (scale: number) => {
    const k = layerParams.key(scale);
    const p = layerParams.penumbra(scale);
    const a = layerParams.ambient(scale);
    return `${compose(k)}, ${compose(p)}, ${compose(a)}`;
  };

  // Tailwind-style keys
  const shadowMap: { [key: string]: string } = {
    // Small sizes: minimal layers to avoid muddiness
    "shadow-2xs": (() => {
      const k = layerParams.key(0.35);
      return `${toPx(k.ox)} ${toPx(k.oy)} ${toPx(k.blur)} ${toPx(k.spread)} ${color(k.opacityMul)}`;
    })(),
    "shadow-xs": makeTwoLayer(0.6),

    // Natural progression
    "shadow-sm": makeTwoLayer(1.5),
    shadow: makeTwoLayer(1.0),
    "shadow-md": makeThreeLayer(1.5),
    "shadow-lg": makeThreeLayer(2.0),
    "shadow-xl": makeThreeLayer(2.8),
    "shadow-2xl": makeThreeLayer(3.6),
  };

  return shadowMap;
};

export function setElevatedShadowVariables(themeEditorState: ThemeEditorState) {
  const root = document.documentElement;
  const shadows = getShadowMap(themeEditorState);
  Object.entries(shadows).forEach(([name, value]) => {
    applyStyleToElement(root, name, value);
  });
}

// Function to set shadow CSS variables
export function setShadowVariables(themeEditorState: ThemeEditorState) {
  const root = document.documentElement;

  const shadows = getShadowMap(themeEditorState);
  Object.entries(shadows).forEach(([name, value]) => {
    applyStyleToElement(root, name, value);
  });
}
