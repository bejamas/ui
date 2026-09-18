import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import { Command } from "commander";
import { execa } from "execa";
import prompts from "prompts";

import { getConfig, getWorkspaceConfig } from "@/src/utils/get-config";
import {
  buildSubfolderMap,
  completeRegistryInstall,
  type SubfolderMapResult,
} from "@/src/utils/registry-install";
import { respondToShadcnPrompts } from "@/src/utils/shadcn-prompts";
import { highlighter } from "@/src/utils/highlighter";
import { logger } from "@/src/utils/logger";
import {
  BEJAMAS_REGISTRY_NAMESPACE,
  fetchRegistryTree,
  resolveBejamasRegistryItemName,
} from "@/src/utils/reorganize-components";
import {
  buildPinnedShadcnInvocation,
  ensurePinnedShadcnExecPrefix,
} from "@/src/utils/shadcn-cli";
import { spinner } from "@/src/utils/spinner";
import { resolveRegistryUrl } from "@/src/utils/ui-base-url";

interface ParsedOutput {
  created: string[];
  updated: string[];
  skipped: string[];
}

interface RegistryIndexEntry {
  name: string;
  type?: string;
}

export function isUiRegistryItem(item: { type?: string }) {
  return !item.type || item.type === "registry:ui";
}

export function isBlockRegistryItem(
  item: { type?: string } | null | undefined,
) {
  return item?.type === "registry:block";
}

/** Items a user can pick by name: UI components and blocks. */
export function isAddableRegistryItem(item: { type?: string }) {
  return isUiRegistryItem(item) || isBlockRegistryItem(item);
}

/** `--all` is expanded locally, so shadcn must not expand it a second time. */
export function withoutExpandedAllOption(forwardedOptions: string[]) {
  return forwardedOptions.filter(
    (option) => option !== "--all" && option !== "-a",
  );
}

/**
 * shadcn output is captured and re-reported by this command, and silent mode
 * would hide the file list needed for post-install repair.
 */
export function withoutShadcnSilentOption(forwardedOptions: string[]) {
  return forwardedOptions.filter(
    (option) => option !== "--silent" && option !== "-s",
  );
}

/**
 * shadcn only knows the registries declared in components.json. The built-in
 * `@bejamas/<item>` namespace is the default registry (REGISTRY_URL), so it is
 * passed to shadcn as the bare item name, which resolves to the styled payload.
 * Bare names, URLs, and third-party namespaces are passed through unchanged.
 */
export function toShadcnAddArgument(item: string) {
  if (!item.startsWith(BEJAMAS_REGISTRY_NAMESPACE)) return item;
  return resolveBejamasRegistryItemName(item) ?? item;
}

