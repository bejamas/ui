// @ts-check
import { defineConfig, envField } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import starlightThemeBejamas from "starlight-theme-bejamas";
import starlightPageActions from "starlight-page-actions";

import vercel from "@astrojs/vercel";
import sitemap from "@astrojs/sitemap";
import robotsTxt from "astro-robots-txt";
import { posthog } from "./src/utils/posthog";

import alpinejs from "@astrojs/alpinejs";

const isVercel = process.env.VERCEL === "1";

export default defineConfig({
  trailingSlash: "never",
  // output: "server",
  site: "https://ui.bejamas.com",
  redirects: {
    "/docs": "/docs/introduction",
  },
  image: {
    // Example: Allow remote image optimization from a single domain
    domains: ["gradient.bejamas.com", "github.com"],
  },
  env: {
    schema: {
      OPENAI_API_KEY: envField.string({ context: "server", access: "secret" }),
      UPSTASH_REDIS_REST_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      UPSTASH_REDIS_REST_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
  prefetch: {
    defaultStrategy: "viewport",
    prefetchAll: true,
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
            { label: "Themes", href: "/themes" },
          ],
          components: {
            button: "@bejamas/ui/components/button",
            select: "@bejamas/ui/components/select",
            ThemeSelect: "./src/components/ThemeSwitcher.astro",
            PageTitle: "./src/components/PageTitle.astro",
          },
        }),
        starlightPageActions(),
      ],
      components: {
        ThemeSelect: "./src/components/ThemeSwitcher.astro",
        PageTitle: "./src/components/PageTitle.astro",
      },
      title: "bejamas/ui",
      titleDelimiter: "-",
      // social: [
      //   {
      //     icon: "github",
      //     label: "GitHub",
      //     href: "https://github.com/bejamas/ui",
      //   },
      // ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            "docs/introduction",
            "docs/installation",
            "docs/cli",
            "docs/forms-astro-actions",
          ],
        },
        {
          label: "Components",
          autogenerate: { directory: "components" },
        },
        {
          label: "Concepts",
          items: [
            "docs/theming",
            "docs/design-principles",
            "docs/monorepo",
            "docs/auto-generated-docs",
            "docs/changelog",
          ],
        },
      ],
      customCss: ["./src/styles/globals.css", "@bejamas/ui/styles/globals.css"],
      logo: {
        alt: "bejamas/ui",
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
            src: "https://plausible.io/js/pa-FnTta3NUzdovwg1ldYIQ3.js",
            async: true,
          },
        },
        {
          tag: "script",
          content: `window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`,
        },
        // {
        //   tag: "script",
        //   attrs: {
        //     type: "text/javascript",
        //     id: "posthog-js",
        //   },
        //   content: posthog,
        // },
      ],
    }),
    mdx(),
    sitemap({
      filter: (page) =>
        !page.includes("/kitchen-sink/") &&
        !page.includes("-test") &&
        !page.includes("/ui-demo/") &&
        !page.includes("/blocks/") &&
        !page.includes("/ai/") &&
        !page.includes("/health/") &&
        !page.includes("/fintech/"),
    }),
    robotsTxt({
      policy: [
        {
          userAgent: "*",
          allow: "/",
          disallow: ["/kitchen-sink/", "/ui-demo/"],
        },
      ],
    }),
    alpinejs(),
  ],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["zod"],
    },
  },
  adapter: vercel({
    skewProtection: true,
    imageService: true,
  }),
});
