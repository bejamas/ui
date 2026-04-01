import postcss, { type AtRule, type ChildNode, type Declaration, type Rule } from "postcss";
import { STYLES } from "./catalog/styles";
import type { DesignSystemConfig } from "./config";
import {
  compiledGlobalStyleCssByStyle,
  compiledStyleCssByStyle,
} from "./generated/compiled-style-css.js";
import { getGlobalStyleCss } from "./style-css-source";
export {
  getGlobalStyleCss,
  getScopedStyleCss,
  getStyleCss,
} from "./style-css-source";

export interface RegistryCssObject {
  [key: string]: string | RegistryCssObject;
}

const registryCssCache = new Map<string, RegistryCssObject>();

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

export async function getCompiledStyleCss(style: DesignSystemConfig["style"]) {
  return compiledStyleCssByStyle[style];
}

export async function getCompiledGlobalStyleCss(
  style: DesignSystemConfig["style"],
) {
  return compiledGlobalStyleCssByStyle[style];
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
