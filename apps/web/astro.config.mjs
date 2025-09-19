// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import starlightCoolerCredit from "starlight-cooler-credit";
import starlightThemeBejamas from "starlight-theme-bejamas";

import vercel from "@astrojs/vercel";

export default defineConfig({
  // output: 'server',
  integrations: [
    starlight({
      // prerender: false,
      plugins: [
        starlightThemeBejamas({
          nav: [
            { label: "Docs", href: "/docs/introduction" },
            { label: "Components", href: "/components" },
            { label: "Blocks", href: "/blocks" },
            { label: "Themes", href: "/themes" },
          ],
          components: {
            Button: "@bejamas/ui/components/Button.astro",
            PageFrame: "./src/components/PageFrame.astro",
            ThemeSelect: "./src/components/ThemeSwitcher.astro",
          },
        }),
      ],
      components: {
        PageFrame: "./src/components/PageFrame.astro",
        ThemeSelect: "./src/components/ThemeSwitcher.astro",
      },
      title: "bejamas/ui",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/withastro/starlight",
        },
      ],
      sidebar: [
        {
          label: "Getting Started",
          autogenerate: { directory: "docs" },
        },
        {
          label: "Components",
          autogenerate: { directory: "components" },
        },
      ],
      customCss: [
        // "@fontsource-variable/inter",
        "./src/styles/global.css",
        // "@bejamas/ui/styles/globals.css",
        // "../../node_modules/@bejamas/ui/src/styles/globals.css",
      ],
      logo: {
        light: "./src/assets/logo.svg",
        dark: "./src/assets/logo-dark.svg",
        replacesTitle: true,
      },
      expressiveCode: true,
    }),
    mdx(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: vercel(),
});
