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
import { BEJAMAS_COMPONENTS_SCHEMA_URL } from "../src/schema";
import { toManagedAstroFont } from "../src/utils/astro-fonts";

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

async function run(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
) {
  await execa(command, args, {
    cwd,
    env,
    stdio: "inherit",
  });
}

async function runCapture(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
) {
  return execa(command, args, {
    cwd,
    env,
    stdout: "pipe",
    stderr: "pipe",
    reject: false,
  });
}

async function prepareLocalBejamasPackage(smokeRoot: string) {
  const localPackageRoot = path.resolve(smokeRoot, ".local-packages/bejamas");
  const srcDir = path.resolve(localPackageRoot, "src");

  await fs.mkdir(srcDir, { recursive: true });
  await fs.copyFile(
    path.resolve(packageRoot, "tailwind.css"),
    path.resolve(localPackageRoot, "tailwind.css"),
  );
  await fs.copyFile(
    path.resolve(packageRoot, "src/tailwind.css"),
    path.resolve(srcDir, "tailwind.css"),
  );
  await fs.writeFile(
    path.resolve(localPackageRoot, "package.json"),
    JSON.stringify(
      {
        name: "bejamas",
        version: "0.0.0-local",
        type: "module",
        exports: {
          "./tailwind.css": "./tailwind.css",
        },
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  return localPackageRoot;
}

async function assertInitEndpoint(
  baseUrl: string,
  preset: string,
  template: string,
) {
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

  assert(
    typeof item.name === "string" && item.name.length > 0,
    `Init endpoint at ${url} returned no name`,
  );
  assert(
    item.type === "registry:base",
    `Init endpoint at ${url} returned unexpected type ${item.type}`,
  );
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
    $schema?: string;
    style?: string;
    iconLibrary?: string;
    tailwind?: { css?: string };
    rsc?: boolean;
    tsx?: boolean;
  }>(configPath);
  const styleId = getStyleId(expectedConfig.style);

  assert(
    componentsJson.$schema === BEJAMAS_COMPONENTS_SCHEMA_URL,
    `Expected ${configPath} to use $schema ${BEJAMAS_COMPONENTS_SCHEMA_URL}, received ${componentsJson.$schema}`,
  );
  assert(
    componentsJson.style === styleId,
    `Expected ${configPath} to use style ${styleId}, received ${componentsJson.style}`,
  );
  assert(
    componentsJson.iconLibrary === expectedConfig.iconLibrary,
    `Expected ${configPath} to use icon library ${expectedConfig.iconLibrary}, received ${componentsJson.iconLibrary}`,
  );
  assert(
    componentsJson.rsc === undefined && componentsJson.tsx === undefined,
    `Expected ${configPath} to omit deprecated rsc/tsx keys`,
  );

  const cssRelativePath = componentsJson.tailwind?.css;
  assert(
    typeof cssRelativePath === "string",
    `Missing tailwind.css in ${configPath}`,
  );
  const cssPath = path.resolve(path.dirname(configPath), cssRelativePath);
  const cssSource = await fs.readFile(cssPath, "utf8");
  const font = getFontValue(expectedConfig.font);
  const fontClass = font?.font.variable.replace("--", "");
  assert(
    cssSource.includes('@import "bejamas/tailwind.css";'),
    `Expected ${cssPath} to import bejamas/tailwind.css`,
  );
  assert(
    !cssSource.includes("@fontsource-variable/"),
    `Expected ${cssPath} to avoid fontsource imports`,
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
    packageJson.dependencies?.bejamas,
    `Expected ${packageJsonPath} to include bejamas for the managed tailwind import`,
  );
  assert(
    !packageJson.dependencies?.[fontDependency] &&
      !packageJson.devDependencies?.[fontDependency],
    `Expected ${packageJsonPath} to avoid ${fontDependency} after Astro font reconciliation`,
  );

  const isMonorepoApp = configPath.includes(
    `${path.sep}apps${path.sep}web${path.sep}`,
  );
  const astroConfigPath = path.resolve(
    projectRoot,
    isMonorepoApp ? "apps/web/astro.config.mjs" : "astro.config.mjs",
  );
  const layoutPath = path.resolve(
    projectRoot,
    isMonorepoApp
      ? "apps/web/src/layouts/Layout.astro"
      : "src/layouts/Layout.astro",
  );
  const astroConfigSource = await fs.readFile(astroConfigPath, "utf8");
  const layoutSource = await fs.readFile(layoutPath, "utf8");
  const managedFont = toManagedAstroFont(expectedConfig.font);

  assert(
    astroConfigSource.includes("fontProviders"),
    `Expected ${astroConfigPath} to import fontProviders`,
  );
  assert(
    astroConfigSource.includes(
      '@type {NonNullable<import("astro/config").AstroUserConfig["fonts"]>}',
    ),
    `Expected ${astroConfigPath} to type the managed Astro fonts block`,
  );
  assert(
    astroConfigSource.includes("fonts: BEJAMAS_ASTRO_FONTS"),
    `Expected ${astroConfigPath} to configure Astro fonts`,
  );
  assert(
    !astroConfigSource.includes("experimental: { fonts: BEJAMAS_ASTRO_FONTS }"),
    `Expected ${astroConfigPath} to avoid experimental Astro fonts`,
  );
  assert(
    astroConfigSource.includes(
      `provider: fontProviders.${managedFont?.provider ?? ""}()`,
    ),
    `Expected ${astroConfigPath} to use the ${managedFont?.provider ?? "unknown"} Astro font provider`,
  );
  assert(
    astroConfigSource.includes(`name: "${font?.title ?? ""}"`) &&
      astroConfigSource.includes(`cssVariable: "${font?.font.variable ?? ""}"`),
    `Expected ${astroConfigPath} to register the active Astro font`,
  );
  assert(
    layoutSource.includes('import { Font } from "astro:assets";') &&
      layoutSource.includes(
        `<Font cssVariable="${font?.font.variable ?? ""}" />`,
      ),
    `Expected ${layoutPath} to render the active Astro font`,
  );

  const expectedBodyClass =
    font?.font.variable === "--font-mono"
      ? "font-mono"
      : font?.font.variable === "--font-serif"
        ? "font-serif"
        : null;

  if (expectedBodyClass) {
    assert(
      layoutSource.includes(`class="${expectedBodyClass}"`) ||
        layoutSource.includes(`class="min-h-screen ${expectedBodyClass}"`) ||
        layoutSource.includes(`class="${expectedBodyClass} min-h-screen"`),
      `Expected ${layoutPath} to apply ${expectedBodyClass} on the body when it is the default font slot`,
    );
  }
}

async function assertFilesExist(projectRoot: string, relativePaths: string[]) {
  for (const relativePath of relativePaths) {
    const absolutePath = path.resolve(projectRoot, relativePath);
    assert(await pathExists(absolutePath), `Expected ${absolutePath} to exist`);
  }
}

async function assertFileDoesNotContain(
  projectRoot: string,
  relativePath: string,
  snippet: string,
) {
  const absolutePath = path.resolve(projectRoot, relativePath);
  const content = await fs.readFile(absolutePath, "utf8");

  assert(
    !content.includes(snippet),
    `Expected ${absolutePath} to avoid ${snippet}`,
  );
}

async function assertFileContains(
  projectRoot: string,
  relativePath: string,
  snippet: string,
) {
  const absolutePath = path.resolve(projectRoot, relativePath);
  const content = await fs.readFile(absolutePath, "utf8");

  assert(
    content.includes(snippet),
    `Expected ${absolutePath} to include ${snippet}`,
  );
}

async function assertPackageDependencies(
  projectRoot: string,
  relativePackageJson: string,
  expectedDependencies: string[],
  absentDependencies: string[],
) {
  const packageJsonPath = path.resolve(projectRoot, relativePackageJson);
  const packageJson = await readJson<{
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }>(packageJsonPath);
  const allDependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };

  for (const dependency of expectedDependencies) {
    assert(
      allDependencies[dependency],
      `Expected ${packageJsonPath} to include ${dependency}`,
    );
  }

  for (const dependency of absentDependencies) {
    assert(
      !allDependencies[dependency],
      `Expected ${packageJsonPath} to avoid ${dependency}`,
    );
  }
}

async function assertFilesMissing(
  projectRoot: string,
  relativePaths: string[],
) {
  for (const relativePath of relativePaths) {
    const absolutePath = path.resolve(projectRoot, relativePath);
    assert(
      !(await pathExists(absolutePath)),
      `Expected ${absolutePath} to be absent before the smoke step`,
    );
  }
}

async function readProjectFile(projectRoot: string, relativePath: string) {
  return fs.readFile(path.resolve(projectRoot, relativePath), "utf8");
}

async function getRegistryItemSource(
  style: DesignSystemConfig["style"],
  itemName: string,
  filePath: string,
) {
  const styleId = getStyleId(style);
  const item = await readJson<{
    files?: Array<{ path: string; content: string }>;
  }>(
    path.resolve(
      repoRoot,
      "apps/web/public/r/styles",
      styleId,
      `${itemName}.json`,
    ),
  );
  const file = item.files?.find((entry) => entry.path === filePath);
  assert(
    file,
    `Expected ${itemName}.json for ${styleId} to include ${filePath}`,
  );
  return file.content;
}

function extractRequiredSnippet(
  source: string,
  pattern: RegExp,
  label: string,
) {
  const match = source.match(pattern)?.[0];
  assert(match, `Expected source to include ${label}`);
  return match;
}

async function assertTabsSourceMatchesStyle(
  tabsListPath: string,
  tabsTriggerPath: string,
  style: DesignSystemConfig["style"],
) {
  const installedListSource = await fs.readFile(tabsListPath, "utf8");
  const installedTriggerSource = await fs.readFile(tabsTriggerPath, "utf8");
  const registryListSource = await getRegistryItemSource(
    style,
    "tabs",
    "ui/tabs/TabsList.astro",
  );
  const registryTriggerSource = await getRegistryItemSource(
    style,
    "tabs",
    "ui/tabs/TabsTrigger.astro",
  );

  const requiredListSnippets = [
    extractRequiredSnippet(
      registryListSource,
      /indicator: "[^"]+"/,
      "tabs list indicator variant",
    ),
    extractRequiredSnippet(
      registryListSource,
      /default: "group-data-horizontal\/tabs:h-[^"]+"/,
      "tabs list default size variant",
    ),
  ];
  const requiredTriggerSnippet = extractRequiredSnippet(
    registryTriggerSource,
    /"gap-1\.5[^"]*px-[^"]*py-[^"]*text-(xs|sm)[^"]*"/,
    "tabs trigger sizing classes",
  );

  for (const snippet of [...requiredListSnippets, requiredTriggerSnippet]) {
    const installedSource = requiredListSnippets.includes(snippet)
      ? installedListSource
      : installedTriggerSource;
    const filepath = requiredListSnippets.includes(snippet)
      ? tabsListPath
      : tabsTriggerPath;
    assert(
      installedSource.includes(snippet),
      `Expected ${filepath} to include target style snippet: ${snippet}`,
    );
  }
}

