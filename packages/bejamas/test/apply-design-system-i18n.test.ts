import { afterEach, describe, expect, test } from "bun:test";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import type { DesignSystemConfig } from "@bejamas/create-config/server";
import { applyDesignSystemToProject } from "../src/utils/apply-design-system";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

const tempDirs: string[] = [];

const baseConfig: DesignSystemConfig = {
  style: "juno",
  baseColor: "neutral",
  theme: "neutral",
  iconLibrary: "lucide",
  font: "geist",
  fontHeading: "inherit",
  radius: "default",
  menuColor: "default",
  menuAccent: "subtle",
  template: "astro",
  rtl: false,
  rtlLanguage: "ar",
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.remove(dir)));
});

async function createTempProject(kind: "astro" | "monorepo") {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `bejamas-i18n-${kind}-`),
  );
  tempDirs.push(tempDir);

  const relativeFiles =
    kind === "astro"
      ? [
          "astro.config.mjs",
          "components.json",
          "package.json",
          "src/layouts/Layout.astro",
          "src/pages/index.astro",
          "src/styles/globals.css",
        ]
      : [
          "package.json",
          "apps/web/astro.config.mjs",
          "apps/web/components.json",
          "apps/web/src/layouts/Layout.astro",
          "apps/web/src/pages/index.astro",
          "packages/ui/package.json",
          "packages/ui/src/styles/globals.css",
        ];

  for (const relativeFile of relativeFiles) {
    await fs.copy(
      path.resolve(
        repoRoot,
        `templates/${kind === "astro" ? "astro" : "monorepo-astro"}`,
        relativeFile,
      ),
      path.resolve(tempDir, relativeFile),
    );
  }

  return tempDir;
}

describe("applyDesignSystemToProject RTL template i18n", () => {
  test("keeps fresh Astro projects on static English without creating template i18n", async () => {
    const projectPath = await createTempProject("astro");

    await applyDesignSystemToProject(projectPath, baseConfig);

    expect(
      await fs.pathExists(path.resolve(projectPath, "src/i18n/ui.ts")),
    ).toBe(false);
    expect(
      await fs.readFile(
        path.resolve(projectPath, "src/layouts/Layout.astro"),
        "utf8",
      ),
    ).not.toContain('from "@/i18n/ui"');
    expect(
      await fs.readFile(
        path.resolve(projectPath, "src/pages/index.astro"),
        "utf8",
      ),
    ).not.toContain('from "@/i18n/ui"');
  });

  test("creates template i18n and rewires a fresh Astro starter when RTL is enabled", async () => {
    const projectPath = await createTempProject("astro");

    await applyDesignSystemToProject(projectPath, {
      ...baseConfig,
      rtl: true,
      rtlLanguage: "he",
    });

    const i18nSource = await fs.readFile(
      path.resolve(projectPath, "src/i18n/ui.ts"),
      "utf8",
    );
    const layoutSource = await fs.readFile(
      path.resolve(projectPath, "src/layouts/Layout.astro"),
      "utf8",
    );
    const pageSource = await fs.readFile(
      path.resolve(projectPath, "src/pages/index.astro"),
      "utf8",
    );

    expect(i18nSource).toContain(
      'export const CURRENT_LANGUAGE: TemplateLanguage = "he";',
    );
    expect(layoutSource).toContain('import { appUi } from "@/i18n/ui";');
    expect(layoutSource).toContain("<html lang={appUi.lang} dir={appUi.dir}>");
    expect(layoutSource).toContain("<title>{appUi.metadataTitle}</title>");
    expect(pageSource).toContain('import { appUi } from "@/i18n/ui";');
    expect(pageSource).toContain("appUi.welcomeMessage.split");
    expect(pageSource).toContain("{appUi.getStartedMessage}");
  });

  test("creates template i18n under apps/web for monorepo starters", async () => {
    const projectPath = await createTempProject("monorepo");

    await applyDesignSystemToProject(projectPath, {
      ...baseConfig,
      template: "astro-monorepo",
      rtl: true,
      rtlLanguage: "fa",
    });

    expect(
      await fs.pathExists(path.resolve(projectPath, "apps/web/src/i18n/ui.ts")),
    ).toBe(true);
    expect(
      await fs.readFile(
        path.resolve(projectPath, "apps/web/src/layouts/Layout.astro"),
        "utf8",
      ),
    ).toContain('import { appUi } from "@/i18n/ui";');
    expect(
      await fs.readFile(
        path.resolve(projectPath, "apps/web/src/pages/index.astro"),
        "utf8",
      ),
    ).toContain("appUi.welcomeMessage.split");
  });

  test("preserves existing template i18n on non-RTL reapply", async () => {
    const projectPath = await createTempProject("astro");

    await applyDesignSystemToProject(projectPath, {
      ...baseConfig,
      rtl: true,
      rtlLanguage: "he",
    });
    await applyDesignSystemToProject(projectPath, baseConfig);

    const i18nSource = await fs.readFile(
      path.resolve(projectPath, "src/i18n/ui.ts"),
      "utf8",
    );
    const layoutSource = await fs.readFile(
      path.resolve(projectPath, "src/layouts/Layout.astro"),
      "utf8",
    );
    const pageSource = await fs.readFile(
      path.resolve(projectPath, "src/pages/index.astro"),
      "utf8",
    );

    expect(i18nSource).toContain(
      'export const CURRENT_LANGUAGE: TemplateLanguage = "he";',
    );
    expect(layoutSource).toContain('from "@/i18n/ui"');
    expect(pageSource).toContain('from "@/i18n/ui"');
  });
});
