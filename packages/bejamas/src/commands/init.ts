import { promises as fs } from "fs";
import path from "path";
import { preFlightInit } from "@/src/preflights/preflight-init";

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

// process.on("exit", (code) => {
//   const filePath = path.resolve(process.cwd(), "components.json")

//   // Delete backup if successful.
//   if (code === 0) {
//     return deleteFileBackup(filePath)
//   }

//   // Restore backup if error.
//   return restoreFileBackup(filePath)
// })

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
    options.cwd = path.resolve(options.cwd, projectPath[newProjectTemplate]);

    logger.log(
      `${highlighter.success(
        "Success!",
      )} Project initialization completed.\nYou may now add components.`,
    );

    return await getConfig(options.cwd);
  }

  const projectConfig = await getProjectConfig(options.cwd, projectInfo);

  const shadcnBin = process.platform === "win32" ? "shadcn.cmd" : "shadcn";
  const localShadcnPath = path.resolve(
    options.cwd,
    "node_modules",
    ".bin",
    shadcnBin,
  );

  if (await fsExtra.pathExists(localShadcnPath)) {
    await execa(localShadcnPath, ["init", "--base-color", "neutral"], {
      stdio: "inherit",
      cwd: options.cwd,
    });
  } else {
    // Prefer local shadcn binary if available in the target project
    const shadcnBin = process.platform === "win32" ? "shadcn.cmd" : "shadcn";
    const localShadcnPath = path.resolve(
      options.cwd,
      "node_modules",
      ".bin",
      shadcnBin,
    );

    if (await fsExtra.pathExists(localShadcnPath)) {
      await execa(localShadcnPath, ["init", "--base-color", "neutral"], {
        stdio: "inherit",
        cwd: options.cwd,
      });
    } else {
      // Follow user's runner preference (npx, bunx, pnpm dlx)
      const runner = await getPackageRunner(options.cwd);
      if (runner === "bunx") {
        await execa(
          "bunx",
          ["shadcn@latest", "init", "--base-color", "neutral"],
          {
            stdio: "inherit",
            cwd: options.cwd,
          },
        );
      } else if (runner === "pnpm dlx") {
        await execa(
          "pnpm",
          ["dlx", "shadcn@latest", "init", "--base-color", "neutral"],
          {
            stdio: "inherit",
            cwd: options.cwd,
          },
        );
      } else {
        // default to npx; add -y to skip install prompt
        await execa(
          "npx",
          ["-y", "shadcn@latest", "init", "--base-color", "neutral"],
          {
            stdio: "inherit",
            cwd: options.cwd,
          },
        );
      }
    }
  }
}
