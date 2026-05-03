import path from "node:path";
import fg from "fast-glob";
import fs from "fs-extra";

import { highlighter } from "@/src/utils/highlighter";
import { logger } from "@/src/utils/logger";

const FRAMEWORK_CONFIG_FILES = [
  "next.config.*",
  "vite.config.*",
  "astro.config.*",
  "remix.config.*",
  "nuxt.config.*",
  "svelte.config.*",
  "gatsby-config.*",
  "angular.json",
];

export async function isMonorepoRoot(cwd: string) {
  if (fs.existsSync(path.resolve(cwd, "pnpm-workspace.yaml"))) {
    return true;
  }

  const packageJsonPath = path.resolve(cwd, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = await fs.readJson(packageJsonPath);
      if (packageJson.workspaces) {
        return true;
      }
    } catch {
      return false;
    }
  }

  if (fs.existsSync(path.resolve(cwd, "lerna.json"))) {
    return true;
  }

  if (fs.existsSync(path.resolve(cwd, "nx.json"))) {
    return true;
  }

  return false;
}

export async function getMonorepoTargets(cwd: string) {
  const patterns = await getWorkspacePatterns(cwd);

  if (!patterns.length) {
    return [];
  }

  const dirs = await fg(patterns, {
    cwd,
    onlyDirectories: true,
    ignore: ["**/node_modules/**"],
  });
  const targets: { name: string; hasConfig: boolean }[] = [];

  for (const dir of dirs) {
    const fullPath = path.resolve(cwd, dir);

    if (!fs.existsSync(path.resolve(fullPath, "package.json"))) {
      continue;
    }

    const hasComponentsJson = fs.existsSync(
      path.resolve(fullPath, "components.json"),
    );
    const hasFrameworkConfig = FRAMEWORK_CONFIG_FILES.some(
      (pattern) => fg.sync(pattern, { cwd: fullPath, dot: true }).length > 0,
    );

    if (hasComponentsJson || hasFrameworkConfig) {
      targets.push({
        name: dir,
        hasConfig: hasComponentsJson,
      });
    }
  }

  return targets;
}

export function formatMonorepoMessage(
  command: string,
  targets: { name: string; hasConfig: boolean }[],
  options: {
    binary?: string;
    cwdFlag?: string;
  } = {},
) {
  const binary = options.binary ?? "bejamas";
  const cwdFlag = options.cwdFlag ?? "-c";

  logger.break();
  logger.log(
    `It looks like you are running ${highlighter.info(
      command,
    )} from a monorepo root.`,
  );
  logger.log(
    `To use ${binary} in a specific workspace, use the ${highlighter.info(
      cwdFlag,
    )} flag:`,
  );
  logger.break();

  for (const target of targets) {
    logger.log(`  ${binary} ${command} ${cwdFlag} ${target.name}`);
  }

  logger.break();
}

async function getWorkspacePatterns(cwd: string) {
  const patterns: string[] = [];
  const pnpmWorkspacePath = path.resolve(cwd, "pnpm-workspace.yaml");

  if (fs.existsSync(pnpmWorkspacePath)) {
    const content = await fs.readFile(pnpmWorkspacePath, "utf8");
    const matches = Array.from(
      content.matchAll(/^\s*-\s*["']?([^"'\n#]+)["']?\s*$/gm),
    );

    for (const match of matches) {
      patterns.push(match[1].trim());
    }
  }

  const packageJsonPath = path.resolve(cwd, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = await fs.readJson(packageJsonPath);
      const workspaces = Array.isArray(packageJson.workspaces)
        ? packageJson.workspaces
        : packageJson.workspaces?.packages;

      if (Array.isArray(workspaces)) {
        patterns.push(
          ...workspaces.filter((pattern) => !pattern.startsWith("!")),
        );
      }
    } catch {
      return Array.from(new Set(patterns));
    }
  }

  return Array.from(new Set(patterns));
}
