import { promises as fs } from "fs";
import path from "path";
import { preFlightInit } from "@/src/preflights/preflight-init";
import { applyDesignSystemToProject } from "@/src/utils/apply-design-system";

import { BASE_COLORS, BUILTIN_REGISTRIES } from "@/src/registry/constants";
import { clearRegistryContext } from "@/src/registry/context";

import { TEMPLATES, createProject } from "@/src/utils/create-project";
import * as ERRORS from "@/src/utils/errors";
import { getConfig, createConfig, type Config } from "@/src/utils/get-config";
import { getProjectConfig, getProjectInfo } from "@/src/utils/get-project-info";
import { getPackageRunner } from "@/src/utils/get-package-manager";
import { handleError } from "@/src/utils/handle-error";
import { highlighter } from "@/src/utils/highlighter";
import { logger } from "@/src/utils/logger";
import { Command } from "commander";
import { execa } from "execa";
import fsExtra from "fs-extra";
import { z } from "zod";
import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  decodePreset,
  designSystemConfigSchema,
  encodePreset,
  isPresetCode,
  type DesignSystemConfig,
} from "@bejamas/create-config/server";
import type { RegistryItem } from "shadcn/schema";

// process.on("exit", (code) => {
//   const filePath = path.resolve(process.cwd(), "components.json")

//   // Delete backup if successful.
//   if (code === 0) {
//     return deleteFileBackup(filePath)
//   }

//   // Restore backup if error.
//   return restoreFileBackup(filePath)
// })

// Default fallback registry endpoint for shadcn (expects /r)
const DEFAULT_REGISTRY_URL = "https://ui.bejamas.com/r";

function resolveDesignSystemConfig(
  options: Pick<
    z.infer<typeof initOptionsSchema>,
    "preset" | "template" | "rtl" | "baseColor"
  >,
): DesignSystemConfig {
  if (options.preset && isPresetCode(options.preset)) {
    const decoded = decodePreset(options.preset);
    if (decoded) {
      return designSystemConfigSchema.parse({
        ...DEFAULT_DESIGN_SYSTEM_CONFIG,
        ...decoded,
        template: options.template ?? DEFAULT_DESIGN_SYSTEM_CONFIG.template,
        rtl: options.rtl ?? false,
      });
    }
  }

  const baseColor = options.baseColor ?? DEFAULT_DESIGN_SYSTEM_CONFIG.baseColor;

  return designSystemConfigSchema.parse({
    ...DEFAULT_DESIGN_SYSTEM_CONFIG,
    template: options.template ?? DEFAULT_DESIGN_SYSTEM_CONFIG.template,
    rtl: options.rtl ?? false,
    baseColor,
    theme:
      baseColor === DEFAULT_DESIGN_SYSTEM_CONFIG.baseColor
        ? DEFAULT_DESIGN_SYSTEM_CONFIG.theme
        : baseColor,
  });
}

function buildInitUrl(config: DesignSystemConfig, themeRef?: string) {
  const params = new URLSearchParams({
    preset: encodePreset(config),
    template: config.template,
  });

  if (config.rtl) {
    params.set("rtl", "true");
  }

  if (themeRef) {
    params.set("themeRef", themeRef);
  }

  return `https://ui.bejamas.com/init?${params.toString()}`;
}

function buildThemeCssFromRegistryItem(item: RegistryItem | null) {
  const cssVars = item?.cssVars;
  if (!cssVars) {
    return null;
  }

  const themeVars = Object.entries(cssVars.theme ?? {}).map(
    ([key, value]) => `  --${key}: ${value};`,
  );
  const lightVars = Object.entries(cssVars.light ?? {}).map(
    ([key, value]) => `  --${key}: ${value};`,
  );
  const darkVars = Object.entries(cssVars.dark ?? {}).map(
    ([key, value]) => `  --${key}: ${value};`,
  );

  return [
    ":root {",
    ...themeVars,
    ...lightVars,
    "}",
    '.dark, [data-theme="dark"] {',
    ...darkVars,
    "}",
  ].join("\n");
}

async function fetchInitThemeCss(initUrl: string) {
  const response = await fetch(initUrl);
  if (!response.ok) {
    return null;
  }

  const item = (await response.json()) as RegistryItem;
  return buildThemeCssFromRegistryItem(item);
}

