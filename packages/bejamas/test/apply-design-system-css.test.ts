import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DesignSystemConfig } from "@bejamas/create-config/server";
import { transformDesignSystemCss } from "../src/utils/apply-design-system";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const astroGlobalsCss = readFileSync(
  path.resolve(repoRoot, "templates/astro/src/styles/globals.css"),
  "utf8",
);
const astroTemplatePackageJson = readFileSync(
  path.resolve(repoRoot, "templates/astro/package.json"),
  "utf8",
);
const astroIndexPage = readFileSync(
  path.resolve(repoRoot, "templates/astro/src/pages/index.astro"),
  "utf8",
);
const astroLayout = readFileSync(
  path.resolve(repoRoot, "templates/astro/src/layouts/Layout.astro"),
  "utf8",
);
const monorepoUiGlobalsCss = readFileSync(
  path.resolve(
    repoRoot,
    "templates/monorepo-astro/packages/ui/src/styles/globals.css",
  ),
  "utf8",
);
const monorepoUiPackageJson = readFileSync(
  path.resolve(repoRoot, "templates/monorepo-astro/packages/ui/package.json"),
  "utf8",
);
const docsMonorepoUiGlobalsCss = readFileSync(
  path.resolve(
    repoRoot,
    "templates/monorepo-astro-with-docs/packages/ui/src/styles/globals.css",
  ),
  "utf8",
);
const docsMonorepoUiPackageJson = readFileSync(
  path.resolve(
    repoRoot,
    "templates/monorepo-astro-with-docs/packages/ui/package.json",
  ),
  "utf8",
);
const monorepoIndexPage = readFileSync(
  path.resolve(
    repoRoot,
    "templates/monorepo-astro/apps/web/src/pages/index.astro",
  ),
  "utf8",
);
const monorepoLayout = readFileSync(
  path.resolve(
    repoRoot,
    "templates/monorepo-astro/apps/web/src/layouts/Layout.astro",
  ),
  "utf8",
);
const docsMonorepoIndexPage = readFileSync(
  path.resolve(
    repoRoot,
    "templates/monorepo-astro-with-docs/apps/web/src/pages/index.astro",
  ),
  "utf8",
);
const docsMonorepoLayout = readFileSync(
  path.resolve(
    repoRoot,
    "templates/monorepo-astro-with-docs/apps/web/src/layouts/Layout.astro",
  ),
  "utf8",
);

