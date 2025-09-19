import os from "os"
import path from "path"
import { initOptionsSchema } from "@/src/commands/init"
// import { fetchRegistry } from "@/src/registry/fetcher"
import { getPackageManager } from "@/src/utils/get-package-manager"
import { handleError } from "@/src/utils/handle-error"
import { highlighter } from "@/src/utils/highlighter"
import { logger } from "@/src/utils/logger"
import { spinner } from "@/src/utils/spinner"
import { execa } from "execa"
import fs from "fs-extra"
import prompts from "prompts"
import { z } from "zod"

const MONOREPO_TEMPLATE_URL =
  "https://codeload.github.com/shadcn-ui/ui/tar.gz/main"

export const TEMPLATES = {
  astro: "astro",
  "astro-monorepo": "astro-monorepo",
  "astro-with-component-docs-monorepo": "astro-with-component-docs-monorepo",
} as const

export async function createProject(
  options: Pick<
    z.infer<typeof initOptionsSchema>,
    "cwd" | "force" | "srcDir" | "components" | "template"
  >
) {
  options = {
    srcDir: false,
    ...options,
  }

  let template: keyof typeof TEMPLATES =
    options.template && TEMPLATES[options.template as keyof typeof TEMPLATES]
      ? (options.template as keyof typeof TEMPLATES)
      : "astro"
  let projectName: string =
    template === TEMPLATES.astro ? "my-app" : "my-monorepo"
  let astroVersion = "latest"

  const isRemoteComponent =
    options.components?.length === 1 &&
    !!options.components[0].match(/\/chat\/b\//)

  // if (options.components && isRemoteComponent) {
  //   try {
  //     const [result] = await fetchRegistry(options.components)
  //     const { meta } = z
  //       .object({
  //         meta: z.object({
  //           astroVersion: z.string(),
  //         }),
  //       })
  //       .parse(result)
  //     astroVersion = meta.astroVersion

  //     // Force template to astro for remote components.
  //     template = TEMPLATES.astro
  //   } catch (error) {
  //     logger.break()
  //     handleError(error)
  //   }
  // }

  if (!options.force) {
    const { type, name } = await prompts([
      {
        type: options.template || isRemoteComponent ? null : "select",
        name: "type",
        message: `The path ${highlighter.info(
          options.cwd
        )} does not contain a package.json file.\n  Would you like to start a new project?`,
        choices: [
          { title: "Astro", value: "astro" },
          { title: "Astro (Monorepo)", value: "astro-monorepo" },
          { title: "Astro with Component Docs (Monorepo)", value: "astro-with-component-docs-monorepo" },
        ],
        initial: 0,
      },
      {
        type: "text",
        name: "name",
        message: "What is your project named?",
        initial: projectName,
        format: (value: string) => value.trim(),
        validate: (value: string) =>
          value.length > 128
            ? `Name should be less than 128 characters.`
            : true,
      },
    ])

    template = type ?? template
    projectName = name
  }

  const packageManager = await getPackageManager(options.cwd, {
    withFallback: true,
  })

  const projectPath = `${options.cwd}/${projectName}`

  // Check if path is writable.
  try {
    await fs.access(options.cwd, fs.constants.W_OK)
  } catch (error) {
    logger.break()
    logger.error(`The path ${highlighter.info(options.cwd)} is not writable.`)
    logger.error(
      `It is likely you do not have write permissions for this folder or the path ${highlighter.info(
        options.cwd
      )} does not exist.`
    )
    logger.break()
    process.exit(1)
  }

  if (fs.existsSync(path.resolve(options.cwd, projectName, "package.json"))) {
    logger.break()
    logger.error(
      `A project with the name ${highlighter.info(projectName)} already exists.`
    )
    logger.error(`Please choose a different name and try again.`)
    logger.break()
    process.exit(1)
  }

  if (template === TEMPLATES.astro) {
    await createAstroProject(projectPath, {
      version: astroVersion,
      cwd: options.cwd,
      packageManager,
      srcDir: !!options.srcDir,
    })
  }

  if (template === TEMPLATES["astro-monorepo"]) {
    await createMonorepoProject(projectPath, {
      packageManager,
    })
  }

  return {
    projectPath,
    projectName,
    template,
  }
}

async function createAstroProject(
  projectPath: string,
  options: {
    version: string
    cwd: string
    packageManager: string
    srcDir: boolean
  }
) {
  const createSpinner = spinner(
    `Creating a new Astro project. This may take a few minutes.`
  ).start()

  const args = ["--yes", "--install", "--skip-houston"]

  try {
    await execa("npx", [`create-astro@${options.version}`, projectPath, ...args], {
      cwd: options.cwd,
    })

    // Add Tailwind integration to the new Astro project
    await execa("npx", ["astro", "add", "tailwind", "--yes"], {
      cwd: path.resolve(options.cwd, projectPath),
    })
  } catch (error) {
    logger.break()
    logger.error(
      `Something went wrong creating a new Astro project. Please try again.`
    )
    process.exit(1)
  }

  createSpinner?.succeed("Creating a new Astro project.")
}

async function createMonorepoProject(
  projectPath: string,
  options: {
    packageManager: string
  }
) {
  const createSpinner = spinner(
    `Creating a new Astro monorepo. This may take a few minutes.`
  ).start()

  try {
    // Get the template.
    const templatePath = path.join(os.tmpdir(), `shadcn-template-${Date.now()}`)
    await fs.ensureDir(templatePath)
    const response = await fetch(MONOREPO_TEMPLATE_URL)
    if (!response.ok) {
      throw new Error(`Failed to download template: ${response.statusText}`)
    }

    // Write the tar file
    const tarPath = path.resolve(templatePath, "template.tar.gz")
    await fs.writeFile(tarPath, Buffer.from(await response.arrayBuffer()))
    await execa("tar", [
      "-xzf",
      tarPath,
      "-C",
      templatePath,
      "--strip-components=2",
      "ui-main/templates/monorepo-next",
    ])
    const extractedPath = path.resolve(templatePath, "monorepo-next")
    await fs.move(extractedPath, projectPath)
    await fs.remove(templatePath)

    // Run install.
    await execa(options.packageManager, ["install"], {
      cwd: projectPath,
    })

    // Try git init.
    const cwd = process.cwd()
    await execa("git", ["--version"], { cwd: projectPath })
    await execa("git", ["init"], { cwd: projectPath })
    await execa("git", ["add", "-A"], { cwd: projectPath })
    await execa("git", ["commit", "-m", "Initial commit"], {
      cwd: projectPath,
    })
    // await execa("cd", [cwd])

    createSpinner?.succeed("Creating a new Astro monorepo.")
  } catch (error) {
    createSpinner?.fail("Something went wrong creating a new Astro monorepo.")
    handleError(error)
  }
}