export const initOptionsSchema = z.object({
  cwd: z.string(),
  components: z.array(z.string()).optional(),
  yes: z.boolean(),
  defaults: z.boolean(),
  force: z.boolean(),
  silent: z.boolean(),
  isNewProject: z.boolean(),
  srcDir: z.boolean().optional(),
  cssVariables: z.boolean(),
  template: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (val) {
          return TEMPLATES[val as keyof typeof TEMPLATES];
        }
        return true;
      },
      {
        message:
          "Invalid template. Please use 'astro', 'astro-monorepo', or 'astro-with-component-docs-monorepo'.",
      },
    ),
  preset: z.string().optional(),
  baseColor: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (val) {
          return BASE_COLORS.find((color) => color.name === val);
        }

        return true;
      },
      {
        message: `Invalid base color. Please use '${BASE_COLORS.map(
          (color) => color.name,
        ).join("', '")}'`,
      },
    ),
  baseStyle: z.boolean(),
  rtl: z.boolean().default(false),
  themeRef: z.string().optional(),
});

export const init = new Command()
  .name("init")
  .description("initialize your project and install dependencies")
  .argument("[components...]", "names, url or local path to component")
  .option(
    "-t, --template <template>",
    "the template to use. (next, next-monorepo)",
  )
  .option(
    "-b, --base-color <base-color>",
    "the base color to use. (neutral, gray, zinc, stone, slate)",
    undefined,
  )
  .option("-p, --preset <preset>", "the encoded create preset to use")
  .option("--theme-ref <theme-ref>", "the custom theme ref to use")
  .option("-y, --yes", "skip confirmation prompt.", true)
  .option("-d, --defaults,", "use default configuration.", false)
  .option("-f, --force", "force overwrite of existing configuration.", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option("-s, --silent", "mute output.", false)
  .option(
    "--src-dir",
    "use the src directory when creating a new project.",
    false,
  )
  .option(
    "--no-src-dir",
    "do not use the src directory when creating a new project.",
  )
  .option("--css-variables", "use css variables for theming.", true)
  .option("--no-css-variables", "do not use css variables for theming.")
  .option("--no-base-style", "do not install the base shadcn style.")
  .option("--rtl", "enable right-to-left output", false)
  .action(async (_components, opts) => {
    try {
      await runInit(opts);
    } catch (error) {
      logger.break();
      handleError(error);
    } finally {
      clearRegistryContext();
    }
  });

export async function runInit(
  options: z.infer<typeof initOptionsSchema> & {
    skipPreflight?: boolean;
  },
) {
  const designConfig = resolveDesignSystemConfig(options);
  let projectInfo;
  let newProjectTemplate;
  if (!options.skipPreflight) {
    const preflight = await preFlightInit(options);

    if (preflight.errors[ERRORS.MISSING_DIR_OR_EMPTY_PROJECT]) {
      const { projectPath, template } = await createProject(options);
      if (!projectPath) {
        process.exit(1);
      }
      options.cwd = projectPath;
      options.isNewProject = true;
      newProjectTemplate = template;
    }
    projectInfo = preflight.projectInfo;
  } else {
    projectInfo = await getProjectInfo(options.cwd);
  }

  if (newProjectTemplate) {
    const projectPath = {
      "astro-monorepo": "apps/web",
      "astro-with-component-docs-monorepo": "apps/web",
      astro: "",
    } as const;
    await applyDesignSystemToProject(options.cwd, {
      ...designConfig,
      template: newProjectTemplate,
    }, {
      themeCss: options.themeRef
        ? await fetchInitThemeCss(buildInitUrl(
            {
              ...designConfig,
              template: newProjectTemplate,
            },
            options.themeRef,
          ))
        : undefined,
    });

    options.cwd = path.resolve(options.cwd, projectPath[newProjectTemplate]);

    logger.log(
      `${highlighter.success(
        "Success!",
      )} Project initialization completed.\nYou may now add components.`,
    );

    return await getConfig(options.cwd);
  }

  // const projectConfig = await getProjectConfig(options.cwd, projectInfo);

  const shadcnBin = process.platform === "win32" ? "shadcn.cmd" : "shadcn";
  const localShadcnPath = path.resolve(
    options.cwd,
    "node_modules",
    ".bin",
    shadcnBin,
  );

  try {
    const env = {
      ...process.env,
      REGISTRY_URL: process.env.REGISTRY_URL || DEFAULT_REGISTRY_URL,
    };
    const initUrl = buildInitUrl(designConfig, options.themeRef);
    if (await fsExtra.pathExists(localShadcnPath)) {
      await execa(localShadcnPath, ["init", initUrl], {
        stdio: "inherit",
        cwd: options.cwd,
        env,
      });
    } else {
      // Follow user's runner preference (npx, bunx, pnpm dlx)
      await execa("npx", ["-y", "shadcn@latest", "init", initUrl], {
        stdio: "inherit",
        cwd: options.cwd,
        env,
      });
    }
  } catch (err) {
    // shadcn already printed the detailed error to stdio, avoid double-reporting
    process.exit(1);
  }
}
