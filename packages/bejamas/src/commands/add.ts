import path from "node:path";
import { Command } from "commander";
import { execa } from "execa";
import prompts from "prompts";
import { logger } from "@/src/utils/logger";
import { spinner } from "@/src/utils/spinner";
import { highlighter } from "@/src/utils/highlighter";
import { getPackageRunner } from "@/src/utils/get-package-manager";
import { fixAstroImports } from "@/src/utils/astro-imports";
import { getConfig, getWorkspaceConfig } from "@/src/utils/get-config";
import {
  reorganizeComponents,
  fetchRegistryItem,
  getSubfolderFromPaths,
} from "@/src/utils/reorganize-components";

interface ParsedOutput {
  created: string[];
  updated: string[];
  skipped: string[];
}

// Default fallback registry endpoint for shadcn (expects /r)
const DEFAULT_REGISTRY_URL = "https://ui.bejamas.com/r";

// Derive only the user-provided flags for shadcn to avoid losing options
function extractOptionsForShadcn(rawArgv: string[], cmd: Command): string[] {
  // Prefer commander metadata when available so we only forward options that
  // were explicitly set (avoids defaults and keeps aliases consistent).
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

    addBoolean("yes", "--yes");
    addBoolean("overwrite", "--overwrite");
    addString("cwd", "--cwd");
    addBoolean("all", "--all");
    addString("path", "--path");
    addBoolean("silent", "--silent");
    addBoolean("srcDir", "--src-dir", "--no-src-dir");

    // Preserve any explicit passthrough after "--" for shadcn.
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

  // Fallback: lightweight parser that only forwards known options.
  const addIndex = rawArgv.findIndex((arg) => arg === "add");
  if (addIndex === -1) return [];
  const rest = rawArgv.slice(addIndex + 1);
  const forwarded: string[] = [];
  const optionsWithValues = new Set(["-c", "--cwd", "-p", "--path"]);
  const filteredFlags = new Set(["-v", "--verbose"]);

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === "--") {
      forwarded.push("--", ...rest.slice(i + 1));
      break;
    }
    if (!token.startsWith("-")) continue;
    if (filteredFlags.has(token)) continue;

    forwarded.push(token);
    if (token.includes("=")) continue;

    if (optionsWithValues.has(token)) {
      const next = rest[i + 1];
      if (next) {
        forwarded.push(next);
        i += 1;
      }
    }
  }
  return forwarded;
}

interface ComponentFileInfo {
  subfolder: string;
  files: string[]; // All filenames for this component
}

interface SubfolderMapResult {
  // Maps unique filename -> subfolder/filename
  uniqueMap: Map<string, string>;
  // Maps component subfolder -> all its files (for grouping)
  componentInfo: Map<string, ComponentFileInfo>;
  // Set of shared filenames (like index.ts) that appear in multiple components
  sharedFilenames: Set<string>;
}

/** Build maps for path rewriting, handling filename collisions */
async function buildSubfolderMap(
  components: string[],
  registryUrl: string,
): Promise<SubfolderMapResult> {
  const filenameToSubfolders = new Map<string, string[]>();
  const componentInfo = new Map<string, ComponentFileInfo>();

  // First pass: collect all filename -> subfolder mappings
  for (const componentName of components) {
    const registryItem = await fetchRegistryItem(componentName, registryUrl);
    if (!registryItem) continue;

    const subfolder = getSubfolderFromPaths(registryItem.files);
    if (!subfolder) continue;

    const files: string[] = [];
    for (const file of registryItem.files) {
      if (file.type === "registry:ui") {
        const filename = path.basename(file.path);
        files.push(filename);

        // Track which subfolders each filename appears in
        const subfolders = filenameToSubfolders.get(filename) || [];
        subfolders.push(subfolder);
        filenameToSubfolders.set(filename, subfolders);
      }
    }

    componentInfo.set(subfolder, { subfolder, files });
  }

  // Build the unique map (only filenames that appear once)
  const uniqueMap = new Map<string, string>();
  const sharedFilenames = new Set<string>();

  filenameToSubfolders.forEach((subfolders, filename) => {
    if (subfolders.length === 1) {
      // Unique filename - safe to map directly
      uniqueMap.set(filename, `${subfolders[0]}/${filename}`);
    } else {
      // Shared filename (like index.ts) - track for context-based rewriting
      sharedFilenames.add(filename);
    }
  });

  return { uniqueMap, componentInfo, sharedFilenames };
}

