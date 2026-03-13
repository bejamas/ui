import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import {
  encodePreset,
  getFontPackageName,
  getFontValue,
  getStyleId,
  type DesignSystemConfig,
} from "@bejamas/create-config/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");

function parseBaseUrl() {
  const args = process.argv.slice(2);
  const index = args.findIndex((arg) => arg === "--base-url");

  if (index !== -1) {
    const value = args[index + 1];
    if (!value) {
      throw new Error("Missing value for --base-url");
    }

    return value.replace(/\/+$/, "");
  }

  return (process.env.BEJAMAS_UI_URL ?? "http://localhost:4322").replace(
    /\/+$/,
    "",
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson<T>(filepath: string) {
  return JSON.parse(await fs.readFile(filepath, "utf8")) as T;
}

async function pathExists(filepath: string) {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

async function findNearestPackageJson(startPath: string, projectRoot: string) {
  let currentDir = path.dirname(startPath);

  while (currentDir.startsWith(projectRoot)) {
    const packageJsonPath = path.resolve(currentDir, "package.json");
    if (await pathExists(packageJsonPath)) {
      return packageJsonPath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  throw new Error(`No package.json found above ${startPath}`);
}

async function findCreatedProjectRoot(caseRoot: string) {
  const entries = await fs.readdir(caseRoot, { withFileTypes: true });
  const projectDirs = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => path.resolve(caseRoot, entry.name));

  assert(
    projectDirs.length === 1,
    `Expected exactly one generated project in ${caseRoot}, found ${projectDirs.length}`,
  );

  return projectDirs[0];
}

async function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv) {
  await execa(command, args, {
    cwd,
    env,
    stdio: "inherit",
  });
}

async function assertInitEndpoint(baseUrl: string, preset: string, template: string) {
  const url = `${baseUrl}/init?preset=${encodeURIComponent(preset)}&template=${encodeURIComponent(template)}`;
  const response = await fetch(url);

  assert(
    response.ok,
    `Expected ${url} to return 200, received ${response.status}`,
  );

  const item = (await response.json()) as {
    name?: string;
    type?: string;
    config?: { style?: string; iconLibrary?: string };
    registryDependencies?: string[];
    css?: Record<string, unknown>;
  };

  assert(typeof item.name === "string" && item.name.length > 0, `Init endpoint at ${url} returned no name`);
  assert(item.type === "registry:base", `Init endpoint at ${url} returned unexpected type ${item.type}`);
  assert(
    typeof item.config?.style === "string" && item.config.style.length > 0,
    `Init endpoint at ${url} returned no style config`,
  );
  assert(
    Array.isArray(item.registryDependencies) &&
      item.registryDependencies.length > 0,
    `Init endpoint at ${url} returned no registry dependencies`,
  );
  assert(
    item.css && Object.keys(item.css).length > 0,
    `Init endpoint at ${url} returned no CSS payload`,
  );
}

async function assertProjectState(
  projectRoot: string,
  configPath: string,
  expectedConfig: DesignSystemConfig,
) {
  const componentsJson = await readJson<{
    style?: string;
    iconLibrary?: string;
    tailwind?: { css?: string };
  }>(configPath);
  const styleId = getStyleId(expectedConfig.style);

  assert(
    componentsJson.style === styleId,
    `Expected ${configPath} to use style ${styleId}, received ${componentsJson.style}`,
  );
  assert(
    componentsJson.iconLibrary === expectedConfig.iconLibrary,
    `Expected ${configPath} to use icon library ${expectedConfig.iconLibrary}, received ${componentsJson.iconLibrary}`,
  );

  const cssRelativePath = componentsJson.tailwind?.css;
  assert(typeof cssRelativePath === "string", `Missing tailwind.css in ${configPath}`);
  const cssPath = path.resolve(path.dirname(configPath), cssRelativePath);
  const cssSource = await fs.readFile(cssPath, "utf8");
  const font = getFontValue(expectedConfig.font);
  const fontClass = font?.font.variable.replace("--", "");
  assert(
    cssSource.includes(`@import "${getFontPackageName(expectedConfig.font)}";`),
    `Expected ${cssPath} to import ${getFontPackageName(expectedConfig.font)}`,
  );
  assert(
    cssSource.includes('@import "shadcn/tailwind.css";'),
    `Expected ${cssPath} to import shadcn/tailwind.css`,
  );
  assert(
    cssSource.includes(":root {") && cssSource.includes(".dark {"),
    `Expected ${cssPath} to contain root and dark theme tokens`,
  );
  assert(
    !cssSource.includes("/* bejamas:create:start */"),
    `Expected ${cssPath} to stop using the legacy Bejamas create block`,
  );
  assert(
    !cssSource.includes(".cn-button") && !cssSource.includes(".cn-card"),
    `Expected ${cssPath} to avoid embedding the component style layer`,
  );
  assert(
    !fontClass || cssSource.includes(`@apply ${fontClass};`),
    `Expected ${cssPath} to apply the selected font class`,
  );

  const packageJsonPath = await findNearestPackageJson(cssPath, projectRoot);
  const packageJson = await readJson<{
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }>(packageJsonPath);
  const fontDependency = getFontPackageName(expectedConfig.font);

  assert(
    packageJson.dependencies?.[fontDependency] === "latest",
    `Expected ${packageJsonPath} to include ${fontDependency} in dependencies`,
  );
}

async function assertFilesExist(projectRoot: string, relativePaths: string[]) {
  for (const relativePath of relativePaths) {
    const absolutePath = path.resolve(projectRoot, relativePath);
    assert(await pathExists(absolutePath), `Expected ${absolutePath} to exist`);
  }
}

async function assertFileDoesNotContain(projectRoot: string, relativePath: string, snippet: string) {
  const absolutePath = path.resolve(projectRoot, relativePath);
  const content = await fs.readFile(absolutePath, "utf8");

  assert(
    !content.includes(snippet),
    `Expected ${absolutePath} to avoid ${snippet}`,
  );
}

async function assertFilesMissing(projectRoot: string, relativePaths: string[]) {
  for (const relativePath of relativePaths) {
    const absolutePath = path.resolve(projectRoot, relativePath);
    assert(
      !(await pathExists(absolutePath)),
      `Expected ${absolutePath} to be absent before the smoke step`,
    );
  }
}

async function main() {
  const baseUrl = parseBaseUrl();
  const registryUrl = `${baseUrl}/r`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const smokeRoot = path.resolve(repoRoot, "tmp/cli-smoke", timestamp);
  const astroCaseRoot = path.resolve(smokeRoot, "astro");
  const monorepoCaseRoot = path.resolve(smokeRoot, "astro-monorepo");
  const cliEntry = path.resolve(packageRoot, "dist/index.js");
  const childEnv = {
    ...process.env,
    BEJAMAS_UI_URL: baseUrl,
    REGISTRY_URL: registryUrl,
    npm_config_user_agent: `bun/${Bun.version}`,
  };

  const astroConfig: DesignSystemConfig = {
    style: "lyra",
    baseColor: "zinc",
    theme: "cyan",
    iconLibrary: "tabler",
    font: "geist-mono",
    radius: "default",
    menuColor: "default",
    menuAccent: "subtle",
    template: "astro",
    rtl: false,
    rtlLanguage: "ar",
  };
  const monorepoConfig: DesignSystemConfig = {
    style: "vega",
    baseColor: "olive",
    theme: "amber",
    iconLibrary: "phosphor",
    font: "playfair-display",
    radius: "default",
    menuColor: "default",
    menuAccent: "subtle",
    template: "astro-monorepo",
    rtl: false,
    rtlLanguage: "ar",
  };
  const astroPreset = encodePreset(astroConfig);
  const monorepoPreset = encodePreset(monorepoConfig);

  await fs.mkdir(astroCaseRoot, { recursive: true });
  await fs.mkdir(monorepoCaseRoot, { recursive: true });

  console.log(`[smoke] Building CLI in ${packageRoot}`);
  await run("bun", ["run", "build"], packageRoot, childEnv);

  assert(await pathExists(cliEntry), `Expected CLI build output at ${cliEntry}`);

  console.log(`[smoke] Probing local init endpoint at ${baseUrl}`);
  await assertInitEndpoint(baseUrl, astroPreset, astroConfig.template);
  await assertInitEndpoint(baseUrl, monorepoPreset, monorepoConfig.template);

  console.log("[smoke] Initializing astro template");
  await run(
    "bun",
    [
      cliEntry,
      "init",
      "--force",
      "--yes",
      "--template",
      "astro",
      "--preset",
      astroPreset,
      "--cwd",
      astroCaseRoot,
    ],
    packageRoot,
    childEnv,
  );

  console.log("[smoke] Initializing astro-monorepo template");
  await run(
    "bun",
    [
      cliEntry,
      "init",
      "--force",
      "--yes",
      "--template",
      "astro-monorepo",
      "--preset",
      monorepoPreset,
      "--cwd",
      monorepoCaseRoot,
    ],
    packageRoot,
    childEnv,
  );

  const astroProjectRoot = await findCreatedProjectRoot(astroCaseRoot);
  const monorepoProjectRoot = await findCreatedProjectRoot(monorepoCaseRoot);

  await assertProjectState(
    astroProjectRoot,
    path.resolve(astroProjectRoot, "components.json"),
    astroConfig,
  );
  await assertProjectState(
    monorepoProjectRoot,
    path.resolve(monorepoProjectRoot, "apps/web/components.json"),
    monorepoConfig,
  );
  await assertFilesMissing(astroProjectRoot, ["src/ui/tabs/Tabs.astro"]);
  await assertFilesMissing(monorepoProjectRoot, [
    "packages/ui/src/components/tabs/Tabs.astro",
  ]);

  console.log("[smoke] Adding tabs to astro project");
  await run(
    "bun",
    [cliEntry, "add", "tabs", "--yes"],
    astroProjectRoot,
    childEnv,
  );

  console.log("[smoke] Adding tabs to astro-monorepo project");
  await run(
    "bun",
    [cliEntry, "add", "tabs", "--yes"],
    path.resolve(monorepoProjectRoot, "apps/web"),
    childEnv,
  );

  await assertFilesExist(astroProjectRoot, [
    "src/ui/tabs/Tabs.astro",
    "src/ui/tabs/index.ts",
  ]);
  await assertFilesExist(monorepoProjectRoot, [
    "packages/ui/src/components/tabs/Tabs.astro",
    "packages/ui/src/components/tabs/index.ts",
  ]);
  await assertProjectState(
    astroProjectRoot,
    path.resolve(astroProjectRoot, "components.json"),
    astroConfig,
  );
  await assertProjectState(
    monorepoProjectRoot,
    path.resolve(monorepoProjectRoot, "apps/web/components.json"),
    monorepoConfig,
  );
  await assertFileDoesNotContain(
    astroProjectRoot,
    "src/ui/tabs/Tabs.astro",
    "cn-tabs-",
  );
  await assertFileDoesNotContain(
    monorepoProjectRoot,
    "packages/ui/src/components/tabs/Tabs.astro",
    "cn-tabs-",
  );

  console.log("[smoke] Complete");
  console.log(`[smoke] Astro project: ${astroProjectRoot}`);
  console.log(`[smoke] Astro monorepo project: ${monorepoProjectRoot}`);
}

main().catch((error) => {
  console.error(`[smoke] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
