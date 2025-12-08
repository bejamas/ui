import { Command } from "commander";
import { execa } from "execa";
import { logger } from "@/src/utils/logger";
import { getPackageRunner } from "@/src/utils/get-package-manager";

// Default fallback registry endpoint for shadcn (expects /r)
const DEFAULT_REGISTRY_URL = "https://ui.bejamas.com/r";

// No quoting helper needed; we pass args array directly to execa
function extractOptionsForShadcn(rawArgv: string[]): string[] {
  const addIndex = rawArgv.findIndex((arg) => arg === "add");
  if (addIndex === -1) return [];
  const rest = rawArgv.slice(addIndex + 1);
  const forwarded: string[] = [];
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === "--") {
      forwarded.push("--", ...rest.slice(i + 1));
      break;
    }
    if (token.startsWith("-")) {
      // Filter CLI-only flags not meant for shadcn (keep --all and others)
      if (token === "-v" || token === "--verbose") continue;
      forwarded.push(token);
      const next = rest[i + 1];
      if (next && !next.startsWith("-")) {
        forwarded.push(next);
        i += 1;
      }
      continue;
    }
    // Non-option token => likely a package name, skip
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
    const forwardedOptions = extractOptionsForShadcn(rawArgv);
    // Pass packages and all flags directly to shadcn
    await addComponents(packages || [], forwardedOptions, verbose);
  });
