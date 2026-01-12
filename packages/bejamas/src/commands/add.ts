import path from "node:path";
import { Command } from "commander";
import { execa } from "execa";
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

/** Build a map of filename -> subfolder/filename for path rewriting */
async function buildSubfolderMap(
  components: string[],
  registryUrl: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  for (const componentName of components) {
    const registryItem = await fetchRegistryItem(componentName, registryUrl);
    if (!registryItem) continue;

    const subfolder = getSubfolderFromPaths(registryItem.files);
    if (!subfolder) continue;

    for (const file of registryItem.files) {
      if (file.type === "registry:ui") {
        const filename = path.basename(file.path);
        map.set(filename, `${subfolder}/${filename}`);
      }
    }
  }

  return map;
}

/** Rewrite a file path to include the correct subfolder (only if not already there) */
function rewritePath(
  filePath: string,
  subfolderMap: Map<string, string>,
): string {
  const filename = path.basename(filePath);
  const subfolderFilename = subfolderMap.get(filename);

  if (subfolderFilename) {
    // Extract expected subfolder name (e.g., "avatar" from "avatar/Avatar.astro")
    const expectedSubfolder = path.dirname(subfolderFilename);
    const parentDir = path.basename(path.dirname(filePath));

    // Only rewrite if the parent directory is NOT already the expected subfolder
    if (parentDir !== expectedSubfolder) {
      const dir = path.dirname(filePath);
      return `${dir}/${subfolderFilename}`;
    }
  }

  return filePath;
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
  subfolderMap: Map<string, string>,
): Promise<ParsedOutput> {
  const runner = await getPackageRunner(process.cwd());
  const env = {
    ...process.env,
    REGISTRY_URL: process.env.REGISTRY_URL || DEFAULT_REGISTRY_URL,
  };
  const baseArgs = ["shadcn@latest", "add", ...packages, ...forwardedOptions];

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
    // Run shadcn and capture output (explicitly pipe stdout/stderr)
    const result = await execa(cmd, args, {
      env,
      stdin: "inherit",
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

    // Rewrite paths and display results
    if (parsed.created.length > 0) {
      const rewrittenPaths = parsed.created.map((p) =>
        rewritePath(p, subfolderMap),
      );
      logger.success(
        `Created ${rewrittenPaths.length} file${rewrittenPaths.length > 1 ? "s" : ""}:`,
      );
      for (const file of rewrittenPaths) {
        logger.log(`  ${highlighter.info("-")} ${file}`);
      }
    }

    if (parsed.updated.length > 0) {
      // Dedupe updated files (shadcn sometimes lists same file twice)
      const uniqueUpdated = Array.from(new Set(parsed.updated));
      const rewrittenPaths = uniqueUpdated.map((p) =>
        rewritePath(p, subfolderMap),
      );
      logger.info(
        `Updated ${rewrittenPaths.length} file${rewrittenPaths.length > 1 ? "s" : ""}:`,
      );
      for (const file of rewrittenPaths) {
        logger.log(`  ${highlighter.info("-")} ${file}`);
      }
    }

    if (parsed.skipped.length > 0) {
      const rewrittenPaths = parsed.skipped.map((p) =>
        rewritePath(p, subfolderMap),
      );
      logger.info(
        `Skipped ${rewrittenPaths.length} file${rewrittenPaths.length > 1 ? "s" : ""}: (use --overwrite to overwrite)`,
      );
      for (const file of rewrittenPaths) {
        logger.log(`  ${highlighter.info("-")} ${file}`);
      }
    }

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
    const verbose = true || Boolean(root?.opts?.().verbose);
    const rawArgv = process.argv.slice(2);
    const forwardedOptions = extractOptionsForShadcn(rawArgv, cmd);
    const opts =
      typeof cmd.optsWithGlobals === "function"
        ? cmd.optsWithGlobals()
        : (cmd.opts?.() ?? {});
    const cwd = opts.cwd || process.cwd();

    // Get config for resolved paths (needed for reorganization)
    // In monorepos, we need to follow the alias chain to find the actual UI package config
    const config = await getConfig(cwd);
    const registryUrl = process.env.REGISTRY_URL || DEFAULT_REGISTRY_URL;

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

    // Build subfolder map for path rewriting in output
    const subfolderMap = await buildSubfolderMap(packages || [], registryUrl);

    // Run shadcn and display results with our own spinners
    const isSilent = opts.silent || false;
    await addComponents(
      packages || [],
      forwardedOptions,
      verbose,
      isSilent,
      subfolderMap,
    );

    // Reorganize multi-file components into subfolders
    if (uiDir && packages && packages.length > 0) {
      await reorganizeComponents(packages, uiDir, registryUrl, verbose);
      // Paths are already corrected in shadcn output, no separate summary needed
    }

    // Fix aliases inside Astro files until upstream adds .astro support.
    await fixAstroImports(cwd, verbose);
  });
