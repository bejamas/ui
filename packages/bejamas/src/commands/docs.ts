import { Command } from "commander";
import { resolve, isAbsolute, relative } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { logger } from "@/src/utils/logger";
import { resolveAliasPathUsingTsConfig } from "@/src/utils/tsconfig-utils";
import prompts from "prompts";

async function generateDocs({
  cwd,
  outDir,
  verbose,
}: {
  cwd?: string;
  outDir?: string;
  verbose?: boolean;
}) {
  const DEBUG =
    process.env.BEJAMAS_DEBUG === "1" ||
    process.env.BEJAMAS_DEBUG === "true" ||
    verbose;

  try {
    const shellCwd = process.cwd();

    // Probe for components.json up the directory tree starting from shell CWD
    let projectRoot = shellCwd;
    let probe: string | null = shellCwd;
    for (let i = 0; i < 6 && probe; i += 1) {
      const candidate = resolve(probe, "components.json");
      if (existsSync(candidate)) {
        projectRoot = probe;
        try {
          const raw = readFileSync(candidate, "utf-8");
          const config = JSON.parse(raw);
          // If UI root not provided via CLI, try to infer from aliases.ui first
          if (!cwd && !process.env.BEJAMAS_UI_ROOT && config?.aliases?.ui) {
            const mapped: string = String(config.aliases.ui);
            let uiAbs: string | null = null;
            if (
              mapped.startsWith("./") ||
              mapped.startsWith("../") ||
              isAbsolute(mapped)
            ) {
              uiAbs = resolve(projectRoot, mapped);
            } else {
              uiAbs = resolveAliasPathUsingTsConfig(mapped, projectRoot);
            }
            if (!uiAbs && mapped.startsWith("@/")) {
              uiAbs = resolve(projectRoot, "src", mapped.slice(2));
            }
            if (uiAbs) {
              process.env.BEJAMAS_UI_ROOT = uiAbs;
            }
          }
          // Fallback: infer UI root from tailwind.css
          if (!cwd && !process.env.BEJAMAS_UI_ROOT && config?.tailwind?.css) {
            const cssRaw = String(config.tailwind.css);
            let cssAbs: string | null = null;
            if (
              cssRaw.startsWith("./") ||
              cssRaw.startsWith("../") ||
              isAbsolute(cssRaw)
            ) {
              cssAbs = resolve(projectRoot, cssRaw);
            } else {
              cssAbs = resolveAliasPathUsingTsConfig(cssRaw, projectRoot);
            }
            if (!cssAbs && cssRaw.startsWith("@/")) {
              cssAbs = resolve(projectRoot, "src", cssRaw.slice(2));
            }
            if (cssAbs) {
              const uiRootFromCss = resolve(cssAbs, "..", "..", "..");
              process.env.BEJAMAS_UI_ROOT = uiRootFromCss;
            }
          }
          // If out dir not provided via CLI, try to infer from aliases.docs
          if (!outDir && config?.aliases?.docs) {
            const mapped: string = String(config.aliases.docs);
            let outResolved: string | null = null;
            if (
              mapped.startsWith("./") ||
              mapped.startsWith("../") ||
              isAbsolute(mapped)
            ) {
              outResolved = mapped;
            } else {
              const abs = resolveAliasPathUsingTsConfig(mapped, projectRoot);
              if (abs) outResolved = relative(projectRoot, abs);
            }
            if (!outResolved && mapped.startsWith("@/")) {
              outResolved = mapped.replace(/^@\//, "src/");
            }
            // As a last resort, use the mapped value as-is so we do not prompt for output
            const finalOut = outResolved ?? mapped;
            if (finalOut && !process.env.BEJAMAS_DOCS_OUT_DIR) {
              process.env.BEJAMAS_DOCS_OUT_DIR = finalOut;
              process.env.BEJAMAS_DOCS_CWD = projectRoot;
            }
          }
        } catch {}
        break;
      }
      const parent = resolve(probe, "..");
      probe = parent === probe ? null : parent;
    }

    // Defaults if not already set from components.json
    if (!process.env.BEJAMAS_DOCS_CWD) {
      process.env.BEJAMAS_DOCS_CWD = shellCwd;
    }
    if (!process.env.BEJAMAS_UI_ROOT) {
      // Ask user for @bejamas/ui root when not inferred
      const defaultGuess = (() => {
        // Try local monorepo style packages/ui
        let current = shellCwd;
        for (let i = 0; i < 6; i += 1) {
          const cand = resolve(current, "packages/ui/package.json");
          if (existsSync(cand)) {
            const abs = resolve(current, "packages/ui");
            const rel = relative(shellCwd, abs);
            return rel || abs;
          }
          const parent = resolve(current, "..");
          if (parent === current) break;
          current = parent;
        }
        // Try installed node_modules fallback
        const nm = resolve(shellCwd, "node_modules/@bejamas/ui/package.json");
        if (existsSync(nm)) {
          const abs = resolve(shellCwd, "node_modules/@bejamas/ui");
          const rel = relative(shellCwd, abs);
          return rel || abs;
        }
        // Last resort: suggest a common local path
        return "packages/ui";
      })();
      const { uiRoot } = await prompts({
        type: "text",
        name: "uiRoot",
        message: "Path to @bejamas/ui package root:",
        initial: defaultGuess,
        validate: (val: string) => {
          const p = resolve(shellCwd, val);
          return existsSync(resolve(p, "package.json"))
            ? true
            : `No package.json found in ${p}`;
        },
      });
      if (!uiRoot) {
        logger.error("@bejamas/ui root is required to generate docs.");
        process.exit(1);
      }
      process.env.BEJAMAS_UI_ROOT = resolve(shellCwd, uiRoot);
    }

    // CLI overrides take precedence
    if (cwd && cwd.length) {
      process.env.BEJAMAS_UI_ROOT = resolve(cwd);
    }
    if (outDir && outDir.length) {
      // Pass through exactly as provided; the generator will resolve against BEJAMAS_DOCS_CWD if needed.
      process.env.BEJAMAS_DOCS_OUT_DIR = outDir;
    }

    // If output dir still not defined, prompt the user
    if (!process.env.BEJAMAS_DOCS_OUT_DIR) {
      const { out } = await prompts({
        type: "text",
        name: "out",
        message: "Where should we output docs (relative to project root)?",
        initial: "src/content/docs/components",
      });
      if (!out) {
        logger.error("An output directory is required to generate docs.");
        process.exit(1);
      }
      process.env.BEJAMAS_DOCS_OUT_DIR = out;
      process.env.BEJAMAS_DOCS_CWD = process.env.BEJAMAS_DOCS_CWD || shellCwd;
    }
    // Ensure the generator does not auto-run upon import; we'll invoke it explicitly
    process.env.BEJAMAS_SKIP_AUTO_RUN = "1";
    logger.info(`Generating docs...`);
    if (DEBUG) {
      logger.info(`Generator entry: @/src/docs/generate-mdx/index`);
      if (process.env.BEJAMAS_UI_ROOT)
        logger.info(`UI root: ${process.env.BEJAMAS_UI_ROOT}`);
      if (process.env.BEJAMAS_DOCS_CWD)
        logger.info(`Docs CWD: ${process.env.BEJAMAS_DOCS_CWD}`);
      if (process.env.BEJAMAS_DOCS_OUT_DIR)
        logger.info(`Docs out: ${process.env.BEJAMAS_DOCS_OUT_DIR}`);
    }
    const mod = await import("@/src/docs/generate-mdx/index");
    if (typeof mod.runDocsGenerator === "function") {
      await mod.runDocsGenerator();
    } else {
      throw new Error(
        "Failed to load docs generator. Export 'runDocsGenerator' not found.",
      );
    }
  } catch (err: any) {
    logger.error(err?.message || String(err));
    process.exit(1);
  }
}

export const docs = new Command()
  .name("docs:build")
  .alias("docs")
  .description("generate docs from @bejamas/ui components")
  .option("-c, --cwd <cwd>", "path to UI working directory")
  .option("-o, --out <outDir>", "output directory for generated MDX files")
  .action(async (opts) => {
    await generateDocs({
      cwd: opts.cwd,
      outDir: opts.out,
      verbose: Boolean(opts.verbose),
    });
  });
