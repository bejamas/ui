import { Command } from "commander";
import { execa } from "execa";
import { logger } from "@/src/utils/logger";
import { getPackageRunner } from "@/src/utils/get-package-manager";
import { fixAstroImports } from "@/src/utils/astro-imports";

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

async function addComponents(
  packages: string[],
  forwardedOptions: string[],
  isVerbose: boolean,
) {
  // Build the command by passing through all args to shadcn
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
  try {
    await execa(cmd, args, { stdio: "inherit", env });
  } catch (err) {
    // shadcn prints detailed error to stdio; avoid double-reporting
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

    // Pass packages and all flags directly to shadcn
    await addComponents(packages || [], forwardedOptions, verbose);

    // Fix aliases inside Astro files until upstream adds .astro support.
    await fixAstroImports(cwd, verbose);
  });
