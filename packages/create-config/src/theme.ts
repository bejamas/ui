import type { RegistryItem } from "shadcn/schema";
import {
  getFontValue,
  getHeadingFontValue,
  getStyleId,
  type DesignSystemConfig,
} from "./config";
import {
  ICON_LIBRARIES,
  buildRegistryTheme,
} from "./design";
import { buildRegistryBaseCss, buildRegistryStyleCss } from "./registry";

export function buildStyleIndexItem(style: DesignSystemConfig["style"]): RegistryItem {
  const styleId = getStyleId(style);

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: "index",
    type: "registry:style",
    dependencies: ["bejamas", "class-variance-authority", "@lucide/astro"],
    devDependencies: ["shadcn", "tw-animate-css"],
    registryDependencies: ["utils"],
    css: buildRegistryStyleCss(style),
    cssVars: {},
    files: [],
    meta: {
      styleId,
    },
  } as RegistryItem;
}

export function buildRegistryBaseItem(config: DesignSystemConfig): RegistryItem {
  const iconLibrary = ICON_LIBRARIES.find(
    (library) => library.name === config.iconLibrary,
  );
  const font = getFontValue(config.font);
  const normalizedFontHeading =
    config.fontHeading === config.font ? "inherit" : config.fontHeading;
  const headingFont =
    normalizedFontHeading === "inherit"
      ? null
      : getHeadingFontValue(normalizedFontHeading);
  const registryDependencies = ["utils"];

  if (font) {
    registryDependencies.push(font.name);
  }

  if (headingFont) {
    registryDependencies.push(headingFont.name);
  }

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: getStyleId(config.style),
    type: "registry:base" as const,
    extends: "none",
    config: {
      style: getStyleId(config.style),
      iconLibrary: config.iconLibrary,
      rtl: config.rtl,
      menuAccent: config.menuAccent,
      menuColor: config.menuColor,
      tailwind: {
        baseColor: config.baseColor,
      },
    },
    dependencies: [
      "bejamas",
      "class-variance-authority",
      ...(iconLibrary ? [iconLibrary.packageName] : []),
    ],
    devDependencies: ["shadcn", "tw-animate-css"],
    registryDependencies,
    css: buildRegistryBaseCss(),
    cssVars: buildRegistryTheme(config).cssVars,
    ...(font
      ? {
          docs:
            headingFont
              ? `Font family: ${font.font.family}; Heading font family: ${headingFont.font.family}`
              : `Font family: ${font.font.family}`,
        }
      : {}),
  } as RegistryItem;
}
