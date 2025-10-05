import type { StarlightPlugin } from "@astrojs/starlight/types";

import { createInlineSvgUrl } from "@astrojs/starlight/expressive-code";

import {
  StarlightThemeBejamasConfigSchema,
  type StarlightThemeBejamasUserConfig,
} from "./config";
import { vitePluginStarlightThemeBejamas } from "./lib/vite";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";

export default function starlightThemeBejamas(
  userConfig: StarlightThemeBejamasUserConfig,
): StarlightPlugin {
  const parsedConfig = StarlightThemeBejamasConfigSchema.safeParse(userConfig);

  if (!parsedConfig.success) {
    throw new Error(
      `The provided plugin configuration is invalid.\n${parsedConfig.error.issues.map((issue) => issue.message).join("\n")}`,
    );
  }

  const config = parsedConfig.data;

  return {
    name: "starlight-theme-bejamas-plugin",
    hooks: {
      "config:setup": function ({
        config: starlightConfig,
        logger,
        updateConfig,
        addIntegration,
      }) {
        const userExpressiveCodeConfig =
          starlightConfig.expressiveCode === false ||
          starlightConfig.expressiveCode === true
            ? {}
            : starlightConfig.expressiveCode;

        starlightConfig.plugins?.push(
          pluginLineNumbers({
            showLineNumbers: true,
          }),
        );

        const componentOverrides: typeof config.components = {};

        type OverridableComponent =
          | "Header"
          | "PageFrame"
          | "SiteTitle"
          | "Pagination"
          | "PageTitle"
          | "Hero";

        const overridableComponents: OverridableComponent[] = [
          "Header",
          "PageFrame",
          "SiteTitle",
          "Pagination",
          "PageTitle",
          "Hero",
        ];

        for (const component of overridableComponents) {
          if (config.components?.[component]) {
            logger.warn(
              `It looks like you already have a \`${component}\` component override in your Starlight configuration.`,
            );
          } else {
            componentOverrides[component] =
              `starlight-theme-bejamas/overrides/${component}.astro`;
          }
        }

        updateConfig({
          components: {
            ...componentOverrides,
            ...config.components,
          },
          customCss: [
            "@fontsource/inter/400.css",
            "@fontsource/inter/500.css",
            "@fontsource/inter/700.css",
            // "@fontsource-variable/inter",
            ...(starlightConfig.customCss ?? []),
            // "starlight-theme-bejamas/styles/layers",
            "starlight-theme-bejamas/styles/theme.css",
            // "starlight-theme-bejamas/styles/base",
          ],
          expressiveCode:
            starlightConfig.expressiveCode === false
              ? false
              : {
                  themes: ["github-dark-default", "github-light-default"],
                  ...userExpressiveCodeConfig,
                  styleOverrides: {
                    codeBackground: "var(--code-background)",
                    borderWidth: "0px",
                    borderRadius: "calc(var(--radius) + 4px)",
                    gutterBorderWidth: "0px",
                    ...userExpressiveCodeConfig?.styleOverrides,
                    frames: {
                      editorBackground: "var(--code-background)",
                      terminalBackground: "var(--code-background)",
                      copyIcon: createInlineSvgUrl(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>`,
                      ),
                      ...userExpressiveCodeConfig?.styleOverrides?.frames,
                    },
                    textMarkers: {
                      markBackground: "var(--mark-background)",
                      markBorderColor: "var(--border)",
                      ...userExpressiveCodeConfig?.styleOverrides?.textMarkers,
                    },
                  },
                  // plugins: [
                  //   pluginLineNumbers({
                  //     showLineNumbers: false,
                  //   }),
                  // ],
                  defaultProps: {
                    showLineNumbers: false,
                    overridesByLang: {
                      astro: {
                        showLineNumbers: true,
                      },
                    },
                  },
                },
        });

        addIntegration({
          name: "starlight-theme-bejamas-integration",
          hooks: {
            "astro:config:setup": ({ updateConfig }) => {
              updateConfig({
                vite: {
                  plugins: [vitePluginStarlightThemeBejamas(config)],
                },
              });
            },
          },
        });
      },
    },
  };
}
