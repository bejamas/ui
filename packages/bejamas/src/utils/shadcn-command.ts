import fs from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import { getPackageRunner } from "@/src/utils/get-package-manager";

export function getLocalShadcnBinaryPath(
  cwd: string,
  platform: NodeJS.Platform = process.platform,
) {
  const shadcnBin = platform === "win32" ? "shadcn.cmd" : "shadcn";
  return path.resolve(cwd, "node_modules", ".bin", shadcnBin);
}

export function resolveShadcnInvocation({
  cwd,
  runner,
  hasLocalBinary,
  localBinaryPath = getLocalShadcnBinaryPath(cwd),
}: {
  cwd: string;
  runner: "bunx" | "pnpm dlx" | "npx";
  hasLocalBinary: boolean;
  localBinaryPath?: string;
}) {
  if (hasLocalBinary) {
    return {
      command: localBinaryPath,
      argsPrefix: [] as string[],
    };
  }

  if (runner === "bunx") {
    return {
      command: "bunx",
      argsPrefix: ["shadcn@latest"],
    };
  }

  if (runner === "pnpm dlx") {
    return {
      command: "pnpm",
      argsPrefix: ["dlx", "shadcn@latest"],
    };
  }

  return {
    command: "npx",
    argsPrefix: ["-y", "shadcn@latest"],
  };
}

export function extractPassthroughArgs(
  rawArgv: string[],
  commandName: string,
) {
  const commandIndex = rawArgv.findIndex((arg) => arg === commandName);
  if (commandIndex === -1) {
    return [];
  }

  const rest = rawArgv.slice(commandIndex + 1);
  const doubleDashIndex = rest.indexOf("--");

  if (doubleDashIndex === -1) {
    return [];
  }

  return rest.slice(doubleDashIndex + 1);
}

export async function runShadcnCommand({
  cwd,
  args,
  env,
}: {
  cwd: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
}) {
  const runner = await getPackageRunner(cwd);
  const localBinaryPath = getLocalShadcnBinaryPath(cwd);
  let hasLocalBinary = false;

  try {
    await fs.access(localBinaryPath);
    hasLocalBinary = true;
  } catch {}

  const invocation = resolveShadcnInvocation({
    cwd,
    runner,
    hasLocalBinary,
    localBinaryPath,
  });

  await execa(invocation.command, [...invocation.argsPrefix, ...args], {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  });
}
