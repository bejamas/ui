import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DesignSystemConfig } from "./config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type CachedCss = {
  mtimeMs: number;
  value: string;
};

const styleCssCache = new Map<string, CachedCss>();

export function getStyleFilepath(style: DesignSystemConfig["style"]) {
  return path.resolve(__dirname, "styles", `style-${style}.css`);
}

function unwrapScopedCss(cssText: string, style: DesignSystemConfig["style"]) {
  const scope = `.style-${style}`;
  const start = cssText.indexOf(scope);
  const braceStart = cssText.indexOf("{", start);
  const braceEnd = cssText.lastIndexOf("}");

  if (start === -1 || braceStart === -1 || braceEnd === -1) {
    return cssText.trim();
  }

  return cssText.slice(braceStart + 1, braceEnd).trim();
}

export function getStyleCss(style: DesignSystemConfig["style"]) {
  const filepath = getStyleFilepath(style);
  const mtimeMs = statSync(filepath).mtimeMs;
  const existing = styleCssCache.get(style);

  if (existing?.mtimeMs === mtimeMs) {
    return existing.value;
  }

  const css = readFileSync(filepath, "utf8");
  styleCssCache.set(style, { mtimeMs, value: css });
  return css;
}

export function getScopedStyleCss(
  style: DesignSystemConfig["style"],
  scopeClass = `.style-${style}`,
) {
  const raw = getStyleCss(style);
  return raw.replace(`.style-${style}`, scopeClass).trim();
}

export function getGlobalStyleCss(style: DesignSystemConfig["style"]) {
  return unwrapScopedCss(getStyleCss(style), style);
}
