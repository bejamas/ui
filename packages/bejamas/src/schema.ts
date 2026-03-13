import { z } from "zod";

const registryUrlSchema = z.union([
  z.string().refine((value) => value.includes("{name}"), {
    message: "Registry URL must include {name} placeholder",
  }),
  z.object({
    url: z.string().refine((value) => value.includes("{name}"), {
      message: "Registry URL must include {name} placeholder",
    }),
    params: z.record(z.string(), z.string()).optional(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
]);

export const registryConfigSchema = z.record(
  z.string().refine((value) => value.startsWith("@"), {
    message: "Registry names must start with @ (e.g., @v0, @acme)",
  }),
  registryUrlSchema,
);

export const rawConfigSchema = z
  .object({
    $schema: z.string().optional(),
    style: z.string(),
    rsc: z.coerce.boolean().default(false),
    tsx: z.coerce.boolean().default(true),
    tailwind: z.object({
      config: z.string().optional(),
      css: z.string(),
      baseColor: z.string(),
      cssVariables: z.boolean().default(true),
      prefix: z.string().default("").optional(),
    }),
    iconLibrary: z.string().optional(),
    rtl: z.coerce.boolean().default(false).optional(),
    menuColor: z
      .enum([
        "default",
        "inverted",
        "default-translucent",
        "inverted-translucent",
      ])
      .default("default")
      .optional(),
    menuAccent: z.enum(["subtle", "bold"]).default("subtle").optional(),
    aliases: z.object({
      components: z.string(),
      utils: z.string(),
      ui: z.string().optional(),
      lib: z.string().optional(),
      hooks: z.string().optional(),
    }),
    registries: registryConfigSchema.optional(),
  })
  .strict();

const partialRawConfigSchema = rawConfigSchema
  .partial()
  .extend({
    tailwind: rawConfigSchema.shape.tailwind.partial().optional(),
    aliases: rawConfigSchema.shape.aliases.partial().optional(),
    registries: registryConfigSchema.optional(),
  });

export const configSchema = rawConfigSchema.extend({
  resolvedPaths: z.object({
    cwd: z.string(),
    tailwindConfig: z.string(),
    tailwindCss: z.string(),
    utils: z.string(),
    components: z.string(),
    lib: z.string(),
    hooks: z.string(),
    ui: z.string(),
  }),
});

export const workspaceConfigSchema = z.record(configSchema);

export const registryItemTypeSchema = z.enum([
  "registry:lib",
  "registry:block",
  "registry:component",
  "registry:ui",
  "registry:hook",
  "registry:page",
  "registry:file",
  "registry:theme",
  "registry:style",
  "registry:item",
  "registry:base",
  "registry:font",
  "registry:example",
  "registry:internal",
]);

export const registryFileSchema = z.discriminatedUnion("type", [
  z.object({
    path: z.string(),
    content: z.string().optional(),
    type: z.enum(["registry:file", "registry:page"]),
    target: z.string(),
  }),
  z.object({
    path: z.string(),
    content: z.string().optional(),
    type: registryItemTypeSchema.exclude(["registry:file", "registry:page"]),
    target: z.string().optional(),
  }),
]);

const registryTailwindSchema = z.object({
  config: z
    .object({
      content: z.array(z.string()).optional(),
      theme: z.record(z.string(), z.any()).optional(),
      plugins: z.array(z.string()).optional(),
    })
    .optional(),
});

const registryCssVarsSchema = z.object({
  theme: z.record(z.string(), z.string()).optional(),
  light: z.record(z.string(), z.string()).optional(),
  dark: z.record(z.string(), z.string()).optional(),
});

const registryCssValueSchema: z.ZodType<
  string | string[] | Record<string, unknown>
> = z.lazy(() =>
  z.union([
    z.string(),
    z.array(z.union([z.string(), z.record(z.string(), z.string())])),
    z.record(z.string(), registryCssValueSchema),
  ]),
);

const registryCssSchema = z.record(z.string(), registryCssValueSchema);
const registryEnvVarsSchema = z.record(z.string(), z.string());

const registryFontSchema = z.object({
  family: z.string(),
  provider: z.literal("google"),
  import: z.string(),
  variable: z.string(),
  weight: z.array(z.string()).optional(),
  subsets: z.array(z.string()).optional(),
  selector: z.string().optional(),
});

const registryBaseItemSchema = z.object({
  $schema: z.string().optional(),
  extends: z.string().optional(),
  name: z.string(),
  title: z.string().optional(),
  author: z.string().min(2).optional(),
  description: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  devDependencies: z.array(z.string()).optional(),
  registryDependencies: z.array(z.string()).optional(),
  files: z.array(registryFileSchema).optional(),
  tailwind: registryTailwindSchema.optional(),
  cssVars: registryCssVarsSchema.optional(),
  css: registryCssSchema.optional(),
  envVars: registryEnvVarsSchema.optional(),
  meta: z.record(z.string(), z.any()).optional(),
  docs: z.string().optional(),
  categories: z.array(z.string()).optional(),
});

export const registryItemSchema = z.discriminatedUnion("type", [
  registryBaseItemSchema.extend({
    type: z.literal("registry:base"),
    config: partialRawConfigSchema.optional(),
  }),
  registryBaseItemSchema.extend({
    type: z.literal("registry:font"),
    font: registryFontSchema,
  }),
  registryBaseItemSchema.extend({
    type: registryItemTypeSchema.exclude(["registry:base", "registry:font"]),
  }),
]);

export const registrySchema = z.object({
  name: z.string(),
  homepage: z.string(),
  items: z.array(registryItemSchema),
});

export const registryIndexSchema = z.array(registryItemSchema);

export const stylesSchema = z.array(
  z.object({
    name: z.string(),
    label: z.string(),
  }),
);

export const iconsSchema = z.record(z.string(), z.record(z.string(), z.string()));

export const registryBaseColorSchema = z.object({
  inlineColors: z.object({
    light: z.record(z.string(), z.string()),
    dark: z.record(z.string(), z.string()),
  }),
  cssVars: registryCssVarsSchema,
  cssVarsV4: registryCssVarsSchema.optional(),
  inlineColorsTemplate: z.string(),
  cssVarsTemplate: z.string(),
});

export const registriesIndexSchema = z.object({
  pagination: z.object({
    total: z.number(),
    offset: z.number(),
    limit: z.number(),
    hasMore: z.boolean(),
  }),
  items: z.array(
    z.object({
      name: z.string(),
      type: z.string().optional(),
      description: z.string().optional(),
      registry: z.string(),
      addCommandArgument: z.string(),
    }),
  ),
});
