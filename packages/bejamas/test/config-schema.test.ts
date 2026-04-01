import { afterEach, describe, expect, test } from "bun:test";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import {
  BEJAMAS_COMPONENTS_SCHEMA_URL,
  createPublicConfigJsonSchema,
  parseRawConfigWithCompatibility,
  workspaceConfigSchema,
} from "../src/schema";
import { getRawConfig } from "../src/utils/get-config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.remove(dir)));
});

describe("components.json schema", () => {
  test("compatibility parser strips legacy upstream keys and preserves Bejamas fields", () => {
    const result = parseRawConfigWithCompatibility({
      $schema: "https://ui.shadcn.com/schema.json",
      style: "new-york",
      rsc: false,
      tsx: true,
      tailwind: {
        config: "",
        css: "src/styles/globals.css",
        baseColor: "neutral",
        cssVariables: true,
        prefix: "",
      },
      iconLibrary: "lucide",
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
        docs: "@/content/docs/components",
      },
      registries: {},
    });

    expect(result.deprecatedKeys).toEqual(["rsc", "tsx"]);
    expect(result.config).not.toHaveProperty("rsc");
    expect(result.config).not.toHaveProperty("tsx");
    expect(result.config.aliases.docs).toBe("@/content/docs/components");
    expect(result.config.style).toBe("new-york");
  });

  test("checked-in schema matches the public Bejamas config schema", async () => {
    const filepath = path.resolve(repoRoot, "apps/web/public/schema.json");
    const checkedIn = JSON.parse(await fs.readFile(filepath, "utf8"));

    expect(checkedIn).toEqual(createPublicConfigJsonSchema());
    expect(checkedIn.$id).toBe(BEJAMAS_COMPONENTS_SCHEMA_URL);
    expect(checkedIn.properties.style.enum).toContain("bejamas-luma");
    expect(checkedIn.properties).not.toHaveProperty("rsc");
    expect(checkedIn.properties).not.toHaveProperty("tsx");
    expect(checkedIn.properties.aliases.properties).toHaveProperty("docs");
    expect(checkedIn.properties.$schema.const).toBe(
      BEJAMAS_COMPONENTS_SCHEMA_URL,
    );
  });

  test("repo-owned components.json files point at the Bejamas schema and omit legacy keys", async () => {
    const configPaths = [
      "apps/web/components.json",
      "templates/astro/components.json",
      "templates/monorepo-astro/apps/web/components.json",
      "templates/monorepo-astro/packages/ui/components.json",
      "templates/monorepo-astro-with-docs/apps/docs/components.json",
      "templates/monorepo-astro-with-docs/apps/web/components.json",
      "templates/monorepo-astro-with-docs/packages/ui/components.json",
    ];

    for (const relativePath of configPaths) {
      const config = JSON.parse(
        await fs.readFile(path.resolve(repoRoot, relativePath), "utf8"),
      ) as Record<string, unknown>;

      expect(config.$schema).toBe(BEJAMAS_COMPONENTS_SCHEMA_URL);
      expect(config.style).toBe("bejamas-juno");
      expect("rsc" in config).toBe(false);
      expect("tsx" in config).toBe(false);
    }
  });

  test("workspace config maps parse under zod v4", () => {
    const result = workspaceConfigSchema.safeParse({
      web: {
        $schema: BEJAMAS_COMPONENTS_SCHEMA_URL,
        style: "bejamas-juno",
        tailwind: {
          config: "tailwind.config.ts",
          css: "src/styles/globals.css",
          baseColor: "neutral",
          cssVariables: true,
          prefix: "",
        },
        aliases: {
          components: "@/components",
          utils: "@/lib/utils",
        },
        resolvedPaths: {
          cwd: "/tmp/project",
          tailwindConfig: "/tmp/project/tailwind.config.ts",
          tailwindCss: "/tmp/project/src/styles/globals.css",
          utils: "/tmp/project/src/lib/utils.ts",
          components: "/tmp/project/src/components",
          lib: "/tmp/project/src/lib",
          hooks: "/tmp/project/src/hooks",
          ui: "/tmp/project/src/ui",
        },
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw result.error;
    }

    expect(result.data.web.style).toBe("bejamas-juno");
  });

  test("getRawConfig warns once per file for deprecated keys", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "bejamas-config-"));
    tempDirs.push(tempDir);

    await fs.writeJson(
      path.resolve(tempDir, "components.json"),
      {
        $schema: "https://ui.shadcn.com/schema.json",
        style: "new-york",
        rsc: false,
        tsx: true,
        tailwind: {
          config: "",
          css: "src/styles/globals.css",
          baseColor: "neutral",
          cssVariables: true,
          prefix: "",
        },
        aliases: {
          components: "@/components",
          utils: "@/lib/utils",
        },
      },
      { spaces: 2 },
    );

    let stderr = "";
    const originalWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderr += chunk.toString();
      return true;
    }) as typeof process.stderr.write;

    try {
      await getRawConfig(tempDir);
      await getRawConfig(tempDir);
    } finally {
      process.stderr.write = originalWrite;
    }

    expect(stderr).toContain("Deprecated components.json keys");
    expect(stderr).toContain("rsc, tsx");
    expect(stderr.match(/Deprecated components\.json keys/g)?.length).toBe(1);
  });
});
