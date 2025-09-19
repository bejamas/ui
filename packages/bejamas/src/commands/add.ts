import { Command } from "commander";
import { execSync } from "node:child_process";
import { URL } from "node:url";
import { logger } from "@/src/utils/logger";

function shellQuote(arg: string): string {
  if (arg === "") return "''";
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

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

function addComponents(
  packages: string[],
  forwardedOptions: string[],
  isVerbose: boolean,
) {
  if (!packages || packages.length === 0) {
    logger.info("Usage: bejamas add [...packages]");
    process.exit(1);
  }

  for (const pkg of packages) {
    const packageName = String(pkg || "").trim();
    if (!packageName) continue;
    logger.info(`Adding ${packageName} component...`);

    const url = new URL(`r/${packageName}.json`, "http://localhost:4321");

    const extra = forwardedOptions.map((t) => shellQuote(t)).join(" ");
    const cmd = `npx -y shadcn@latest add ${url.toString()}${extra ? ` ${extra}` : ""}`;
    if (isVerbose) {
      logger.info(`[bejamas-ui] ${cmd}`);
    }
    execSync(cmd, { stdio: "inherit" });
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
  .action(function action(packages: string[], _opts, cmd) {
    const root = cmd?.parent;
    const verbose = Boolean(root?.opts?.().verbose);
    const rawArgv = process.argv.slice(2);
    const forwardedOptions = extractOptionsForShadcn(rawArgv);
    addComponents(packages || [], forwardedOptions, verbose);
  });
