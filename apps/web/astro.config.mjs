// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import starlightThemeBejamas from "starlight-theme-bejamas";
import vercel from "@astrojs/vercel";
import netlify from "@astrojs/netlify";
import sitemap from "@astrojs/sitemap";
import robotsTxt from "astro-robots-txt";
import { posthog } from "./src/utils/posthog";

const isVercel = process.env.VERCEL === "1";

export default defineConfig({
  // output: 'server',
  site: "https://ui.bejamas.com",
  redirects: {
    "/docs": "/docs/introduction",
  },
  integrations: [
    starlight({
      favicon: "/favicon.ico",
      routeMiddleware: ["./src/route-middleware.ts"],
      credits: true,
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
            Select: "@bejamas/ui/components/Select.astro",
            // ThemeSelect: "./src/components/ThemeSwitcher.astro",
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
          href: "https://github.com/bejamas/ui",
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
      customCss: ["./src/styles/globals.css", "@bejamas/ui/styles/globals.css"],
      logo: {
        light: "./src/assets/logo-3.svg",
        dark: "./src/assets/logo-3-dark.svg",
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
        {
          tag: "link",
          attrs: {
            href: "/manifest.webmanifest",
            rel: "manifest",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "theme-color",
            media: "(prefers-color-scheme: light)",
            content: "#ffffff",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "theme-color",
            media: "(prefers-color-scheme: dark)",
            content: "#ffffff",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "mobile-web-app-capable",
            content: "yes",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "apple-mobile-web-app-title",
            content: "bejamas/ui",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "apple-mobile-web-app-status-bar-style",
            content: "default",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:width",
            content: "1200",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:height",
            content: "630",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:card",
            content: "summary_large_image",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://ui.bejamas.com/og-default.png",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content: "https://ui.bejamas.com/og-default.png",
          },
        },
        {
          tag: "script",
          attrs: {
            type: "text/javascript",
            id: "posthog-js",
          },
          content: posthog,
        },
      ],
      expressiveCode: true,
    }),
    mdx(),
    sitemap(),
    robotsTxt(),
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
