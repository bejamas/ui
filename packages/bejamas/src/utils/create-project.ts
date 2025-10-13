import os from "os";
import path from "path";
import dotenv from "dotenv";
import { initOptionsSchema } from "@/src/commands/init";
import { getPackageManager } from "@/src/utils/get-package-manager";
import { handleError } from "@/src/utils/handle-error";
import { highlighter } from "@/src/utils/highlighter";
import { logger } from "@/src/utils/logger";
import { spinner } from "@/src/utils/spinner";
import { execa } from "execa";
import fs from "fs-extra";
import prompts from "prompts";
import { z } from "zod";

export const TEMPLATES = {
  astro: "astro",
  "astro-monorepo": "astro-monorepo",
  "astro-with-component-docs-monorepo": "astro-with-component-docs-monorepo",
} as const;

const MONOREPO_TEMPLATE_URL =
  "https://codeload.github.com/bejamas/ui/tar.gz/main";

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

  const TEMPLATE_TAR_SUBPATH: Record<keyof typeof TEMPLATES, string> = {
    astro: "ui-main/templates/astro",
    "astro-monorepo": "ui-main/templates/monorepo-astro",
    "astro-with-component-docs-monorepo":
      "ui-main/templates/monorepo-astro-with-docs",
  };

  try {
    // Load local .env if present to allow GITHUB_TOKEN/GH_TOKEN
    dotenv.config({ quiet: true });
    const templatePath = path.join(
      os.tmpdir(),
      `bejamas-template-${Date.now()}`,
    );
    await fs.ensureDir(templatePath);

    // Auth via environment variables (.env supported)
    const authToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const usedAuth = Boolean(authToken);
    const headers: Record<string, string> = {
      "User-Agent": "bejamas-cli",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(MONOREPO_TEMPLATE_URL, { headers });
    if (!response.ok) {
      if (
        response.status === 401 ||
        response.status === 403 ||
        (!usedAuth && response.status === 404)
      ) {
        throw new Error(
          "Unauthorized to access private template. Set GITHUB_TOKEN or GH_TOKEN (in .env or env) with repo access and try again.",
        );
      }
      if (response.status === 404) {
        throw new Error("Failed to download template: not found.");
      }
      throw new Error(
        `Failed to download template: ${response.status} ${response.statusText}`,
      );
    }

    const tarPath = path.resolve(templatePath, "template.tar.gz");
    await fs.writeFile(tarPath, Buffer.from(await response.arrayBuffer()));

    const tarSubpath = TEMPLATE_TAR_SUBPATH[options.templateKey];
    const leafName = tarSubpath.split("/").pop() as string;

    await execa("tar", [
      "-xzf",
      tarPath,
      "-C",
      templatePath,
      "--strip-components=2",
      tarSubpath,
    ]);

    const extractedPath = path.resolve(templatePath, leafName);
    await fs.move(extractedPath, projectPath);
    await fs.remove(templatePath);

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
