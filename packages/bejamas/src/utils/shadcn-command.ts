import { execa } from "execa";
import { buildPinnedShadcnInvocation } from "@/src/utils/shadcn-cli";

export function extractPassthroughArgs(rawArgv: string[], commandName: string) {
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
  const invocation = buildPinnedShadcnInvocation(args);

  await execa(invocation.cmd, invocation.args, {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  });
}
