import path from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "@tailwindcss/node";
import type { DesignSystemConfig } from "./config";
import {
  getGlobalStyleCss,
  getStyleCss,
  getStyleFilepath,
} from "./style-css-source";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const globalsCssPath = path.resolve(__dirname, "../../ui/src/styles/globals.css");

export const STYLE_LAYER_ORDER_DECLARATION =
  "@layer base, starlight.reset, starlight, bejamas, theme, components, utilities;";

function buildCompilerInput(css: string) {
  return [
    `@reference "${globalsCssPath.replace(/\\/g, "/")}";`,
    STYLE_LAYER_ORDER_DECLARATION,
    "@utility no-scrollbar {",
    "  scrollbar-width: none;",
    "  &::-webkit-scrollbar {",
    "    display: none;",
    "  }",
    "}",
    "@layer components {",
    css,
    "}",
  ].join("\n");
}

async function compileCss(sourceCss: string, from: string) {
  const compiler = await compile(buildCompilerInput(sourceCss), {
    base: process.cwd(),
    from,
    onDependency() {},
  });

  return compiler.build([]);
}

export async function compileStyleCss(style: DesignSystemConfig["style"]) {
  return compileCss(getStyleCss(style), getStyleFilepath(style));
}

export async function compileGlobalStyleCss(style: DesignSystemConfig["style"]) {
  return compileCss(getGlobalStyleCss(style), getStyleFilepath(style));
}
