import { APP_ROOT, runStyleArtifactBuild, startStyleArtifactWatcher } from "./watch-style-artifacts";

async function runCommand(scriptName: string) {
  const process = Bun.spawn({
    cmd: ["bun", "run", scriptName],
    cwd: APP_ROOT,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await process.exited;

  if (exitCode !== 0) {
    throw new Error(`\`bun run ${scriptName}\` exited with code ${exitCode}`);
  }
}

async function main() {
  await runStyleArtifactBuild();
  await runCommand("build:docs");

  const styleWatcher = startStyleArtifactWatcher();
  const astroProcess = Bun.spawn({
    cmd: ["bun", "run", "start"],
    cwd: APP_ROOT,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  let isShuttingDown = false;

  const shutdown = () => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    styleWatcher.close();
    astroProcess.kill();
  };

  process.on("SIGINT", () => {
    shutdown();
  });
  process.on("SIGTERM", () => {
    shutdown();
  });

  const exitCode = await astroProcess.exited;
  styleWatcher.close();
  process.exit(exitCode);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[dev] startup failed: ${message}`);
  process.exit(1);
});