async function waitForChildExit(
  child: ReturnType<typeof execa>,
  timeoutMs: number,
) {
  return Promise.race([
    child.catch(() => undefined),
    new Promise<undefined>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

function hasChildExited(child: ReturnType<typeof execa>) {
  return child.exitCode !== null && child.exitCode !== undefined;
}

async function assertAstroProjectBootsWithoutFontErrors(
  projectRoot: string,
  port: number,
) {
  let stdout = "";
  let stderr = "";
  const child = execa(
    "bun",
    ["run", "dev", "--host", "127.0.0.1", "--port", String(port)],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        CI: "1",
      },
      reject: false,
      stdout: "pipe",
      stderr: "pipe",
      detached: true,
    },
  );
  child.stdout?.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const killChild = (signal: NodeJS.Signals) => {
    if (!child.pid) {
      return;
    }

    try {
      process.kill(-child.pid, signal);
    } catch {
      child.kill(signal);
    }
  };

  try {
    const url = `http://127.0.0.1:${port}/`;
    let response: Response | null = null;

    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (hasChildExited(child)) {
        break;
      }

      try {
        response = await fetch(url, {
          signal: AbortSignal.timeout(1_000),
        });
        if (response.ok) {
          break;
        }
      } catch {
        // Server is still starting.
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!response?.ok) {
      throw new Error(
        `Expected Astro dev server at ${url} to respond with 200.\nstdout:\n${stdout}\nstderr:\n${stderr}`,
      );
    }

    const html = await response.text();
    assert(
      !html.includes("FontFamilyNotFound"),
      `Expected ${url} to render without FontFamilyNotFound`,
    );
  } finally {
    killChild("SIGTERM");
    const exited = await waitForChildExit(child, 2_000);
    if (exited === undefined && !hasChildExited(child)) {
      killChild("SIGKILL");
      await waitForChildExit(child, 2_000);
    }
  }
}

async function assertShadcnDryRunFlattensMonorepoTabs(
  monorepoWebRoot: string,
  env: NodeJS.ProcessEnv,
) {
  const result = await runCapture(
    "bunx",
    ["shadcn@latest", "add", "tabs", "--yes", "--dry-run"],
    monorepoWebRoot,
    env,
  );
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  assert(
    result.exitCode === 0,
    `Expected shadcn dry-run to succeed, received ${result.exitCode}`,
  );
  assert(
    output.includes("packages/ui/src/components/Tabs.astro"),
    "Expected upstream shadcn dry-run to flatten the monorepo tabs path",
  );
  assert(
    !output.includes("packages/ui/src/components/tabs/Tabs.astro"),
    "Expected upstream shadcn dry-run to miss the nested tabs subfolder",
  );
}

async function main() {
  const baseUrl = parseBaseUrl();
  const registryUrl = `${baseUrl}/r`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const smokeRoot = path.resolve(repoRoot, "tmp/cli-smoke", timestamp);
  const astroCaseRoot = path.resolve(smokeRoot, "astro");
  const monorepoCaseRoot = path.resolve(smokeRoot, "astro-monorepo");
  const cliEntry = path.resolve(packageRoot, "dist/index.js");
  const astroConfig: DesignSystemConfig = {
    style: "lyra",
    baseColor: "zinc",
    theme: "cyan",
    iconLibrary: "tabler",
    font: "geist-mono",
    fontHeading: "inherit",
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
    fontHeading: "inherit",
    radius: "default",
    menuColor: "default",
    menuAccent: "subtle",
    template: "astro-monorepo",
    rtl: false,
    rtlLanguage: "ar",
  };
  const astroPreset = encodePreset(astroConfig);
  const monorepoPreset = encodePreset(monorepoConfig);
  const astroSwitchConfig: DesignSystemConfig = {
    style: "juno",
    baseColor: "neutral",
    theme: "indigo",
    iconLibrary: "lucide",
    font: "inter",
    fontHeading: "inherit",
    radius: "default",
    menuColor: "default",
    menuAccent: "subtle",
    template: "astro",
    rtl: false,
    rtlLanguage: "ar",
  };
  const monorepoSwitchConfig: DesignSystemConfig = {
    style: "nova",
    baseColor: "stone",
    theme: "blue",
    iconLibrary: "tabler",
    font: "geist-mono",
    fontHeading: "inherit",
    radius: "default",
    menuColor: "default",
    menuAccent: "subtle",
    template: "astro-monorepo",
    rtl: false,
    rtlLanguage: "ar",
  };
  const astroSwitchPreset = encodePreset(astroSwitchConfig);
  const monorepoSwitchPreset = encodePreset(monorepoSwitchConfig);
  const baseEnv = {
    ...process.env,
    BEJAMAS_UI_URL: baseUrl,
    REGISTRY_URL: registryUrl,
    npm_config_user_agent: `bun/${Bun.version}`,
  };

  await fs.mkdir(astroCaseRoot, { recursive: true });
  await fs.mkdir(monorepoCaseRoot, { recursive: true });

  console.log(`[smoke] Building CLI in ${packageRoot}`);
  await run("bun", ["run", "build"], packageRoot, baseEnv);

  const localBejamasPackage = await prepareLocalBejamasPackage(smokeRoot);
  const childEnv = {
    ...baseEnv,
    BEJAMAS_PACKAGE_OVERRIDE: localBejamasPackage,
  };

  assert(
    await pathExists(cliEntry),
    `Expected CLI build output at ${cliEntry}`,
  );

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
  await assertShadcnDryRunFlattensMonorepoTabs(
    path.resolve(monorepoProjectRoot, "apps/web"),
    childEnv,
  );

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

  console.log("[smoke] Adding command to astro project");
  await run(
    "bun",
    [cliEntry, "add", "command", "--yes"],
    astroProjectRoot,
    childEnv,
  );

  await assertFilesExist(astroProjectRoot, [
    "src/ui/tabs/Tabs.astro",
    "src/ui/tabs/index.ts",
    "src/ui/command/Command.astro",
    "src/ui/command/CommandDialog.astro",
    "src/ui/command/CommandInput.astro",
    "src/ui/dialog/DialogContent.astro",
    "src/ui/dialog/index.ts",
  ]);
  await assertFilesExist(monorepoProjectRoot, [
    "packages/ui/src/components/tabs/Tabs.astro",
    "packages/ui/src/components/tabs/index.ts",
  ]);
  await assertFilesMissing(astroProjectRoot, [
    "src/ui/icon/SemanticIcon.astro",
    "src/lib/icons.ts",
  ]);
  await assertPackageDependencies(
    astroProjectRoot,
    "package.json",
    ["@data-slot/command", "@data-slot/dialog", "@iconify-json/tabler"],
    ["@bejamas/semantic-icons", "@lucide/astro"],
  );
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
    "src/ui/tabs/TabsList.astro",
    "cn-tabs-",
  );
  await assertFileDoesNotContain(
    monorepoProjectRoot,
    "packages/ui/src/components/tabs/TabsList.astro",
    "cn-tabs-",
  );
  await assertFileDoesNotContain(
    astroProjectRoot,
    "src/ui/command/CommandInput.astro",
    "@lucide/astro",
  );
  await assertFileDoesNotContain(
    astroProjectRoot,
    "src/ui/command/CommandInput.astro",
    "SearchIcon",
  );
  await assertFileContains(
    astroProjectRoot,
    "src/ui/command/CommandInput.astro",
    'data-slot="command-input-icon"',
  );
  await assertFileContains(
    astroProjectRoot,
    "src/ui/command/CommandInput.astro",
    "<svg",
  );
  await assertFileDoesNotContain(
    astroProjectRoot,
    "src/ui/dialog/DialogContent.astro",
    "SemanticIcon",
  );
  await assertFileDoesNotContain(
    astroProjectRoot,
    "src/ui/dialog/DialogContent.astro",
    "@bejamas/semantic-icons",
  );
  await assertFileContains(
    astroProjectRoot,
    "src/ui/dialog/DialogContent.astro",
    "<svg",
  );

  const astroTabsBeforeSwitch = await readProjectFile(
    astroProjectRoot,
    "src/ui/tabs/TabsList.astro",
  );
  const monorepoTabsBeforeSwitch = await readProjectFile(
    monorepoProjectRoot,
    "packages/ui/src/components/tabs/TabsList.astro",
  );

  console.log("[smoke] Switching astro project to a new preset");
  await run(
    "bun",
    [
      cliEntry,
      "init",
      "--force",
      "--yes",
      "--preset",
      astroSwitchPreset,
      "--cwd",
      astroProjectRoot,
    ],
    packageRoot,
    childEnv,
  );

  console.log("[smoke] Switching astro-monorepo project to a new preset");
  await run(
    "bun",
    [
      cliEntry,
      "init",
      "--force",
      "--yes",
      "--preset",
      monorepoSwitchPreset,
      "--cwd",
      path.resolve(monorepoProjectRoot, "apps/web"),
    ],
    packageRoot,
    childEnv,
  );

  await assertProjectState(
    astroProjectRoot,
    path.resolve(astroProjectRoot, "components.json"),
    astroSwitchConfig,
  );
  await assertProjectState(
    monorepoProjectRoot,
    path.resolve(monorepoProjectRoot, "apps/web/components.json"),
    monorepoSwitchConfig,
  );

  console.log("[smoke] Adding font-geist-mono to astro project");
  await run(
    "bun",
    [cliEntry, "add", "font-geist-mono", "--yes"],
    astroProjectRoot,
    childEnv,
  );

  const astroFontConfigSource = await readProjectFile(
    astroProjectRoot,
    "astro.config.mjs",
  );
  const astroFontLayoutSource = await readProjectFile(
    astroProjectRoot,
    "src/layouts/Layout.astro",
  );
  const astroFontCssSource = await readProjectFile(
    astroProjectRoot,
    "src/styles/globals.css",
  );

  assert(
    astroFontConfigSource.includes("provider: fontProviders.google()") &&
      astroFontConfigSource.includes("provider: fontProviders.fontsource()"),
    "Expected astro.config.mjs to keep the Google sans font and add the Fontsource mono font",
  );
  assert(
    astroFontLayoutSource.includes('<Font cssVariable="--font-sans" />') &&
      astroFontLayoutSource.includes('<Font cssVariable="--font-mono" />'),
    "Expected the Astro layout to render both managed font slots after adding font-geist-mono",
  );
  assert(
    astroFontLayoutSource.includes('<body class="font-mono">'),
    "Expected the Astro layout body to switch to font-mono after adding font-geist-mono",
  );
  assert(
    astroFontCssSource.includes("@apply font-mono;"),
    "Expected globals.css to switch the default HTML font to the mono slot after adding font-geist-mono",
  );

  console.log("[smoke] Booting astro project after font install");
  await assertAstroProjectBootsWithoutFontErrors(astroProjectRoot, 5199);

  const astroTabsAfterSwitch = await readProjectFile(
    astroProjectRoot,
    "src/ui/tabs/TabsList.astro",
  );
  const monorepoTabsAfterSwitch = await readProjectFile(
    monorepoProjectRoot,
    "packages/ui/src/components/tabs/TabsList.astro",
  );

  await assertFilesMissing(monorepoProjectRoot, [
    "packages/ui/src/components/Tabs.astro",
    "packages/ui/src/components/TabsContent.astro",
    "packages/ui/src/components/TabsList.astro",
    "packages/ui/src/components/TabsTrigger.astro",
    "packages/ui/src/components/index.ts",
  ]);

  assert(
    astroTabsAfterSwitch !== astroTabsBeforeSwitch,
    "Expected astro tabs component source to change after preset reinstall",
  );
  assert(
    monorepoTabsAfterSwitch !== monorepoTabsBeforeSwitch,
    "Expected monorepo tabs component source to change after preset reinstall",
  );
  await assertTabsSourceMatchesStyle(
    path.resolve(astroProjectRoot, "src/ui/tabs/TabsList.astro"),
    path.resolve(astroProjectRoot, "src/ui/tabs/TabsTrigger.astro"),
    astroSwitchConfig.style,
  );
  await assertTabsSourceMatchesStyle(
    path.resolve(
      monorepoProjectRoot,
      "packages/ui/src/components/tabs/TabsList.astro",
    ),
    path.resolve(
      monorepoProjectRoot,
      "packages/ui/src/components/tabs/TabsTrigger.astro",
    ),
    monorepoSwitchConfig.style,
  );

  console.log("[smoke] Complete");
  console.log(`[smoke] Astro project: ${astroProjectRoot}`);
  console.log(`[smoke] Astro monorepo project: ${monorepoProjectRoot}`);
}

main().catch((error) => {
  console.error(
    `[smoke] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
