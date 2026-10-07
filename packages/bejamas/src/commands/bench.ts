import { Command } from "commander";
import { execa } from "execa";
import {
  buildPinnedBenchInvocation,
  ensurePinnedBenchExecPrefix,
  extractBenchArgs,
} from "@/src/utils/bench-cli";

export const bench = new Command()
  .name("bench")
  .description(
    "compare an original site with its ported version (runs @bejamas/bench)",
  )
  .usage("<original> <ported> [options]")
  .argument("[args...]", "run `bejamas bench --help` for all options")
  // Options, including --help, belong to @bejamas/bench.
  .helpOption(false)
  .allowUnknownOption()
  .passThroughOptions()
  .allowExcessArguments()
  .action(async () => {
    await ensurePinnedBenchExecPrefix();
    const invocation = buildPinnedBenchInvocation(
      extractBenchArgs(process.argv.slice(2)),
    );
    const result = await execa(invocation.cmd, invocation.args, {
      stdio: "inherit",
      reject: false,
    });
    process.exit(result.exitCode ?? 2);
  });
