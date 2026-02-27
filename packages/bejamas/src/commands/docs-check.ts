import { Command } from "commander";
import { resolve, isAbsolute, join, extname } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import {
  cyan,
  green,
  red,
  yellow,
  dim,
  bold,
  magenta,
  white,
} from "kleur/colors";
import { logger } from "@/src/utils/logger";
import { resolveAliasPathUsingTsConfig } from "@/src/utils/tsconfig-utils";
import {
  extractFrontmatter,
  parseJsDocMetadata,
  resolveUiRoot,
} from "@/src/docs/generate-mdx/utils";

interface ComponentDocStatus {
  name: string;
  file: string;
  status: "complete" | "incomplete" | "missing";
  missingRequired: string[];
  missingRecommended: string[];
}

interface CheckResult {
  total: number;
  complete: ComponentDocStatus[];
  incomplete: ComponentDocStatus[];
  missing: ComponentDocStatus[];
}

const REQUIRED_FIELDS = ["name", "title", "description"] as const;
const RECOMMENDED_FIELDS = [
  "primaryExampleMDX",
  "usageMDX",
  "figmaUrl",
] as const;

const FIELD_LABELS: Record<string, string> = {
  name: "@component",
  title: "@title",
  description: "@description",
  primaryExampleMDX: "@preview",
  usageMDX: "@usage",
  figmaUrl: "@figmaUrl",
};

function checkComponentDocs(
  filePath: string,
  fileName: string,
): ComponentDocStatus {
  const content = readFileSync(filePath, "utf-8");
  const frontmatter = extractFrontmatter(content);
  const meta = parseJsDocMetadata(frontmatter);

  const componentName = fileName.replace(/\.astro$/i, "");
  const missingRequired: string[] = [];
  const missingRecommended: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    const value = meta[field];
    if (!value || (typeof value === "string" && !value.trim())) {
      missingRequired.push(FIELD_LABELS[field] || field);
    }
  }

  for (const field of RECOMMENDED_FIELDS) {
    const value = meta[field];
    if (!value || (typeof value === "string" && !value.trim())) {
      missingRecommended.push(FIELD_LABELS[field] || field);
    }
  }

  let status: "complete" | "incomplete" | "missing";
  if (missingRequired.length > 0) {
    status = "missing";
  } else if (missingRecommended.length > 0) {
    status = "incomplete";
  } else {
    status = "complete";
  }

  return {
    name: componentName,
    file: fileName,
    status,
    missingRequired,
    missingRecommended,
  };
}

async function checkDocs({
  cwd,
  json,
}: {
  cwd?: string;
  json?: boolean;
}): Promise<void> {
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
        } catch {}
        break;
      }
      const parent = resolve(probe, "..");
      probe = parent === probe ? null : parent;
    }

    // CLI override takes precedence
    if (cwd && cwd.length) {
      process.env.BEJAMAS_UI_ROOT = resolve(cwd);
    }

    let uiRoot: string;
    try {
      uiRoot = resolveUiRoot(shellCwd);
    } catch {
      logger.error(
        "Unable to locate @bejamas/ui. Use --cwd to specify the UI package path.",
      );
      process.exit(1);
    }

    const componentsDir = join(uiRoot, "src", "components");
    if (!existsSync(componentsDir)) {
      logger.error(
        `Components directory not found: ${componentsDir}\n\n` +
          `Expected structure: <uiRoot>/src/components/*.astro\n` +
          `Use --cwd to specify a different UI package root.`,
      );
      process.exit(1);
    }

    const files = readdirSync(componentsDir, { withFileTypes: true })
      .filter((e) => e.isFile() && extname(e.name).toLowerCase() === ".astro")
      .map((e) => e.name)
      .sort();

    if (files.length === 0) {
      logger.warn("No .astro component files found.");
      process.exit(0);
    }

    const results: ComponentDocStatus[] = [];
    for (const file of files) {
      const filePath = join(componentsDir, file);
      const status = checkComponentDocs(filePath, file);
      results.push(status);
    }

    const complete = results.filter((r) => r.status === "complete");
    const incomplete = results.filter((r) => r.status === "incomplete");
    const missing = results.filter((r) => r.status === "missing");

    const checkResult: CheckResult = {
      total: results.length,
      complete,
      incomplete,
      missing,
    };

    if (json) {
      console.log(JSON.stringify(checkResult, null, 2));
      // Exit with error code if there are components missing required docs
      if (missing.length > 0) {
        process.exit(1);
      }
      return;
    }

    // Print formatted report
    const termWidth = Math.min(80, process.stdout.columns || 80);
    const headerLine = "━".repeat(termWidth);

    logger.break();
    console.log(dim("┌" + "─".repeat(termWidth - 2) + "┐"));
    console.log(
      dim("│") +
        bold(cyan("  docs:check")) +
        dim(" — Component Documentation Status") +
        " ".repeat(Math.max(0, termWidth - 47)) +
        dim("│"),
    );
    console.log(dim("└" + "─".repeat(termWidth - 2) + "┘"));
    logger.break();

    // Helper to format tags with color
    const formatTag = (tag: string) => magenta(tag);
    const formatComponentName = (name: string) => bold(white(name));

    // Complete components
    if (complete.length > 0) {
      console.log(
        green(
          `✓ Complete (${complete.length} component${complete.length === 1 ? "" : "s"}):`,
        ),
      );
      const names = complete
        .map((c) => formatComponentName(c.name))
        .join(dim(", "));
      console.log(`  ${names}`);
      logger.break();
    }

    // Incomplete components (missing recommended fields)
    if (incomplete.length > 0) {
      console.log(
        yellow(
          `⚠ Incomplete (${incomplete.length} component${incomplete.length === 1 ? "" : "s"}):`,
        ),
      );
      for (const comp of incomplete) {
        const missingFields = comp.missingRecommended
          .map(formatTag)
          .join(dim(", "));
        console.log(
          `  ${formatComponentName(comp.name)} ${dim("-")} ${dim("missing:")} ${missingFields}`,
        );
      }
      logger.break();
    }

    // Missing docs (missing required fields)
    if (missing.length > 0) {
      console.log(
        red(
          `✗ Missing Docs (${missing.length} component${missing.length === 1 ? "" : "s"}):`,
        ),
      );
      for (const comp of missing) {
        const missingFields = comp.missingRequired
          .map(formatTag)
          .join(dim(", "));
        console.log(
          `  ${formatComponentName(comp.name)} ${dim("-")} ${dim("missing:")} ${missingFields}`,
        );
      }
      logger.break();
    }

    // Summary
    console.log(dim(headerLine));
    const completeText = green(`${complete.length}/${results.length} complete`);
    const incompleteText =
      incomplete.length > 0
        ? yellow(`${incomplete.length} incomplete`)
        : dim(`${incomplete.length} incomplete`);
    const missingText =
      missing.length > 0
        ? red(`${missing.length} missing docs`)
        : dim(`${missing.length} missing docs`);
    console.log(
      `${bold("Summary:")} ${completeText} ${dim("|")} ${incompleteText} ${dim("|")} ${missingText}`,
    );
    logger.break();

    // Exit with error code if there are components missing required docs
    if (missing.length > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    logger.error(err?.message || String(err));
    process.exit(1);
  }
}

export const docsCheck = new Command()
  .name("docs:check")
  .description("check documentation status for all components")
  .option("-c, --cwd <cwd>", "path to UI working directory")
  .option("--json", "output results as JSON")
  .action(async (opts) => {
    await checkDocs({
      cwd: opts.cwd,
      json: Boolean(opts.json),
    });
  });
