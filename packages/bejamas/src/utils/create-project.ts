import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { initOptionsSchema } from "@/src/commands/init";
import { getPackageManager } from "@/src/utils/get-package-manager";
import { handleError } from "@/src/utils/handle-error";
import { highlighter } from "@/src/utils/highlighter";
import { logger } from "@/src/utils/logger";
import { spinner } from "@/src/utils/spinner";
import { execa } from "execa";
import fg from "fast-glob";
import fs from "fs-extra";
import prompts from "prompts";
import * as tar from "tar";
import { z } from "zod";

export const TEMPLATES = {
  astro: "astro",
  "astro-monorepo": "astro-monorepo",
  "astro-with-component-docs-monorepo": "astro-with-component-docs-monorepo",
} as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_DIRNAME: Record<keyof typeof TEMPLATES, string> = {
  astro: "astro",
  "astro-monorepo": "monorepo-astro",
  "astro-with-component-docs-monorepo": "monorepo-astro-with-docs",
};

const TEMPLATE_EXCLUDED_BASENAMES = new Set(["node_modules", ".astro"]);
const DEFAULT_TEMPLATE_REPOSITORY = "bejamas/ui";
const DEFAULT_TEMPLATE_REF = "main";

type BejamasPackageMetadata = {
  gitHead?: string;
  version?: string;
};

