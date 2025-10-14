// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import starlightCoolerCredit from "starlight-cooler-credit";
import starlightThemeBejamas from "starlight-theme-bejamas";

import vercel from "@astrojs/vercel";
import netlify from "@astrojs/netlify";

const isVercel = process.env.VERCEL === "1";

export default defineConfig({
  // output: 'server',
  integrations: [
    starlight({
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
            ThemeSelect: "./src/components/ThemeSwitcher.astro",
          },
        }),
      ],
      components: {
        ThemeSelect: "./src/components/ThemeSwitcher.astro",
      },
      title: "bejamas/ui",
      titleDelimiter: "-",
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
      customCss: ["./src/styles/global.css", "@bejamas/ui/styles/globals.css"],
      logo: {
        light: "./src/assets/logo-3.svg",
        dark: "./src/assets/logo-dark.svg",
        replacesTitle: true,
      },
      head: [
        {
          tag: "link",
          attrs: {
            href: "/r/themes/current-theme.css",
            rel: "stylesheet",
          },
        },
      ],
      expressiveCode: true,
    }),
    mdx(),
  ],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["zod"],
    },
  },
  adapter: isVercel
    ? vercel({
        skewProtection: true,
      })
    : netlify(),
});