/**
 * Rewrite file paths to include correct subfolders.
 * Handles shared filenames (like index.ts) by tracking current component context.
 */
function rewritePaths(
  paths: string[],
  mapResult: SubfolderMapResult,
): string[] {
  const { uniqueMap, componentInfo, sharedFilenames } = mapResult;
  let currentSubfolder: string | null = null;

  return paths.map((filePath) => {
    const filename = path.basename(filePath);
    const parentDir = path.basename(path.dirname(filePath));

    // Check if this is a unique filename (can map directly)
    const uniqueMapping = uniqueMap.get(filename);
    if (uniqueMapping) {
      const expectedSubfolder = path.dirname(uniqueMapping);

      // Update current context for subsequent shared files
      currentSubfolder = expectedSubfolder;

      // Only rewrite if not already in the correct subfolder
      if (parentDir !== expectedSubfolder) {
        const dir = path.dirname(filePath);
        return `${dir}/${uniqueMapping}`;
      }
      return filePath;
    }

    // Check if this is a shared filename (like index.ts)
    if (sharedFilenames.has(filename) && currentSubfolder) {
      // Use the current component context
      const expectedSubfolder = currentSubfolder;

      // Only rewrite if not already in the correct subfolder
      if (parentDir !== expectedSubfolder) {
        const dir = path.dirname(filePath);
        return `${dir}/${expectedSubfolder}/${filename}`;
      }
    }

    return filePath;
  });
}

