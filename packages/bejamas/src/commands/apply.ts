import path from "node:path";
import { Command } from "commander";
import fs from "fs-extra";
import prompts from "prompts";
import { z } from "zod";

import {
  buildInitUrl,
  fetchInitThemeVars,
  resolveDesignSystemConfig,
  runExistingProjectInit,
} from "@/src/commands/init";
import { clearRegistryContext } from "@/src/registry/context";
import {
  applyDesignSystemFontToProject,
  applyDesignSystemThemeToProject,
} from "@/src/utils/apply-design-system";
import { fixAstroImports } from "@/src/utils/astro-imports";
import * as ERRORS from "@/src/utils/errors";
import {
  createFileBackup,
  deleteFileBackup,
  FileBackupError,
  restoreFileBackup,
} from "@/src/utils/file-helper";
import {
  getConfig,
  getWorkspaceConfig,
  type Config,
} from "@/src/utils/get-config";
import {
  formatMonorepoMessage,
  getMonorepoTargets,
  isMonorepoRoot,
} from "@/src/utils/get-monorepo-info";
import { getProjectInfo } from "@/src/utils/get-project-info";
import { handleError } from "@/src/utils/handle-error";
import { highlighter } from "@/src/utils/highlighter";
import { getInstalledUiComponents } from "@/src/utils/installed-ui-components";
import { logger } from "@/src/utils/logger";
import { buildUiUrl } from "@/src/utils/ui-base-url";
import {
  decodePreset,
  isPresetCode,
  type DesignSystemConfig,
} from "@bejamas/create-config/server";

export const applyOptionsSchema = z.object({
  cwd: z.string(),
  positionalPreset: z.string().optional(),
  preset: z.string().optional(),
  only: z.union([z.boolean(), z.string()]).optional(),
  yes: z.boolean(),
  silent: z.boolean(),
});

const APPLY_ONLY_VALUES = ["theme", "font"] as const;
type ApplyOnlyValue = (typeof APPLY_ONLY_VALUES)[number];

export class ApplyOnlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplyOnlyError";
  }
}

export class ApplyPresetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplyPresetError";
  }
}

class ApplyWorkspaceSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplyWorkspaceSyncError";
  }
}

type ResolvedApplyPreset = {
  only?: string;
  preset: string;
  themeRef?: string;
};

