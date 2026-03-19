import path from "path";
import { preFlightInit } from "@/src/preflights/preflight-init";

import { clearRegistryContext } from "@/src/registry/context";

import { TEMPLATES, createProject } from "@/src/utils/create-project";
import * as ERRORS from "@/src/utils/errors";
import { getConfig } from "@/src/utils/get-config";
import { handleError } from "@/src/utils/handle-error";
import { highlighter } from "@/src/utils/highlighter";
import { logger } from "@/src/utils/logger";
import { buildPinnedShadcnInvocation } from "@/src/utils/shadcn-cli";
import { Command } from "commander";
import { execa } from "execa";
import { z } from "zod";

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
export const DEFAULT_COMPONENTS_BASE_COLOR = "neutral";

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
        message: "Invalid template. Please use 'next' or 'next-monorepo'.",
      },
    ),
  baseColor: z.string().optional(),
  baseStyle: z.boolean(),
});

export function buildShadcnInitArgs(
  baseColor = DEFAULT_COMPONENTS_BASE_COLOR,
) {
  return ["init", "--base-color", baseColor];
}

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
  }

  if (newProjectTemplate) {
    const projectPath = {
      "astro-monorepo": "apps/web",
      "astro-with-component-docs-monorepo": "apps/web",
      astro: "",
    } as const;
    options.cwd = path.resolve(options.cwd, projectPath[newProjectTemplate]);

    logger.log(
      `${highlighter.success(
        "Success!",
      )} Project initialization completed.\nYou may now add components.`,
    );

    return await getConfig(options.cwd);
  }

  // const projectConfig = await getProjectConfig(options.cwd, projectInfo);

  try {
    const env = {
      ...process.env,
      REGISTRY_URL: process.env.REGISTRY_URL || DEFAULT_REGISTRY_URL,
    };
    const invocation = buildPinnedShadcnInvocation(
      buildShadcnInitArgs(options.baseColor ?? DEFAULT_COMPONENTS_BASE_COLOR),
    );

    await execa(invocation.cmd, invocation.args, {
      stdio: "inherit",
      cwd: options.cwd,
      env,
    });
  } catch (err) {
    // shadcn already printed the detailed error to stdio, avoid double-reporting
    process.exit(1);
  }
}
