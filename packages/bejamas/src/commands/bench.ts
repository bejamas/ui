import { Command } from "commander";
import { execa } from "execa";
import { version as BENCH_VERSION } from "@bejamas/bench/package.json";
import { definePinnedPackage } from "@/src/utils/pinned-npm-exec";

// Bench ships Lighthouse and Playwright, so it runs on demand instead of
// being a dependency of the CLI. The version is pinned at build time.
export const PINNED_BENCH = definePinnedPackage({
  name: "@bejamas/bench",
  version: BENCH_VERSION,
  bin: "bejamas-bench",
  prefixDir: "bejamas-bench",
});

export const bench = new Command()
  .name("bench")
  .description(
    "compare an original site with its ported version (runs @bejamas/bench)",
  )
  .usage("--original <url> --ported <url> [options]")
  .argument("[args...]", "run `bejamas bench --help` for all options")
  // Every argument after `bench`, including --help, belongs to @bejamas/bench.
  .helpOption(false)
  .allowUnknownOption()
  .passThroughOptions()
  .allowExcessArguments()
  .action(async (args: string[]) => {
    await PINNED_BENCH.ensureExecPrefix();
    const invocation = PINNED_BENCH.invocation(args);
    const result = await execa(invocation.cmd, invocation.args, {
      stdio: "inherit",
      reject: false,
    });
    process.exit(result.exitCode ?? 2);
  });
