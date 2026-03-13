import { fonts } from "./catalog/fonts";
import type { DesignSystemConfig } from "./config";
import { getRegistryStyleCss, type RegistryCssObject } from "./style-css";

function buildBaseCss(css: RegistryCssObject): RegistryCssObject {
  return {
    '@import "tw-animate-css"': {},
    '@import "shadcn/tailwind.css"': {},
    "@layer base": {
      "*": {
        "@apply border-border outline-ring/50": {},
      },
      body: {
        "@apply bg-background text-foreground": {},
      },
    },
    ...css,
  };
}

export function buildRegistryBaseCss(): RegistryCssObject {
  return buildBaseCss({});
}

export function buildUtilsRegistryItem() {
  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: "utils",
    type: "registry:lib" as const,
    dependencies: ["clsx", "tailwind-merge"],
    files: [
      {
        path: "lib/utils.ts",
        type: "registry:lib" as const,
        content: `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,
      },
    ],
  };
}

export function buildFontRegistryItem(name: string) {
  const font = fonts.find((entry) => entry.name === name);

  if (!font) {
    return null;
  }

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    ...font,
  };
}

export function buildRegistryStyleCss(style: DesignSystemConfig["style"]) {
  return buildBaseCss(getRegistryStyleCss(style));
}