const lyraMonoConfig: DesignSystemConfig = {
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

describe("transformDesignSystemCss", () => {
  test("updates template CSS in place without embedding the component layer", () => {
    const result = transformDesignSystemCss(astroGlobalsCss, lyraMonoConfig);

    expect(result).toContain('@import "bejamas/tailwind.css";');
    expect(result).not.toContain("@fontsource-variable/geist-mono");
    expect(result).toContain("--font-mono: var(--font-mono);");
    expect(result).toContain("--font-heading: var(--font-heading);");
    expect(result).toContain("@apply font-mono;");
    expect(result).toContain(".cn-font-heading");
    expect(result).toContain("@apply font-heading;");
    expect(result).toContain("--primary: oklch(0.52 0.105 223.128);");
    expect(result).not.toContain("/* bejamas:create:start */");
    expect(result).not.toContain(".cn-button");
    expect(result).not.toContain(".cn-card");
  });

  test("allows init theme overrides to replace token values", () => {
    const result = transformDesignSystemCss(astroGlobalsCss, lyraMonoConfig, {
      theme: {},
      light: {
        primary: "oklch(0.31 0.07 240)",
      },
      dark: {
        primary: "oklch(0.81 0.08 240)",
      },
    });

    expect(result).toContain("--primary: oklch(0.31 0.07 240);");
    expect(result).toContain(".dark {\n  --primary: oklch(0.81 0.08 240);");
  });

  test("is idempotent when reapplied to already-patched CSS", () => {
    const once = transformDesignSystemCss(astroGlobalsCss, lyraMonoConfig);
    const twice = transformDesignSystemCss(once, lyraMonoConfig);

    expect(twice).toBe(once);
    expect(twice.match(/@import "bejamas\/tailwind\.css";/g)?.length).toBe(1);
    expect(twice).not.toContain("@fontsource-variable/geist-mono");
    expect(twice.match(/^:root \{/gm)?.length).toBe(1);
    expect(twice.match(/^\.dark \{/gm)?.length).toBe(1);
  });

  test("preserves shadcn tailwind import in existing projects", () => {
    const existingSource = astroGlobalsCss.replace(
      '@import "bejamas/tailwind.css";',
      '@import "shadcn/tailwind.css";',
    );
    const result = transformDesignSystemCss(existingSource, lyraMonoConfig);

    expect(result).toContain('@import "shadcn/tailwind.css";');
    expect(result).not.toContain('@import "bejamas/tailwind.css";');
  });

  test("templates import bejamas tailwind.css and declare the bejamas dependency", () => {
    for (const source of [
      astroGlobalsCss,
      monorepoUiGlobalsCss,
      docsMonorepoUiGlobalsCss,
    ]) {
      expect(source).toContain('@import "bejamas/tailwind.css";');
      expect(source).toContain("--font-heading: var(--font-heading);");
      expect(source).toContain(".cn-font-heading");
    }

    for (const packageJson of [
      astroTemplatePackageJson,
      monorepoUiPackageJson,
      docsMonorepoUiPackageJson,
    ]) {
      expect(packageJson).toContain('"bejamas": "^');
    }
  });

  test("starter landing pages do not hardcode font-sans", () => {
    expect(astroIndexPage).not.toContain('class="font-sans ');
    expect(monorepoIndexPage).not.toContain('class="font-sans ');
    expect(docsMonorepoIndexPage).not.toContain('class="font-sans ');
  });

  test("starter landing pages do not hardcode font-mono", () => {
    expect(astroIndexPage).not.toContain("font-mono");
    expect(monorepoIndexPage).not.toContain("font-mono");
    expect(docsMonorepoIndexPage).not.toContain("font-mono");
  });

  test("default Astro templates do not ship template i18n files", () => {
    expect(
      existsSync(path.resolve(repoRoot, "templates/astro/src/i18n/ui.ts")),
    ).toBe(false);
    expect(existsSync(path.resolve(repoRoot, "templates/astro/src/i18n"))).toBe(
      false,
    );
    expect(
      existsSync(
        path.resolve(
          repoRoot,
          "templates/monorepo-astro/apps/web/src/i18n/ui.ts",
        ),
      ),
    ).toBe(false);
    expect(
      existsSync(
        path.resolve(repoRoot, "templates/monorepo-astro/apps/web/src/i18n"),
      ),
    ).toBe(false);
    expect(
      existsSync(
        path.resolve(
          repoRoot,
          "templates/monorepo-astro-with-docs/apps/web/src/i18n/ui.ts",
        ),
      ),
    ).toBe(false);
    expect(
      existsSync(
        path.resolve(
          repoRoot,
          "templates/monorepo-astro-with-docs/apps/web/src/i18n",
        ),
      ),
    ).toBe(false);
  });

  test("default Astro templates use static English layout and page content", () => {
    for (const source of [
      astroLayout,
      astroIndexPage,
      monorepoLayout,
      monorepoIndexPage,
      docsMonorepoLayout,
      docsMonorepoIndexPage,
    ]) {
      expect(source).not.toContain('from "@/i18n/ui"');
      expect(source).not.toContain("appUi.");
    }

    expect(astroLayout).toContain('<html lang="en">');
    expect(monorepoLayout).toContain('<html lang="en">');
    expect(docsMonorepoLayout).toContain('<html lang="en">');
  });
});
