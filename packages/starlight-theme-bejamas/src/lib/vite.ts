import type { ViteUserConfig } from "astro";
import type { StarlightThemeBejamasConfig } from "../config";

export function vitePluginStarlightThemeBejamas(
  config: StarlightThemeBejamasConfig,
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

        if (!target) {
          return `export default (()=>{ throw new Error(\"starlight-theme-bejamas: No component mapping found for '${componentName}'. Add it under 'components' in your starlightThemeBejamas config.\"); })()`;
        }

        // Check if target is a barrel import (no .astro extension) or old-style file import
        const isBarrelImport = !target.endsWith(".astro");

        if (isBarrelImport) {
          // For barrel imports, the component is exported as a named export in PascalCase
          // Convert componentName (e.g., 'button') to PascalCase (e.g., 'Button')
          const pascalCaseName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
          return `export { ${pascalCaseName} as default, ${pascalCaseName} } from "${target}"; export * from "${target}";`;
        }

        // Old pattern: .astro file with default export
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