export const apply = new Command()
  .name("apply")
  .description("apply a preset to an existing project")
  .argument("[preset]", "the preset to apply")
  .option("--preset <preset>", "preset configuration to apply")
  .option("--only [parts]", "apply only parts of a preset: theme, font")
  .option("-y, --yes", "skip confirmation prompt.", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option("-s, --silent", "mute output.", false)
  .action(async (positionalPreset, opts) => {
    try {
      const options = applyOptionsSchema.parse({
        ...opts,
        cwd: path.resolve(opts.cwd),
        positionalPreset,
      });
      const rawPreset = resolveApplyPreset(options);
      const explicitOnly = resolveApplyOnly(options.only);
      validateApplyOnlyPreset({ preset: rawPreset, only: explicitOnly });

      const preflight = await preFlightApply(options);

      if (preflight.errors[ERRORS.MISSING_DIR_OR_EMPTY_PROJECT]) {
        logger.break();
        logger.error(
          `The ${highlighter.info(
            "apply",
          )} command only works in an existing project.`,
        );
        logger.error(
          `Run ${highlighter.info(getInitCommand(rawPreset))} first.`,
        );
        logger.break();
        process.exit(1);
      }

      if (preflight.errors[ERRORS.MISSING_CONFIG]) {
        logger.break();
        logger.error(
          `No ${highlighter.info("components.json")} found at ${highlighter.info(
            options.cwd,
          )}.`,
        );
        logger.error(
          `Run ${highlighter.info(getInitCommand(rawPreset))} first.`,
        );
        logger.break();
        process.exit(1);
      }

      const existingConfig = preflight.config;
      if (!existingConfig) {
        process.exit(1);
      }

      if (!rawPreset) {
        await printPresetBuilderGuidance(options);
        process.exit(0);
      }

      const resolvedPreset = resolveApplyPresetSource(rawPreset);
      const only =
        explicitOnly ??
        resolveApplyOnly(resolvedPreset.only ?? getPresetUrlOnly(rawPreset));
      const designConfig = resolveApplyDesignSystemConfig(
        resolvedPreset,
        existingConfig,
      );

      await confirmApply({
        cwd: options.cwd,
        only,
        silent: options.silent,
        yes: options.yes,
      });

      const configPaths = await getApplyConfigPaths(existingConfig);
      await withFileBackups(configPaths, async () => {
        if (only) {
          await runPartialApply(
            options.cwd,
            designConfig,
            resolvedPreset,
            only,
          );
        } else {
          await runExistingProjectInit(
            {
              cwd: options.cwd,
              components: undefined,
              yes: true,
              reinstall: true,
              defaults: false,
              force: false,
              silent: options.silent,
              isNewProject: false,
              srcDir: false,
              cssVariables: true,
              template: "astro",
              preset: resolvedPreset.preset,
              baseColor: undefined,
              baseStyle: true,
              rtl: existingConfig.rtl ?? false,
              lang: undefined,
              themeRef: resolvedPreset.themeRef,
              forwardedOptions: ["--yes", "--force"],
            },
            designConfig,
          );
        }

        const config = await getConfig(options.cwd);
        if (!config) {
          throw new Error(
            "Could not read components.json after applying preset.",
          );
        }

        await syncApplyWorkspaceConfigs(config, { only });
      });

      if (!options.silent) {
        logger.break();
        logger.log("Preset applied successfully.");
        logger.break();
      }
    } catch (error) {
      if (
        error instanceof ApplyOnlyError ||
        error instanceof ApplyPresetError
      ) {
        for (const line of error.message.split("\n")) {
          logger.error(line);
        }
        logger.break();
        process.exit(1);
      }

      if (error instanceof FileBackupError) {
        logger.error(
          `Could not back up ${highlighter.info("components.json")}. Aborting.`,
        );
        logger.break();
        process.exit(1);
      }

      if (error instanceof ApplyWorkspaceSyncError) {
        logger.error(error.message);
        logger.break();
        process.exit(1);
      }

      logger.break();
      handleError(error);
    } finally {
      clearRegistryContext();
    }
  });

export function resolveApplyPreset(
  options: z.infer<typeof applyOptionsSchema>,
) {
  const positionalPreset = options.positionalPreset?.trim();
  const flagPreset = options.preset?.trim();

  if (positionalPreset && flagPreset && positionalPreset !== flagPreset) {
    throw new ApplyPresetError(
      `Received two different preset values. Use either the positional preset or ${highlighter.info(
        "--preset",
      )}, or pass the same value to both.`,
    );
  }

  return flagPreset ?? positionalPreset;
}

export function getPresetUrlOnly(preset: string) {
  if (!isUrl(preset)) {
    return undefined;
  }

  return new URL(preset).searchParams.get("only") ?? undefined;
}

export function resolveApplyOnly(
  value: z.infer<typeof applyOptionsSchema>["only"],
) {
  if (value === undefined || value === false) {
    return undefined;
  }

  if (value === true) {
    throw new ApplyOnlyError(
      [
        "Missing value for --only.",
        `Use one or more of: ${APPLY_ONLY_VALUES.join(", ")}.`,
        "Example: bejamas apply <preset> --only theme,font.",
      ].join("\n"),
    );
  }

  return parseApplyOnlyParts(value);
}

export function parseApplyOnlyParts(value: string) {
  const aliases: Record<string, ApplyOnlyValue> = {
    theme: "theme",
    font: "font",
    fonts: "font",
  };
  const parts = value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const invalid = parts.filter((part) => !aliases[part]);

  if (!parts.length || invalid.length) {
    throw new ApplyOnlyError(
      [
        `Invalid value for --only: ${value}.`,
        `Use one or more of: ${APPLY_ONLY_VALUES.join(", ")}.`,
        "Example: bejamas apply <preset> --only theme,font.",
      ].join("\n"),
    );
  }

  return Array.from(new Set(parts.map((part) => aliases[part])));
}

export function validateApplyOnlyPreset(options: {
  only?: ApplyOnlyValue[];
  preset?: string;
}) {
  if (!options.only || options.preset) {
    return;
  }

  throw new ApplyOnlyError(
    [
      "Missing preset for --only.",
      "Use: bejamas apply <preset> --only theme,font.",
    ].join("\n"),
  );
}

export function resolveApplyPresetSource(preset: string): ResolvedApplyPreset {
  if (isPresetCode(preset)) {
    validatePresetCode(preset);
    return { preset };
  }

  if (!isUrl(preset)) {
    throw new ApplyPresetError(
      `Invalid preset: ${highlighter.info(
        preset,
      )}. Use a preset code or a Bejamas create/init URL containing a preset code.`,
    );
  }

  const url = new URL(preset);

  if (!isSupportedPresetUrl(url)) {
    throw new ApplyPresetError(
      `Invalid preset URL: ${highlighter.info(
        preset,
      )}. Use a Bejamas create or init URL containing a preset code.`,
    );
  }

  const code = url.searchParams.get("preset")?.trim();

  if (!code) {
    throw new ApplyPresetError(
      `Invalid preset URL: ${highlighter.info(
        preset,
      )}. Expected a URL containing a preset query parameter.`,
    );
  }

  validatePresetCode(code);

  return {
    preset: code,
    themeRef: url.searchParams.get("themeRef") ?? undefined,
    only: url.searchParams.get("only") ?? undefined,
  };
}

async function preFlightApply(options: { cwd: string }) {
  const errors: Record<string, boolean> = {};

  if (
    !fs.existsSync(options.cwd) ||
    !fs.existsSync(path.resolve(options.cwd, "package.json"))
  ) {
    errors[ERRORS.MISSING_DIR_OR_EMPTY_PROJECT] = true;
    return {
      errors,
      config: null,
    };
  }

  if (!fs.existsSync(path.resolve(options.cwd, "components.json"))) {
    if (await isMonorepoRoot(options.cwd)) {
      const targets = await getMonorepoTargets(options.cwd);
      const applyTargets = [];

      for (const target of targets) {
        const projectInfo = await getProjectInfo(
          path.resolve(options.cwd, target.name),
        );
        if (target.hasConfig || projectInfo?.isAstro) {
          applyTargets.push(target);
        }
      }

      if (applyTargets.length > 0) {
        formatMonorepoMessage("apply --preset <preset>", applyTargets, {
          binary: "bejamas",
          cwdFlag: "-c",
        });
        process.exit(1);
      }
    }

    errors[ERRORS.MISSING_CONFIG] = true;
    return {
      errors,
      config: null,
    };
  }

  try {
    const config = await getConfig(options.cwd);

    return {
      errors,
      config,
    };
  } catch {
    logger.break();
    logger.error(
      `An invalid ${highlighter.info(
        "components.json",
      )} file was found at ${highlighter.info(
        options.cwd,
      )}.\nBefore you can apply a preset, you must create a valid ${highlighter.info(
        "components.json",
      )} file by running the ${highlighter.info("init")} command.`,
    );
    logger.break();
    process.exit(1);
  }
}

async function printPresetBuilderGuidance(options: {
  silent: boolean;
  yes: boolean;
}) {
  if (options.silent) {
    return;
  }

  const createUrl = buildUiUrl("/create");

  logger.break();
  logger.log(`Build your custom preset on ${highlighter.info(createUrl)}.`);
  logger.log(
    `Then run ${highlighter.info(
      "bejamas apply --preset <preset>",
    )} with the preset code or preset URL from ui.bejamas.com.`,
  );
  logger.break();
}

async function confirmApply(options: {
  cwd: string;
  only?: ApplyOnlyValue[];
  silent: boolean;
  yes: boolean;
}) {
  if (options.yes) {
    return;
  }

  logger.break();
  if (!options.only) {
    logger.warn(
      highlighter.warn(
        "Applying a new preset will overwrite existing UI components, fonts, and CSS variables.",
      ),
    );
  } else {
    logger.warn(
      highlighter.warn(
        "Applying the selected preset parts will update your project configuration and styles.",
      ),
    );
  }
  logger.warn(
    "Commit or stash your changes before continuing so you can easily go back.",
  );

  if (!options.only) {
    const reinstallComponents = await getInstalledUiComponents(options.cwd);

    logger.break();
    logger.log("  The following components will be re-installed:");
    if (reinstallComponents.length) {
      for (let index = 0; index < reinstallComponents.length; index += 8) {
        logger.log(
          `  - ${reinstallComponents.slice(index, index + 8).join(", ")}`,
        );
      }
    } else {
      logger.log("  - No installed UI components were detected.");
    }
  }

  logger.break();

  const { proceed } = await prompts({
    type: "confirm",
    name: "proceed",
    message: "Would you like to continue?",
    initial: false,
  });

  if (!proceed) {
    logger.break();
    process.exit(1);
  }
}

async function runPartialApply(
  cwd: string,
  designConfig: DesignSystemConfig,
  preset: ResolvedApplyPreset,
  only: ApplyOnlyValue[],
) {
  if (only.includes("theme")) {
    const initUrl = buildInitUrl(designConfig, preset.themeRef);
    const themeVars = preset.themeRef
      ? ((await fetchInitThemeVars(initUrl)) ?? undefined)
      : undefined;

    await applyDesignSystemThemeToProject(cwd, designConfig, { themeVars });
    await fixAstroImports(cwd, false);
  }

  if (only.includes("font")) {
    await applyDesignSystemFontToProject(cwd, designConfig);
  }
}

function resolveApplyDesignSystemConfig(
  preset: Pick<ResolvedApplyPreset, "preset">,
  existingConfig: Pick<Config, "rtl">,
) {
  return resolveDesignSystemConfig({
    preset: preset.preset,
    template: "astro",
    rtl: existingConfig.rtl ?? false,
    baseColor: undefined,
    lang: undefined,
  });
}

function validatePresetCode(preset: string) {
  if (!isPresetCode(preset) || !decodePreset(preset)) {
    throw new ApplyPresetError(
      `Invalid preset code: ${highlighter.info(preset)}.`,
    );
  }
}

async function getApplyConfigPaths(config: Config) {
  const configPaths = new Set<string>([
    path.resolve(config.resolvedPaths.cwd, "components.json"),
  ]);
  const workspaceConfig = await getWorkspaceConfig(config);

  if (workspaceConfig) {
    for (const linkedConfig of Object.values(workspaceConfig)) {
      configPaths.add(
        path.resolve(linkedConfig.resolvedPaths.cwd, "components.json"),
      );
    }
  }

  const existingPaths = [];
  for (const configPath of configPaths) {
    if (await fs.pathExists(configPath)) {
      existingPaths.push(configPath);
    }
  }

  return existingPaths.sort();
}

async function withFileBackups<T>(filePaths: string[], task: () => Promise<T>) {
  const backedUpPaths: string[] = [];
  const restoreBackupOnExit = () => {
    for (const filePath of [...backedUpPaths].reverse()) {
      restoreFileBackup(filePath);
    }
  };

  try {
    for (const filePath of filePaths) {
      const backupPath = createFileBackup(filePath);
      if (!backupPath) {
        throw new FileBackupError(filePath);
      }
      backedUpPaths.push(filePath);
    }

    process.on("exit", restoreBackupOnExit);

    const result = await task();

    process.removeListener("exit", restoreBackupOnExit);
    for (const filePath of backedUpPaths) {
      deleteFileBackup(filePath);
    }

    return result;
  } catch (error) {
    process.removeListener("exit", restoreBackupOnExit);
    for (const filePath of [...backedUpPaths].reverse()) {
      restoreFileBackup(filePath);
    }
    throw error;
  }
}

async function syncApplyWorkspaceConfigs(
  config: Config,
  options: {
    only?: ApplyOnlyValue[];
  },
) {
  if (options.only && !options.only.includes("theme")) {
    return;
  }

  const linkedConfigs = await getApplyWorkspaceConfigs(config);
  if (!linkedConfigs.length) {
    return;
  }

  const patch = {
    style: config.style,
    tailwind: {
      baseColor: config.tailwind.baseColor,
      cssVariables: config.tailwind.cssVariables,
    },
    ...(config.iconLibrary ? { iconLibrary: config.iconLibrary } : {}),
    ...(config.rtl !== undefined ? { rtl: config.rtl } : {}),
    ...(config.menuColor ? { menuColor: config.menuColor } : {}),
    ...(config.menuAccent ? { menuAccent: config.menuAccent } : {}),
  };

  try {
    for (const linkedConfig of linkedConfigs) {
      const configPath = path.resolve(
        linkedConfig.resolvedPaths.cwd,
        "components.json",
      );
      if (!(await fs.pathExists(configPath))) {
        continue;
      }

      const existingConfig = await fs.readJson(configPath);
      await fs.writeJson(
        configPath,
        {
          ...existingConfig,
          ...patch,
          tailwind: {
            ...existingConfig.tailwind,
            ...patch.tailwind,
          },
        },
        { spaces: 2 },
      );
    }
  } catch (error) {
    throw new ApplyWorkspaceSyncError(
      `Failed to sync linked workspace configs.${error instanceof Error ? ` ${error.message}` : ""}`,
    );
  }
}

async function getApplyWorkspaceConfigs(config: Config) {
  const workspaceConfig = await getWorkspaceConfig(config);
  if (!workspaceConfig) {
    return [];
  }

  const linkedConfigs = new Map<string, Config>();

  for (const linkedConfig of Object.values(workspaceConfig)) {
    if (linkedConfig.resolvedPaths.cwd === config.resolvedPaths.cwd) {
      continue;
    }

    linkedConfigs.set(linkedConfig.resolvedPaths.cwd, linkedConfig);
  }

  return Array.from(linkedConfigs.values()).sort((a, b) =>
    a.resolvedPaths.cwd.localeCompare(b.resolvedPaths.cwd),
  );
}

function quoteShellArg(value: string) {
  return /[^A-Za-z0-9_./:-]/.test(value) ? JSON.stringify(value) : value;
}

function getInitCommand(preset?: string) {
  if (!preset) {
    return "bejamas init";
  }

  return `bejamas init --preset ${quoteShellArg(preset)}`;
}

function isUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isSupportedPresetUrl(url: URL) {
  const pathname = url.pathname.replace(/\/+$/, "");

  return pathname === "/create" || pathname === "/init";
}
