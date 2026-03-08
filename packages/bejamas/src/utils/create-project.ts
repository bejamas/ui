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
import fs from "fs-extra";
import prompts from "prompts";
import { z } from "zod";

export const TEMPLATES = {
  astro: "astro",
  "astro-monorepo": "astro-monorepo",
  "astro-with-component-docs-monorepo": "astro-with-component-docs-monorepo",
} as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_TEMPLATES_DIR = path.resolve(__dirname, "../../../../templates");

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

  const TEMPLATE_DIRNAME: Record<keyof typeof TEMPLATES, string> = {
    astro: "astro",
    "astro-monorepo": "monorepo-astro",
    "astro-with-component-docs-monorepo": "monorepo-astro-with-docs",
  };

  try {
    dotenv.config({ quiet: true });
    const templatePath = path.join(os.tmpdir(), `bejamas-template-${Date.now()}`);
    const templateSource = path.resolve(
      LOCAL_TEMPLATES_DIR,
      TEMPLATE_DIRNAME[options.templateKey],
    );

    if (!(await fs.pathExists(templateSource))) {
      throw new Error(`Local template not found: ${templateSource}`);
    }

    await fs.copy(templateSource, projectPath, {
      filter: (source) => {
        const basename = path.basename(source);
        return basename !== "node_modules" && basename !== ".astro";
      },
    });

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
