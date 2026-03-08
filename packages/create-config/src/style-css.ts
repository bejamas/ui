import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "@tailwindcss/node";
import postcss, { type AtRule, type ChildNode, type Declaration, type Rule } from "postcss";
import { STYLES } from "./catalog/styles";
import type { DesignSystemConfig } from "./config";

export interface RegistryCssObject {
  [key: string]: string | RegistryCssObject;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const globalsCssPath = path.resolve(__dirname, "../../ui/src/styles/globals.css");

const styleCssCache = new Map<string, string>();
const compiledStyleCssCache = new Map<string, string>();
const compiledGlobalStyleCssCache = new Map<string, string>();
const registryCssCache = new Map<string, RegistryCssObject>();

function getStyleFilepath(style: DesignSystemConfig["style"]) {
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

function nodeToObject(node: ChildNode): [string, string | RegistryCssObject] | null {
  if (node.type === "rule") {
    const rule = node as Rule;
    const value: RegistryCssObject = {};

    rule.nodes?.forEach((child) => {
      const entry = nodeToObject(child);
      if (entry) {
        value[entry[0]] = entry[1];
      }
    });

    return [rule.selector, value];
  }

  if (node.type === "atrule") {
    const atRule = node as AtRule;
    const key = `@${atRule.name}${atRule.params ? ` ${atRule.params}` : ""}`;

    if (!atRule.nodes?.length) {
      return [key, {}];
    }

    const value: RegistryCssObject = {};
    atRule.nodes.forEach((child) => {
      const entry = nodeToObject(child);
      if (entry) {
        value[entry[0]] = entry[1];
      }
    });

    return [key, value];
  }

  if (node.type === "decl") {
    const declaration = node as Declaration;
    return [declaration.prop, declaration.value];
  }

  return null;
}

export function getStyleCss(style: DesignSystemConfig["style"]) {
  const existing = styleCssCache.get(style);
  if (existing) {
    return existing;
  }

  const css = readFileSync(getStyleFilepath(style), "utf8");
  styleCssCache.set(style, css);
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

export async function getCompiledStyleCss(style: DesignSystemConfig["style"]) {
  const cached = compiledStyleCssCache.get(style);
  if (cached) {
    return cached;
  }

  const rawCss = getStyleCss(style);
  const compiler = await compile(
    [
      `@reference "${globalsCssPath.replace(/\\/g, "/")}";`,
      "@utility no-scrollbar {",
      "  scrollbar-width: none;",
      "  &::-webkit-scrollbar {",
      "    display: none;",
      "  }",
      "}",
      rawCss,
    ].join("\n"),
    {
      base: process.cwd(),
      from: getStyleFilepath(style),
      onDependency() {},
    },
  );
  const compiledCss = compiler.build([]);

  compiledStyleCssCache.set(style, compiledCss);
  return compiledCss;
}

export async function getCompiledGlobalStyleCss(
  style: DesignSystemConfig["style"],
) {
  const cached = compiledGlobalStyleCssCache.get(style);
  if (cached) {
    return cached;
  }

  const rawCss = getGlobalStyleCss(style);
  const compiler = await compile(
    [
      `@reference "${globalsCssPath.replace(/\\/g, "/")}";`,
      "@utility no-scrollbar {",
      "  scrollbar-width: none;",
      "  &::-webkit-scrollbar {",
      "    display: none;",
      "  }",
      "}",
      rawCss,
    ].join("\n"),
    {
      base: process.cwd(),
      from: getStyleFilepath(style),
      onDependency() {},
    },
  );
  const compiledCss = compiler.build([]);

  compiledGlobalStyleCssCache.set(style, compiledCss);
  return compiledCss;
}

export function getRegistryStyleCss(style: DesignSystemConfig["style"]) {
  const cached = registryCssCache.get(style);
  if (cached) {
    return cached;
  }

  const root = postcss.parse(getGlobalStyleCss(style));
  const result: RegistryCssObject = {};

  root.nodes.forEach((node) => {
    const entry = nodeToObject(node);
    if (entry) {
      result[entry[0]] = entry[1];
    }
  });

  registryCssCache.set(style, result);
  return result;
}

export const STYLE_IDS = STYLES.map((style) => style.id);
