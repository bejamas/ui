import { defineCollection, z } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { file } from "astro/loaders";
import { themeStylePropsSchema } from "./utils/types/theme";

const blocks = defineCollection({
  loader: file("src/content/docs/blocks.json"),
  schema: z.object({
    label: z.string(),
    description: z.string().optional(),
    items: z
      .array(
        z.object({
          label: z.string(),
          id: z.string(),
          description: z.string().optional(),
          href: z.string(),
        }),
      )
      .optional(),
  }),
});

const themes = defineCollection({
  loader: file("src/pages/r/themes/_presets.json"),
  schema: z.object({
    label: z.string(),
    createdAt: z.string().optional(),
    styles: z.object({
      light: z.any().optional(),
      dark: z.any().optional(),
    }),
  }),
});

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  blocks,
  themes,
};
