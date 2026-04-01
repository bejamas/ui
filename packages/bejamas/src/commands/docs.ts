import path from "node:path";
import { Command } from "commander";
import {
  extractPassthroughArgs,
  runShadcnCommand,
} from "@/src/utils/shadcn-command";

export const docs = new Command()
  .name("docs")
  .description("proxy to shadcn docs")
  .argument("<components...>", "component names")
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option(
    "-b, --base <base>",
    "the base to use either 'base' or 'radix'. defaults to project base.",
  )
  .option("--json", "output as JSON.", false)
  .action(async (components: string[], opts) => {
    const cwd = path.resolve(opts.cwd ?? process.cwd());
    const rawArgv = process.argv.slice(2);
    const args = ["docs", ...components, "--cwd", cwd];

    if (opts.base) {
      args.push("--base", opts.base);
    }

    if (opts.json) {
      args.push("--json");
    }

    const passthroughArgs = extractPassthroughArgs(rawArgv, "docs");
    if (passthroughArgs.length > 0) {
      args.push(...passthroughArgs);
    }

    try {
      await runShadcnCommand({ cwd, args });
    } catch {
      process.exit(1);
    }
  });
