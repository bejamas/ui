import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";
import os from "node:os";
import {
  applyProjectPackageMetadata,
  buildTemplateArchiveUrl,
  resolveRemoteTemplateRefs,
} from "../src/utils/create-project";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

const ASTRO_TEMPLATE_PACKAGE_JSONS = [
  "templates/astro/package.json",
  "templates/monorepo-astro/packages/ui/package.json",
  "templates/monorepo-astro-with-docs/packages/ui/package.json",
] as const;

async function readTemplatePackageJson(relativePath: string) {
  return JSON.parse(
    await fs.readFile(path.resolve(repoRoot, relativePath), "utf8"),
  ) as {
    dependencies?: Record<string, string>;
  };
}

function getSemverMajor(range: string) {
  const match = range.match(/\d+/);

  if (!match) {
    throw new Error(`Unable to parse a semver major from "${range}".`);
  }

  return Number(match[0]);
}

describe("template archive fallback", () => {
  test("prefers an explicit template ref and preserves release fallbacks", () => {
    const refs = resolveRemoteTemplateRefs(
      {
        gitHead: "abcdef123456",
        version: "0.2.12",
      },
      {
        BEJAMAS_TEMPLATE_REF: "feature/template-fix",
      },
    );

    expect(refs).toEqual([
      "feature/template-fix",
      "abcdef123456",
      "bejamas@0.2.12",
      "main",
    ]);
  });

  test("skips package tags for prerelease versions", () => {
    const refs = resolveRemoteTemplateRefs({
      gitHead: "fedcba654321",
      version: "0.3.0-canary.1",
    });

    expect(refs).toEqual(["fedcba654321", "main"]);
  });

  test("builds GitHub tarball URLs against the Bejamas UI repo", () => {
    expect(buildTemplateArchiveUrl("bejamas@0.2.12")).toBe(
      "https://api.github.com/repos/bejamas/ui/tarball/bejamas%400.2.12",
    );
    expect(buildTemplateArchiveUrl("main")).toBe(
      "https://api.github.com/repos/bejamas/ui/tarball/main",
    );
  });
});

describe("astro template manifests", () => {
  test.each(ASTRO_TEMPLATE_PACKAGE_JSONS)(
    "keeps @lucide/astro compatible with Astro 6 in %s",
    async (relativePath) => {
      const packageJson = await readTemplatePackageJson(relativePath);
      const astroRange = packageJson.dependencies?.astro;
      const lucideRange = packageJson.dependencies?.["@lucide/astro"];

      expect(astroRange).toBeDefined();
      expect(lucideRange).toBeDefined();
      expect(getSemverMajor(astroRange!)).toBeGreaterThanOrEqual(6);
      expect(getSemverMajor(lucideRange!)).toBeGreaterThanOrEqual(1);
    },
  );
});

describe("applyProjectPackageMetadata", () => {
  async function templateCopy(template: string) {
    const target = await fs.mkdtemp(path.join(os.tmpdir(), "bejamas-meta-"));
    await fs.cp(path.resolve(repoRoot, "templates", template), target, {
      recursive: true,
      filter: (source) => !source.includes("node_modules"),
    });
    return target;
  }

  test("names the root package after the project and pins the running CLI", async () => {
    const projectPath = await templateCopy("astro");
    await applyProjectPackageMetadata(projectPath, {
      projectName: "My Site",
      bejamasVersion: "1.2.3",
      bejamasOverride: undefined,
    });
    const packageJson = JSON.parse(
      await fs.readFile(path.join(projectPath, "package.json"), "utf8"),
    );
    expect(packageJson.name).toBe("my-site");
    expect(packageJson.dependencies.bejamas).toBe("^1.2.3");
  });

  test("pins every workspace package and keeps workspace package names", async () => {
    const projectPath = await templateCopy("monorepo-astro");
    await applyProjectPackageMetadata(projectPath, {
      projectName: "my-monorepo",
      bejamasVersion: "1.2.3",
      bejamasOverride: undefined,
    });
    const ui = JSON.parse(
      await fs.readFile(
        path.join(projectPath, "packages/ui/package.json"),
        "utf8",
      ),
    );
    const root = JSON.parse(
      await fs.readFile(path.join(projectPath, "package.json"), "utf8"),
    );
    const template = await readTemplatePackageJson(
      "templates/monorepo-astro/packages/ui/package.json",
    );
    expect(root.name).toBe("my-monorepo");
    expect(ui.name).toBe((template as { name?: string }).name);
    expect(ui.dependencies.bejamas).toBe("^1.2.3");
  });

  test("a local package override wins over the version", async () => {
    const projectPath = await templateCopy("astro");
    await applyProjectPackageMetadata(projectPath, {
      projectName: "my-app",
      bejamasVersion: "1.2.3",
      bejamasOverride: "C:\\work\\bejamas",
    });
    const packageJson = JSON.parse(
      await fs.readFile(path.join(projectPath, "package.json"), "utf8"),
    );
    expect(packageJson.dependencies.bejamas).toBe("file:C:/work/bejamas");
  });
});