function resolveLocalTemplatesDir(env: NodeJS.ProcessEnv = process.env) {
  const override = env.BEJAMAS_LOCAL_TEMPLATES_DIR?.trim();

  if (override) {
    return path.resolve(override);
  }

  for (const relativePath of [
    "../../../../templates",
    "../../../templates",
    "../../templates",
  ]) {
    const candidate = path.resolve(__dirname, relativePath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(__dirname, "../../../../templates");
}

const LOCAL_TEMPLATES_DIR = resolveLocalTemplatesDir();

function resolvePackageMetadataPath() {
  for (const relativePath of ["../package.json", "../../package.json"]) {
    const candidate = path.resolve(__dirname, relativePath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(__dirname, "../package.json");
}

function readPackageMetadata(): BejamasPackageMetadata {
  try {
    return fs.readJsonSync(resolvePackageMetadataPath()) as BejamasPackageMetadata;
  } catch {
    return {};
  }
}

const BEJAMAS_PACKAGE_METADATA = readPackageMetadata();

function shouldCopyTemplateEntry(source: string) {
  return !TEMPLATE_EXCLUDED_BASENAMES.has(path.basename(source));
}

async function copyTemplateIntoProject(
  templateSource: string,
  projectPath: string,
) {
  await fs.copy(templateSource, projectPath, {
    filter: shouldCopyTemplateEntry,
  });
}

export function resolveRemoteTemplateRefs(
  metadata: Pick<BejamasPackageMetadata, "gitHead" | "version"> = BEJAMAS_PACKAGE_METADATA,
  env: NodeJS.ProcessEnv = process.env,
) {
  const refs = [
    env.BEJAMAS_TEMPLATE_REF?.trim(),
    metadata.gitHead?.trim(),
    metadata.version && !metadata.version.includes("-")
      ? `bejamas@${metadata.version}`
      : undefined,
    DEFAULT_TEMPLATE_REF,
  ].filter((ref): ref is string => Boolean(ref));

  return [...new Set(refs)];
}

export function buildTemplateArchiveUrl(
  ref: string,
  repository = DEFAULT_TEMPLATE_REPOSITORY,
) {
  return `https://api.github.com/repos/${repository}/tarball/${encodeURIComponent(
    ref,
  )}`;
}

function getGitHubRequestHeaders(env: NodeJS.ProcessEnv = process.env) {
  const headers: Record<string, string> = {
    "User-Agent": `bejamas/${BEJAMAS_PACKAGE_METADATA.version ?? "dev"}`,
  };

  const token =
    env.BEJAMAS_GITHUB_TOKEN?.trim() || env.GITHUB_TOKEN?.trim();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function downloadTemplateArchive(ref: string, targetDir: string) {
  const archiveUrl = buildTemplateArchiveUrl(ref);
  const archivePath = path.join(targetDir, "repo.tar.gz");
  const response = await fetch(archiveUrl, {
    headers: getGitHubRequestHeaders(),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(
      `GitHub returned ${response.status} ${response.statusText} for ${ref}.`,
    );
  }

  await fs.ensureDir(targetDir);
  await fs.outputFile(archivePath, Buffer.from(await response.arrayBuffer()));
  await tar.x({
    cwd: targetDir,
    file: archivePath,
    strict: true,
  });

  const extractedEntries = (await fs.readdir(targetDir)).filter(
    (entry) => entry !== "repo.tar.gz",
  );
  const extractedRoot = extractedEntries.find((entry) =>
    fs.statSync(path.join(targetDir, entry)).isDirectory(),
  );

  if (!extractedRoot) {
    throw new Error(`Downloaded archive for ${ref} did not extract correctly.`);
  }

  return path.join(targetDir, extractedRoot);
}

async function copyTemplateFromGitHub(
  templateDirName: string,
  projectPath: string,
) {
  const refs = resolveRemoteTemplateRefs();
  const failures: string[] = [];

  for (const ref of refs) {
    const tempDir = path.join(
      os.tmpdir(),
      `bejamas-template-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    );

    try {
      const extractedRoot = await downloadTemplateArchive(ref, tempDir);
      const templateSource = path.join(extractedRoot, "templates", templateDirName);

      if (!(await fs.pathExists(templateSource))) {
        throw new Error(`Template templates/${templateDirName} was not found.`);
      }

      await copyTemplateIntoProject(templateSource, projectPath);

      return ref;
    } catch (error) {
      failures.push(
        `${ref}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      await fs.remove(tempDir);
    }
  }

  throw new Error(
    [
      `Unable to download templates/${templateDirName} from GitHub.`,
      `Tried refs: ${refs.join(", ")}.`,
      failures.join("\n"),
    ].join("\n"),
  );
}

async function applyLocalPackageOverrides(projectPath: string) {
  const bejamasPackageOverride = process.env.BEJAMAS_PACKAGE_OVERRIDE;

  if (!bejamasPackageOverride) {
    return;
  }

  const packageJsonPaths = await fg("**/package.json", {
    cwd: projectPath,
    absolute: true,
    ignore: ["**/node_modules/**"],
  });
  const normalizedOverride = bejamasPackageOverride.replace(/\\/g, "/");

  await Promise.all(
    packageJsonPaths.map(async (packageJsonPath) => {
      const packageJson = await fs.readJson(packageJsonPath);
      let changed = false;

      for (const field of ["dependencies", "devDependencies"] as const) {
        if (packageJson[field]?.bejamas) {
          packageJson[field].bejamas = `file:${normalizedOverride}`;
          changed = true;
        }
      }

      if (changed) {
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      }
    }),
  );
}

export async function createProject(
  options: Pick<
    z.infer<typeof initOptionsSchema>,
    "cwd" | "force" | "srcDir" | "components" | "template"
  >,
) {
  options = {
    srcDir: false,
    ...options,
  };

  let template: keyof typeof TEMPLATES =
    options.template && TEMPLATES[options.template as keyof typeof TEMPLATES]
      ? (options.template as keyof typeof TEMPLATES)
      : "astro";

  let projectName: string = "my-app";

  const isRemoteComponent =
    options.components?.length === 1 &&
    !!options.components[0].match(/\/chat\/b\//);

  if (!options.force) {
    const { type, name } = await prompts([
      {
        type: options.template || isRemoteComponent ? null : "select",
        name: "type",
        message: `The path ${highlighter.info(
          options.cwd,
        )} does not contain a package.json file.\n  Would you like to start a new project?`,
        choices: [
          { title: "Astro", value: "astro" },
          { title: "Astro (Monorepo)", value: "astro-monorepo" },
          {
            title: "Astro with Component Docs (Monorepo)",
            value: "astro-with-component-docs-monorepo",
          },
        ],
        initial: 0,
      },
      {
        type: "text",
        name: "name",
        message: "What is your project named?",
        initial: (_prev: any, values: any) => {
          const selectedTemplate: string =
            (options.template &&
              TEMPLATES[options.template as keyof typeof TEMPLATES] &&
              options.template) ||
            values.type ||
            template;
          return selectedTemplate?.endsWith("monorepo")
            ? "my-monorepo"
            : "my-app";
        },
        format: (value: string) => value.trim(),
        validate: (value: string) =>
          value.length > 128
            ? `Name should be less than 128 characters.`
            : true,
      },
    ]);

    template = type ?? template;
    projectName = name;
  }

  const packageManager = await getPackageManager(options.cwd, {
    withFallback: true,
  });

  const projectPath = `${options.cwd}/${projectName}`;

  // Check if path is writable.
  try {
    await fs.access(options.cwd, fs.constants.W_OK);
  } catch (error) {
    logger.break();
    logger.error(`The path ${highlighter.info(options.cwd)} is not writable.`);
    logger.error(
      `It is likely you do not have write permissions for this folder or the path ${highlighter.info(
        options.cwd,
      )} does not exist.`,
    );
    logger.break();
    process.exit(1);
  }

  if (fs.existsSync(path.resolve(options.cwd, projectName, "package.json"))) {
    logger.break();
    logger.error(
      `A project with the name ${highlighter.info(projectName)} already exists.`,
    );
    logger.error(`Please choose a different name and try again.`);
    logger.break();
    process.exit(1);
  }

  await createProjectFromTemplate(projectPath, {
    templateKey: template,
    packageManager,
    cwd: options.cwd,
  });

  return {
    projectPath,
    projectName,
    template,
  };
}

async function createProjectFromTemplate(
  projectPath: string,
  options: {
    templateKey: keyof typeof TEMPLATES;
    packageManager: string;
    cwd: string;
  },
) {
  const createSpinner = spinner(
    `Creating a new project from template. This may take a few minutes.`,
  ).start();

  try {
    dotenv.config({ quiet: true });
    const templateDirName = TEMPLATE_DIRNAME[options.templateKey];
    const templateSource = path.resolve(LOCAL_TEMPLATES_DIR, templateDirName);

    if (await fs.pathExists(templateSource)) {
      await copyTemplateIntoProject(templateSource, projectPath);
    } else {
      createSpinner.text = `Downloading the ${highlighter.info(
        options.templateKey,
      )} template from GitHub.`;
      await copyTemplateFromGitHub(templateDirName, projectPath);
    }

    await removeEmptyTemplateI18nDirs(projectPath);

    await applyLocalPackageOverrides(projectPath);

    await execa(options.packageManager, ["install"], {
      cwd: projectPath,
    });

    try {
      // Detect if we're inside an existing git repo; if yes, skip initializing a nested repo
      const { stdout } = await execa(
        "git",
        ["rev-parse", "--is-inside-work-tree"],
        { cwd: projectPath },
      );
      const insideExistingRepo = stdout.trim() === "true";

      if (!insideExistingRepo) {
        await execa("git", ["init"], { cwd: projectPath });
        await execa("git", ["add", "-A"], { cwd: projectPath });
        await execa("git", ["commit", "-m", "Initial commit"], {
          cwd: projectPath,
        });
      }
    } catch (_) {
      // ignore git detection/initialization failures
    }

    createSpinner?.succeed("Creating a new project from template.");
  } catch (error) {
    createSpinner?.fail(
      "Something went wrong creating a new project from template.",
    );
    handleError(error);
  }
}

async function removeEmptyTemplateI18nDirs(projectPath: string) {
  const candidates = [
    path.resolve(projectPath, "src/i18n"),
    path.resolve(projectPath, "apps/web/src/i18n"),
  ];

  await Promise.all(
    candidates.map(async (candidate) => {
      if (!(await fs.pathExists(candidate))) {
        return;
      }

      const entries = await fs.readdir(candidate);
      if (entries.length === 0) {
        await fs.remove(candidate);
      }
    }),
  );
}