/** Fetch available components from the registry */
async function fetchAvailableComponents(
  registryUrl: string,
): Promise<{ name: string; type?: string }[]> {
  const indexUrl = `${registryUrl}/index.json`;
  const response = await fetch(indexUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch registry index: ${response.statusText}`);
  }
  const data = await response.json();
  // Registry index is an array of objects with at least a name property
  return Array.isArray(data) ? data : [];
}

/** Prompt user to select components interactively */
async function promptForComponents(
  registryUrl: string,
): Promise<string[] | null> {
  const checkingSpinner = spinner("Checking registry.").start();

  let components: { name: string; type?: string }[];
  try {
    components = await fetchAvailableComponents(registryUrl);
    checkingSpinner.succeed();
  } catch (error) {
    checkingSpinner.fail();
    logger.error("Failed to fetch available components from registry.");
    return null;
  }

  if (components.length === 0) {
    logger.warn("No components available in registry.");
    return null;
  }

  // Filter to only ui:* type components if type info is available
  const uiComponents = components.filter(
    (c) => !c.type || c.type === "registry:ui",
  );

  const choices = uiComponents.map((c) => ({
    title: c.name,
    value: c.name,
  }));

  const { selected } = await prompts({
    type: "autocompleteMultiselect",
    name: "selected",
    message: "Which components would you like to add?",
    choices,
    hint: "- Space to select. Return to submit.",
    instructions: false,
  });

  // User cancelled (Ctrl+C)
  if (!selected) {
    return null;
  }

  return selected;
}

/** Parse shadcn output to extract file lists (stdout has paths, stderr has headers) */
function parseShadcnOutput(stdout: string, stderr: string): ParsedOutput {
  const result: ParsedOutput = { created: [], updated: [], skipped: [] };

  // Remove ANSI escape codes for parsing
  const cleanStderr = stderr.replace(/\x1b\[[0-9;]*m/g, "");
  const cleanStdout = stdout.replace(/\x1b\[[0-9;]*m/g, "");

  // Extract counts from stderr headers
  // Matches patterns like "✔ Created 4 files:" or "ℹ Skipped 2 files:"
  const createdMatch = cleanStderr.match(/Created\s+(\d+)\s+file/i);
  const updatedMatch = cleanStderr.match(/Updated\s+(\d+)\s+file/i);
  const skippedMatch = cleanStderr.match(/Skipped\s+(\d+)\s+file/i);

  const createdCount = createdMatch ? parseInt(createdMatch[1], 10) : 0;
  const updatedCount = updatedMatch ? parseInt(updatedMatch[1], 10) : 0;
  const skippedCount = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;

  // Extract file paths from stdout (lines starting with "  - ")
  const allPaths: string[] = [];
  for (const line of cleanStdout.split("\n")) {
    const match = line.match(/^\s+-\s+(.+)$/);
    if (match) {
      allPaths.push(match[1].trim());
    }
  }

  // Also check stderr for file paths (some shadcn versions output there)
  for (const line of cleanStderr.split("\n")) {
    const match = line.match(/^\s+-\s+(.+)$/);
    if (match) {
      const filePath = match[1].trim();
      // Avoid duplicates
      if (!allPaths.includes(filePath)) {
        allPaths.push(filePath);
      }
    }
  }

  // Assign paths to sections based on counts (order: created, updated, skipped)
  let idx = 0;
  for (let i = 0; i < createdCount && idx < allPaths.length; i++) {
    result.created.push(allPaths[idx++]);
  }
  for (let i = 0; i < updatedCount && idx < allPaths.length; i++) {
    result.updated.push(allPaths[idx++]);
  }
  for (let i = 0; i < skippedCount && idx < allPaths.length; i++) {
    result.skipped.push(allPaths[idx++]);
  }

  return result;
}

async function addComponents(
  packages: string[],
  forwardedOptions: string[],
  isVerbose: boolean,
  isSilent: boolean,
  subfolderMapResult: SubfolderMapResult,
): Promise<ParsedOutput> {
  const runner = await getPackageRunner(process.cwd());
  const env = {
    ...process.env,
    REGISTRY_URL: process.env.REGISTRY_URL || DEFAULT_REGISTRY_URL,
  };
  // Always pass --yes for non-interactive mode (skips "Add components?" confirmation)
  // Note: we don't pass --overwrite by default to respect user customizations
  const autoFlags: string[] = [];
  if (!forwardedOptions.includes("--yes")) {
    autoFlags.push("--yes");
  }
  const baseArgs = [
    "shadcn@latest",
    "add",
    ...packages,
    ...autoFlags,
    ...forwardedOptions,
  ];

  let cmd = "npx";
  let args: string[] = ["-y", ...baseArgs];
  if (runner === "bunx") {
    cmd = "bunx";
    args = baseArgs;
  } else if (runner === "pnpm dlx") {
    cmd = "pnpm";
    args = ["dlx", ...baseArgs];
  } else if (runner === "npx") {
    cmd = "npx";
    args = ["-y", ...baseArgs];
  }

  if (isVerbose) {
    logger.info(`[bejamas-ui] ${cmd} ${args.join(" ")}`);
  }

  // Show our own spinner for checking registry
  const registrySpinner = spinner("Checking registry.", { silent: isSilent });
  registrySpinner.start();

  try {
    // Run shadcn and capture output
    // Pipe "n" to stdin to answer "no" to any overwrite prompts (respects user customizations)
    const result = await execa(cmd, args, {
      env,
      input: "n\nn\nn\nn\nn\nn\nn\nn\nn\nn\n", // Answer "no" to up to 10 overwrite prompts
      stdout: "pipe",
      stderr: "pipe",
      reject: false,
    });

    registrySpinner.succeed();

    // Show installing spinner (already done at this point)
    const installSpinner = spinner("Installing components.", {
      silent: isSilent,
    });
    installSpinner.succeed();

    // Parse the output to get file lists (stdout has paths, stderr has headers)
    const stdout = result.stdout || "";
    const stderr = result.stderr || "";

    if (isVerbose) {
      logger.info(`[bejamas-ui] Raw stdout: ${stdout}`);
      logger.info(`[bejamas-ui] Raw stderr: ${stderr}`);
    }

    const parsed = parseShadcnOutput(stdout, stderr);

    // Return parsed data - display is handled by caller after reorganization
    // This allows accurate reporting (shadcn says "created" but we may skip)

    if (result.exitCode !== 0) {
      // Show any error output
      if (result.stderr) {
        logger.error(result.stderr);
      }
      process.exit(result.exitCode);
    }

    return parsed;
  } catch (err) {
    registrySpinner.fail();
    logger.error("Failed to add components");
    process.exit(1);
  }
}

export const add = new Command()
  .name("add")
  .description("Add components via shadcn@latest using registry URLs")
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
  .option(
    "--src-dir",
    "use the src directory when creating a new project.",
    false,
  )
  .option(
    "--no-src-dir",
    "do not use the src directory when creating a new project.",
  )
  // .option("--css-variables", "use css variables for theming.", true)
  // .option("--no-css-variables", "do not use css variables for theming.")
  .action(async function action(packages: string[], _opts, cmd) {
    const root = cmd?.parent;
    const verbose = Boolean(root?.opts?.().verbose);
    const rawArgv = process.argv.slice(2);
    const forwardedOptions = extractOptionsForShadcn(rawArgv, cmd);
    const opts =
      typeof cmd.optsWithGlobals === "function"
        ? cmd.optsWithGlobals()
        : (cmd.opts?.() ?? {});
    const cwd = opts.cwd || process.cwd();

    let componentsToAdd = packages || [];
    const wantsAll = Boolean(opts.all);
    const isSilent = opts.silent || false;
    const registryUrl = process.env.REGISTRY_URL || DEFAULT_REGISTRY_URL;

    // Handle --all flag: fetch all available components
    if (wantsAll && componentsToAdd.length === 0) {
      const fetchingSpinner = spinner("Fetching available components.", {
        silent: isSilent,
      }).start();
      try {
        const allComponents = await fetchAvailableComponents(registryUrl);
        const uiComponents = allComponents.filter(
          (c) => !c.type || c.type === "registry:ui",
        );
        componentsToAdd = uiComponents.map((c) => c.name);
        fetchingSpinner.succeed();
      } catch (error) {
        fetchingSpinner.fail();
        logger.error("Failed to fetch available components from registry.");
        process.exit(1);
      }
    }

    // Interactive mode: prompt user to select components
    if (componentsToAdd.length === 0) {
      const selected = await promptForComponents(registryUrl);
      if (!selected || selected.length === 0) {
        // User cancelled or no selection
        return;
      }
      componentsToAdd = selected;
    }

    // Get config for resolved paths (needed for reorganization)
    // In monorepos, we need to follow the alias chain to find the actual UI package config
    const config = await getConfig(cwd);

    // Try to get workspace config (follows aliases to find package-specific configs)
    let uiDir = config?.resolvedPaths?.ui || "";
    let uiConfig = config;

    if (config) {
      const workspaceConfig = await getWorkspaceConfig(config);
      if (workspaceConfig?.ui) {
        // Use the UI package's own config (e.g., packages/ui/components.json)
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

    // Process components ONE AT A TIME to avoid index.ts conflicts
    // When shadcn runs with multiple components, files with same name overwrite each other
    const totalComponents = componentsToAdd.length;

    for (let i = 0; i < componentsToAdd.length; i++) {
      const component = componentsToAdd[i];

      // Show component header when adding multiple
      if (totalComponents > 1 && !isSilent) {
        logger.break();
        logger.info(
          highlighter.info(`[${i + 1}/${totalComponents}]`) +
            ` Adding ${highlighter.success(component)}...`,
        );
      }

      // Build subfolder map for this single component
      const subfolderMapResult = await buildSubfolderMap(
        [component],
        registryUrl,
      );

      // Run shadcn for just this component
      const parsed = await addComponents(
        [component],
        forwardedOptions,
        verbose,
        isSilent,
        subfolderMapResult,
      );

      // Immediately reorganize this component's files before the next one
      let skippedCount = 0;
      if (uiDir) {
        const reorgResult = await reorganizeComponents(
          [component],
          uiDir,
          registryUrl,
          verbose,
        );
        skippedCount = reorgResult.skippedFiles.length;
      }

      // Display accurate results (accounting for files we skipped after shadcn "created" them)
      if (!isSilent) {
        const relativeUiDir = uiDir ? path.relative(cwd, uiDir) : "";

        // Files that were actually created (shadcn created minus our skipped)
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

        // Updated files (globals.css etc)
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

        // Files skipped because they already exist in subfolder
        if (skippedCount > 0) {
          logger.info(
            `Skipped ${skippedCount} file${skippedCount > 1 ? "s" : ""}: (already exists)`,
          );
        }

        // Files shadcn skipped (different from our reorganization skip)
        if (parsed.skipped.length > 0) {
          const skippedPaths = rewritePaths(parsed.skipped, subfolderMapResult);
          logger.info(
            `Skipped ${skippedPaths.length} file${skippedPaths.length > 1 ? "s" : ""}: (use --overwrite)`,
          );
          for (const file of skippedPaths) {
            logger.log(`  ${highlighter.info("-")} ${file}`);
          }
        }

        // Nothing happened
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

    // Fix aliases inside Astro files until upstream adds .astro support.
    await fixAstroImports(cwd, verbose);
  });
