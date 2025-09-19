import { promises as fs } from "fs";
import path from "path";
import { preFlightInit } from "@/src/preflights/preflight-init";
import {
  getRegistryBaseColors,
  getRegistryItems,
  getRegistryStyles,
} from "@/src/registry/api";
import { buildUrlAndHeadersForRegistryItem } from "@/src/registry/builder";
import { configWithDefaults } from "@/src/registry/config";
import { BASE_COLORS, BUILTIN_REGISTRIES } from "@/src/registry/constants";
import { clearRegistryContext } from "@/src/registry/context";
import { rawConfigSchema } from "@/src/schema";
import { addComponents } from "@/src/utils/add-components";
import { TEMPLATES, createProject } from "@/src/utils/create-project";
// import { loadEnvFiles } from "@/src/utils/env-loader"
import * as ERRORS from "@/src/utils/errors";
// import {
//   FILE_BACKUP_SUFFIX,
//   createFileBackup,
//   deleteFileBackup,
//   restoreFileBackup,
// } from "@/src/utils/file-helper"
import {
  DEFAULT_COMPONENTS,
  DEFAULT_TAILWIND_CONFIG,
  DEFAULT_TAILWIND_CSS,
  DEFAULT_UTILS,
  getConfig,
  resolveConfigPaths,
  type Config,
} from "@/src/utils/get-config";
import {
  getProjectConfig,
  getProjectInfo,
  getProjectTailwindVersionFromConfig,
} from "@/src/utils/get-project-info";
import { handleError } from "@/src/utils/handle-error";
import { highlighter } from "@/src/utils/highlighter";
import { logger } from "@/src/utils/logger";
import { Command } from "commander";
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
      const cwd = path.resolve(opts.cwd);
      const projectInfo = await getProjectInfo(cwd);

      const isAstro = Boolean(projectInfo?.isAstro);
      const hasTailwind = Boolean(
        projectInfo &&
          (projectInfo.tailwindVersion ||
            projectInfo.tailwindConfigFile ||
            projectInfo.tailwindCssFile),
      );

      logger.log("");

      await runInit(opts);

      logger.log(
        `${highlighter.success(
          "Success!",
        )} Project initialization completed.\nYou may now add components.`,
      );

      // We need when runninng with custom cwd.
      deleteFileBackup(path.resolve(options.cwd, "components.json"));
      logger.break();
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

  console.log({ option, newProjectTemplate });

  if (newProjectTemplate === "astro-monorepo") {
    options.cwd = path.resolve(options.cwd, "apps/web");
    return await getConfig(options.cwd);
  }

  const projectConfig = await getProjectConfig(options.cwd, projectInfo);

  console.log("projectConfig", projectConfig);

  let config = projectConfig
    ? await promptForMinimalConfig(projectConfig, options)
    : await promptForConfig(await getConfig(options.cwd));

  if (!options.yes) {
    const { proceed } = await prompts({
      type: "confirm",
      name: "proceed",
      message: `Write configuration to ${highlighter.info(
        "components.json",
      )}. Proceed?`,
      initial: true,
    });

    if (!proceed) {
      process.exit(0);
    }
  }

  // Prepare the list of components to be added.
  const components = [
    // "index" is the default shadcn style.
    // Why index? Because when style is true, we read style from components.json and fetch that.
    // i.e new-york from components.json then fetch /styles/new-york/index.
    // TODO: Fix this so that we can extend any style i.e --style=new-york.
    ...(options.baseStyle ? ["index"] : []),
    ...(options.components ?? []),
  ];

  // Ensure registries are configured for the components we're about to add.
  const fullConfigForRegistry = await resolveConfigPaths(options.cwd, config);
  const { config: configWithRegistries } = await ensureRegistriesInConfig(
    components,
    fullConfigForRegistry,
    {
      silent: true,
    },
  );

  // Update config with any new registries found.
  if (configWithRegistries.registries) {
    config.registries = configWithRegistries.registries;
  }

  const componentSpinner = spinner(`Writing components.json.`).start();
  const targetPath = path.resolve(options.cwd, "components.json");
  const backupPath = `${targetPath}${FILE_BACKUP_SUFFIX}`;

  // Merge with backup config if it exists and not using --force
  if (!options.force && fsExtra.existsSync(backupPath)) {
    const existingConfig = await fsExtra.readJson(backupPath);

    // Move registries at the end of the config.
    const { registries, ...merged } = deepmerge(existingConfig, config);
    config = { ...merged, registries };
  }

  // Make sure to filter out built-in registries.
  // TODO: fix this in ensureRegistriesInConfig.
  config.registries = Object.fromEntries(
    Object.entries(config.registries || {}).filter(
      ([key]) => !Object.keys(BUILTIN_REGISTRIES).includes(key),
    ),
  );

  // Write components.json.
  await fs.writeFile(
    targetPath,
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8",
  );
  componentSpinner.succeed();

  // // Add components.
  // const fullConfig = await resolveConfigPaths(options.cwd, config)
  // await addComponents(components, fullConfig, {
  //   // Init will always overwrite files.
  //   overwrite: true,
  //   silent: options.silent,
  //   baseStyle: options.baseStyle,
  //   isNewProject:
  //     options.isNewProject || projectInfo?.framework.name === "next-app",
  // })

  // // If a new project is using src dir, let's update the tailwind content config.
  // // TODO: Handle this per framework.
  // if (options.isNewProject && options.srcDir) {
  //   await updateTailwindContent(
  //     ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  //     fullConfig,
  //     {
  //       silent: options.silent,
  //     }
  //   )
  // }

  return fullConfig;
}
