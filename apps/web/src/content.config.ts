import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { file, glob } from "astro/loaders";
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

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "src/content/blog",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    draft: z.boolean().default(false),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    authors: z.array(
      z.object({
        name: z.string(),
        role: z.string().optional(),
        avatar: z.string().optional(),
        href: z.string().optional(),
      }),
    ),
    excerpt: z.string().optional(),
  }),
});

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        figmaUrl: z.string().optional(),
      }),
    }),
  }),
  blocks,
  themes,
  blog,
};
