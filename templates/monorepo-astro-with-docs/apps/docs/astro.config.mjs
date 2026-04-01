// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";

import starlightThemeBejamas from "starlight-theme-bejamas";

// bejamas:astro-fonts:start
/** @type {NonNullable<import("astro/config").AstroUserConfig["fonts"]>} */
const BEJAMAS_ASTRO_FONTS = [
  {
    provider: fontProviders.fontsource(),
    name: "Geist",
    cssVariable: "--font-sans",
    subsets: ["latin"],
  },
];
// bejamas:astro-fonts:end

// https://astro.build/config
export default defineConfig({
  fonts: BEJAMAS_ASTRO_FONTS,
  integrations: [
    starlight({
      components: {
        Head: "./src/components/Head.astro",
      },
      plugins: [
        starlightThemeBejamas({
          nav: [
            {
              label: "Docs",
              href: "/guides/example/",
            },
          ],
          components: {
            // This is needed if you want to use your UI components in the docs site
            button: "@repo/ui/components/button",
            select: "@repo/ui/components/select",
          },
        }),
      ],
      title: "Acme/ui",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/bejamas/ui",
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
      customCss: ["./src/styles/globals.css", "@repo/ui/globals.css"],
    }),
  ],
  vite: {
    plugins: [tailwindcss()], // Tailwind is needed to properly display UI components
  },
});
