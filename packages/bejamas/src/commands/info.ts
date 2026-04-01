import path from "node:path";
import { Command } from "commander";
import {
  extractPassthroughArgs,
  runShadcnCommand,
} from "@/src/utils/shadcn-command";

export const info = new Command()
  .name("info")
  .description("proxy to shadcn info")
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option("--json", "output as JSON.", false)
  .action(async (opts) => {
    const cwd = path.resolve(opts.cwd ?? process.cwd());
    const rawArgv = process.argv.slice(2);
    const args = ["info", "--cwd", cwd];

    if (opts.json) {
      args.push("--json");
    }

    const passthroughArgs = extractPassthroughArgs(rawArgv, "info");
    if (passthroughArgs.length > 0) {
      args.push(...passthroughArgs);
    }

    try {
      await runShadcnCommand({ cwd, args });
    } catch {
      process.exit(1);
    }
  });