// Derive only the user-provided flags for shadcn to avoid losing options.
export function extractOptionsForShadcn(
  rawArgv: string[],
  cmd: Command,
): string[] {
  if (typeof cmd.getOptionValueSource === "function") {
    const opts = cmd.optsWithGlobals() as Record<string, unknown>;
    const forwarded: string[] = [];
    const getSource = (key: string) => cmd.getOptionValueSource(key);

    const addBoolean = (key: string, flag: string, negateFlag?: string) => {
      if (getSource(key) !== "cli") return;
      const value = opts[key];
      if (typeof value !== "boolean") return;
      if (value) {
        forwarded.push(flag);
      } else if (negateFlag) {
        forwarded.push(negateFlag);
      }
    };

    const addString = (key: string, flag: string) => {
      if (getSource(key) !== "cli") return;
      const value = opts[key];
      if (typeof value === "string") {
        forwarded.push(flag, value);
      }
    };

    const addOptionalString = (key: string, flag: string) => {
      if (getSource(key) !== "cli") return;
      const value = opts[key];
      if (value === true) {
        forwarded.push(flag);
        return;
      }
      if (typeof value === "string") {
        forwarded.push(flag, value);
      }
    };

    addBoolean("yes", "--yes");
    addBoolean("overwrite", "--overwrite");
    addBoolean("dryRun", "--dry-run");
    addString("cwd", "--cwd");
    addBoolean("all", "--all");
    addString("path", "--path");
    addBoolean("silent", "--silent");
    addBoolean("srcDir", "--src-dir", "--no-src-dir");
    addOptionalString("diff", "--diff");
    addOptionalString("view", "--view");

    const addIndex = rawArgv.findIndex((arg) => arg === "add");
    if (addIndex !== -1) {
      const rest = rawArgv.slice(addIndex + 1);
      const doubleDashIndex = rest.indexOf("--");
      if (doubleDashIndex !== -1) {
        forwarded.push(...rest.slice(doubleDashIndex));
      }
    }

    return forwarded;
  }

  const addIndex = rawArgv.findIndex((arg) => arg === "add");
  if (addIndex === -1) return [];
  const rest = rawArgv.slice(addIndex + 1);
  const forwarded: string[] = [];
  const optionsWithValues = new Set([
    "-c",
    "--cwd",
    "-p",
    "--path",
    "--diff",
    "--view",
  ]);
  const filteredFlags = new Set(["-v", "--verbose"]);

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token === "--") {
      forwarded.push("--", ...rest.slice(index + 1));
      break;
    }
    if (!token.startsWith("-")) continue;
    if (filteredFlags.has(token)) continue;

    forwarded.push(token);
    if (token.includes("=")) continue;

    if (optionsWithValues.has(token)) {
      const next = rest[index + 1];
      if (next) {
        forwarded.push(next);
        index += 1;
      }
    }
  }

  return forwarded;
}

export function hasInspectionFlags(forwardedOptions: string[]) {
  return (
    forwardedOptions.includes("--dry-run") ||
    forwardedOptions.includes("--diff") ||
    forwardedOptions.includes("--view")
  );
}

export function formatSkippedFilesHeading(
  count: number,
  overwriteUsed: boolean,
) {
  const noun = `file${count === 1 ? "" : "s"}`;
  if (overwriteUsed) {
    return `Skipped ${count} ${noun}: (files might be identical)`;
  }

  return `Skipped ${count} ${noun}: (files might be identical, use --overwrite to overwrite)`;
}

export function ensureTrailingNewline(output: string) {
  return output.endsWith("\n") ? output : `${output}\n`;
}

export function writeCapturedShadcnOutput(stdout: string, stderr: string) {
  if (stdout) {
    process.stdout.write(ensureTrailingNewline(stdout));
  }
  if (stderr) {
    process.stderr.write(ensureTrailingNewline(stderr));
  }
}

function rewritePaths(
  paths: string[],
  mapResult: SubfolderMapResult,
): string[] {
  const { uniqueMap, sharedFilenames } = mapResult;
  let currentSubfolder: string | null = null;

  return paths.map((filePath) => {
    const filename = path.basename(filePath);
    const parentDir = path.basename(path.dirname(filePath));
    const uniqueMapping = uniqueMap.get(filename);

    if (uniqueMapping) {
      const expectedSubfolder = path.dirname(uniqueMapping);
      currentSubfolder = expectedSubfolder;

      if (parentDir !== expectedSubfolder) {
        const dir = path.dirname(filePath);
        return `${dir}/${uniqueMapping}`;
      }

      return filePath;
    }

    if (sharedFilenames.has(filename) && currentSubfolder) {
      if (parentDir !== currentSubfolder) {
        const dir = path.dirname(filePath);
        return `${dir}/${currentSubfolder}/${filename}`;
      }
    }

    return filePath;
  });
}

