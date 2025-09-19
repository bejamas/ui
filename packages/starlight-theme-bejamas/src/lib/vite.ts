import type { ViteUserConfig } from "astro";
import type { StarlightThemeBejamasConfig } from "../config";

export function vitePluginStarlightThemeBejamas(
  config: StarlightThemeBejamasConfig
): VitePlugin {
  const moduleId = "virtual:starlight-theme-bejamas/user-config";
  const resolvedModuleId = `\0${moduleId}`;
  const moduleContent = `export default ${JSON.stringify(config)}`;

  const componentsPrefix = "virtual:starlight-theme-bejamas/components/";
  const resolvedComponentsPrefix = `\0${componentsPrefix}`;

  return {
    name: "vite-plugin-starlight-theme-bejamas",
    load(id) {
      if (id === resolvedModuleId) {
        return moduleContent;
      }

      if (id.startsWith(resolvedComponentsPrefix)) {
        const componentId = id.slice(resolvedComponentsPrefix.length);
        const componentName = componentId.replace(/\.astro$/, "");
        const target = config.components?.[componentName];

        console.log({ target });
        if (!target) {
          return `export default (()=>{ throw new Error(\"starlight-theme-bejamas: No component mapping found for '${componentName}'. Add it under 'components' in your starlightThemeBejamas config.\"); })()`;
        }

        return `export { default } from "${target}"; export * from "${target}";`;
      }

      return undefined;
    },
    resolveId(id) {
      if (id === moduleId) {
        return resolvedModuleId;
      }

      if (id.startsWith(componentsPrefix)) {
        const componentId = id.slice(componentsPrefix.length);
        const componentName = componentId.replace(/\.astro$/, "");
        return `${resolvedComponentsPrefix}${componentName}`;
      }

      return undefined;
    },
  };
}

type VitePlugin = NonNullable<ViteUserConfig["plugins"]>[number];
