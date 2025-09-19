// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

import tailwindcss from "@tailwindcss/vite";
import starlightThemeBejamas from "starlight-theme-bejamas";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      plugins: [
        starlightThemeBejamas({
          nav: [
            {
              label: "Docs",
              href: "/guides/example/",
            },
          ],
          components: {
            Button: "@repo/ui/components/Button.astro",
          },
        }),
      ],
      title: "my ui docs",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/withastro/starlight",
        },
      ],
      sidebar: [
        {
          label: "Guides",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Example Guide", slug: "guides/example" },
          ],
        },
        {
          label: "Components",
          autogenerate: { directory: "components" },
        },
      ],
      customCss: ["@repo/ui/styles/globals.css"],
    }),
  ],
  vite: {
    plugins: [tailwindcss()], // Tailwind is needed to properly display UI components
    server: {
      fs: {
        allow: [
          // always current project
          // process.cwd(),
          // add your monorepo root (the one from the 403 path)
          "/Users/thom/dev/bejamas-ui-turbo",
        ],
        // (optional) brute-force during dev:
        // strict: false,
      },
    },
  },
});