async function fetchAvailableComponents(
  registryUrl: string,
): Promise<RegistryIndexEntry[]> {
  const indexUrl = `${registryUrl}/index.json`;
  const response = await fetch(indexUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch registry index: ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function promptForComponents(
  registryUrl: string,
): Promise<string[] | null> {
  const checkingSpinner = spinner("Checking registry.").start();

  let components: RegistryIndexEntry[];
  try {
    components = await fetchAvailableComponents(registryUrl);
    checkingSpinner.succeed();
  } catch {
    checkingSpinner.fail();
    logger.error("Failed to fetch available components from registry.");
    return null;
  }

  if (components.length === 0) {
    logger.warn("No components available in registry.");
    return null;
  }

  const choices = components.filter(isAddableRegistryItem).map((component) => ({
    title: component.name,
    value: component.name,
    description: isBlockRegistryItem(component) ? "block" : undefined,
  }));

  const { selected } = await prompts({
    type: "autocompleteMultiselect",
    name: "selected",
    message: "Which components or blocks would you like to add?",
    choices,
    hint: "- Space to select. Return to submit.",
    instructions: false,
  });

  if (!selected) {
    return null;
  }

  return selected;
}

export function parseShadcnOutput(
  stdout: string,
  stderr: string,
): ParsedOutput {
  const result: ParsedOutput = { created: [], updated: [], skipped: [] };
  const cleanStderr = stripVTControlCharacters(stderr);
  const cleanStdout = stripVTControlCharacters(stdout);
  // shadcn writes spinner summaries to stderr and file lists to stdout, but the
  // split has moved between releases, so look for the counts in both.
  const cleanOutput = `${cleanStdout}\n${cleanStderr}`;

  const createdMatch = cleanOutput.match(/Created\s+(\d+)\s+file/i);
  const updatedMatch = cleanOutput.match(/Updated\s+(\d+)\s+file/i);
  const skippedMatch = cleanOutput.match(/Skipped\s+(\d+)\s+file/i);

  const createdCount = createdMatch ? parseInt(createdMatch[1], 10) : 0;
  const updatedCount = updatedMatch ? parseInt(updatedMatch[1], 10) : 0;
  const skippedCount = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;

  const allPaths: string[] = [];
  for (const line of cleanStdout.split("\n")) {
    const match = line.match(/^\s+-\s+(.+)$/);
    if (match) {
      allPaths.push(match[1].trim());
    }
  }

  for (const line of cleanStderr.split("\n")) {
    const match = line.match(/^\s+-\s+(.+)$/);
    if (match) {
      const filePath = match[1].trim();
      if (!allPaths.includes(filePath)) {
        allPaths.push(filePath);
      }
    }
  }

  let index = 0;
  for (
    let count = 0;
    count < createdCount && index < allPaths.length;
    count += 1
  ) {
    result.created.push(allPaths[index]);
    index += 1;
  }
  for (
    let count = 0;
    count < updatedCount && index < allPaths.length;
    count += 1
  ) {
    result.updated.push(allPaths[index]);
    index += 1;
  }
  for (
    let count = 0;
    count < skippedCount && index < allPaths.length;
    count += 1
  ) {
    result.skipped.push(allPaths[index]);
    index += 1;
  }

  return result;
}

async function addComponents(
  cwd: string,
  packages: string[],
  forwardedOptions: string[],
  isVerbose: boolean,
  isSilent: boolean,
  inspectionMode: boolean,
): Promise<ParsedOutput> {
  const env = {
    ...process.env,
    REGISTRY_URL: resolveRegistryUrl(),
  };
  await ensurePinnedShadcnExecPrefix();
  const shadcnArgs = buildShadcnAddArgs(packages, forwardedOptions);
  const invocation = buildPinnedShadcnInvocation(shadcnArgs);

  if (isVerbose) {
    logger.info(`[bejamas-ui] ${invocation.cmd} ${invocation.args.join(" ")}`);
  }

  const registrySpinner = spinner("Checking registry.", { silent: isSilent });
  registrySpinner.start();

  try {
    const subprocess = execa(invocation.cmd, invocation.args, {
      cwd,
      env,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      reject: false,
    });
    respondToShadcnPrompts(subprocess);
    const result = await subprocess;

    registrySpinner.succeed();

    const installSpinner = spinner("Installing components.", {
      silent: isSilent,
    });
    installSpinner.succeed();

    const stdout = result.stdout || "";
    const stderr = result.stderr || "";

    if (isVerbose) {
      logger.info(`[bejamas-ui] Raw stdout: ${stdout}`);
      logger.info(`[bejamas-ui] Raw stderr: ${stderr}`);
    }

    if (inspectionMode) {
      writeCapturedShadcnOutput(stdout, stderr);
    }

    const parsed = inspectionMode
      ? { created: [], updated: [], skipped: [] }
      : parseShadcnOutput(stdout, stderr);

    if (result.exitCode !== 0) {
      if (!inspectionMode) {
        writeCapturedShadcnOutput(stdout, stderr);
      }
      process.exit(result.exitCode);
    }

    return parsed;
  } catch {
    registrySpinner.fail();
    logger.error("Failed to add components");
    process.exit(1);
  }
}

export function buildShadcnAddArgs(
  packages: string[],
  forwardedOptions: string[],
) {
  const autoFlags: string[] = [];
  if (!forwardedOptions.includes("--yes")) {
    autoFlags.push("--yes");
  }

  return ["add", ...packages, ...autoFlags, ...forwardedOptions];
}

export const add = new Command()
  .name("add")
  .description("Add components via the Bejamas-managed shadcn registry flow")
  .argument("[components...]", "Component package names to add")
  .option("-y, --yes", "skip confirmation prompt.", false)
  .option("-o, --overwrite", "overwrite existing files.", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option("-a, --all", "add all available components", false)
  .option("-p, --path <path>", "the path to add the component to.")
  .option("-s, --silent", "mute output.", false)
  .option("--dry-run", "preview changes without writing files.", false)
  .option("--diff [path]", "show diff for a file.")
  .option("--view [path]", "show file contents.")
  .option(
    "--src-dir",
    "use the src directory when creating a new project.",
    false,
  )
  .option(
    "--no-src-dir",
    "do not use the src directory when creating a new project.",
  )
  .action(async function action(packages: string[], _opts, cmd) {
    const root = cmd?.parent;
    const verbose = Boolean(root?.opts?.().verbose);
    const rawArgv = process.argv.slice(2);
    const forwardedOptions = extractOptionsForShadcn(rawArgv, cmd);
    const opts =
      typeof cmd.optsWithGlobals === "function"
        ? cmd.optsWithGlobals()
        : (cmd.opts?.() ?? {});
    const inspectionMode = hasInspectionFlags(forwardedOptions);
    const overwriteUsed =
      forwardedOptions.includes("--overwrite") ||
      forwardedOptions.includes("-o");
    const cwd = opts.cwd || process.cwd();

    let componentsToAdd = packages || [];
    const wantsAll = Boolean(opts.all);
    const expandsAll = wantsAll && componentsToAdd.length === 0;
    const isSilent = opts.silent || false;
    const registryUrl = resolveRegistryUrl();

    if (expandsAll) {
      const fetchingSpinner = spinner("Fetching available components.", {
        silent: isSilent,
      }).start();
      try {
        // Like shadcn, `--all` installs every UI component; blocks are opt-in.
        const allComponents = await fetchAvailableComponents(registryUrl);
        const uiComponents = allComponents.filter(isUiRegistryItem);
        componentsToAdd = uiComponents.map((component) => component.name);
        fetchingSpinner.succeed();
      } catch {
        fetchingSpinner.fail();
        logger.error("Failed to fetch available components from registry.");
        process.exit(1);
      }
    }

    if (componentsToAdd.length === 0) {
      const selected = await promptForComponents(registryUrl);
      if (!selected || selected.length === 0) {
        return;
      }
      componentsToAdd = selected;
    }

    const config = await getConfig(cwd);
    let uiDir = config?.resolvedPaths?.ui || "";
    let uiConfig = config;

    if (config) {
      const workspaceConfig = await getWorkspaceConfig(config);
      if (workspaceConfig?.ui) {
        uiConfig = workspaceConfig.ui;
        uiDir = uiConfig.resolvedPaths?.ui || uiDir;
      }
    }

    if (verbose) {
      logger.info(`[bejamas-ui] cwd: ${cwd}`);
      logger.info(`[bejamas-ui] uiDir: ${uiDir}`);
      logger.info(
        `[bejamas-ui] aliases.ui: ${uiConfig?.aliases?.ui || "not set"}`,
      );
    }

    const activeStyle = uiConfig?.style || config?.style || "bejamas-juno";
    const totalComponents = componentsToAdd.length;
    const outputBearingOptions = withoutShadcnSilentOption(forwardedOptions);
    const addOptions = expandsAll
      ? withoutExpandedAllOption(outputBearingOptions)
      : outputBearingOptions;

    for (let index = 0; index < componentsToAdd.length; index += 1) {
      const component = componentsToAdd[index];

      if (totalComponents > 1 && !isSilent) {
        logger.break();
        logger.info(
          highlighter.info(`[${index + 1}/${totalComponents}]`) +
            ` Adding ${highlighter.success(component)}...`,
        );
      }

      const items = inspectionMode
        ? []
        : await fetchRegistryTree([component], registryUrl, activeStyle);
      const subfolderMapResult = buildSubfolderMap(items);

      const parsed = await addComponents(
        cwd,
        [toShadcnAddArgument(component)],
        addOptions,
        verbose,
        isSilent,
        inspectionMode,
      );
      if (inspectionMode) continue;

      const { skippedFiles } = await completeRegistryInstall({
        cwd,
        config,
        uiConfig,
        uiDir,
        items,
        reportedFiles: [
          ...parsed.created,
          ...parsed.updated,
          ...parsed.skipped,
        ],
        verbose,
        overwrite: overwriteUsed,
      });
      const skippedCount = skippedFiles.length;

      if (!isSilent) {
        const actuallyCreated = Math.max(
          0,
          parsed.created.length - skippedCount,
        );

        if (actuallyCreated > 0) {
          const createdPaths = rewritePaths(
            parsed.created.slice(0, actuallyCreated),
            subfolderMapResult,
          );
          logger.success(
            `Created ${createdPaths.length} file${createdPaths.length > 1 ? "s" : ""}:`,
          );
          for (const file of createdPaths) {
            logger.log(`  ${highlighter.info("-")} ${file}`);
          }
        }

        if (parsed.updated.length > 0) {
          const uniqueUpdated = Array.from(new Set(parsed.updated));
          const updatedPaths = rewritePaths(uniqueUpdated, subfolderMapResult);
          logger.info(
            `Updated ${updatedPaths.length} file${updatedPaths.length > 1 ? "s" : ""}:`,
          );
          for (const file of updatedPaths) {
            logger.log(`  ${highlighter.info("-")} ${file}`);
          }
        }

        if (skippedCount > 0) {
          logger.info(
            `Skipped ${skippedCount} file${skippedCount > 1 ? "s" : ""}: (already exists)`,
          );
        }

        if (parsed.skipped.length > 0) {
          const skippedPaths = rewritePaths(parsed.skipped, subfolderMapResult);
          logger.info(
            formatSkippedFilesHeading(skippedPaths.length, overwriteUsed),
          );
          for (const file of skippedPaths) {
            logger.log(`  ${highlighter.info("-")} ${file}`);
          }
        }

        if (
          actuallyCreated === 0 &&
          parsed.updated.length === 0 &&
          skippedCount === 0 &&
          parsed.skipped.length === 0
        ) {
          logger.info("Already up to date.");
        }
      }
    }
  });
