import { afterEach, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const cliEntry = path.resolve(import.meta.dir, "../dist/index.js");
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots
      .splice(0)
      .map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

for (const failure of ["missing", "broken"]) {
  test(`completes a monorepo block before a later ${failure} item fails`, async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "bejamas-add-batch-"));
    roots.push(root);
    const app = path.join(root, "apps/web");
    const ui = path.join(root, "packages/ui");
    async function write(relative: string, value: string | object) {
      const file = path.join(root, relative);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(
        file,
        typeof value === "string" ? value : JSON.stringify(value),
      );
    }
    await write("package.json", {
      private: true,
      workspaces: ["apps/*", "packages/*"],
    });
    await write("apps/web/package.json", { name: "web" });
    await write("packages/ui/package.json", {
      name: "@repo/ui",
      exports: { "./components/*": "./src/components/*.astro" },
    });
    await write("apps/web/tsconfig.json", {
      compilerOptions: {
        baseUrl: ".",
        paths: { "@/*": ["src/*"], "@repo/ui/*": ["../../packages/ui/src/*"] },
      },
    });
    await write("packages/ui/tsconfig.json", {
      compilerOptions: { baseUrl: ".", paths: { "@repo/ui/*": ["src/*"] } },
    });
    const shared = {
      style: "bejamas-juno",
      iconLibrary: "lucide",
      tailwind: {
        css: "src/styles/globals.css",
        baseColor: "neutral",
        cssVariables: true,
      },
    };
    await write("apps/web/components.json", {
      ...shared,
      aliases: {
        components: "@/widgets",
        ui: "@repo/ui/components",
        utils: "@repo/ui/lib/utils",
        lib: "@/lib",
        hooks: "@/hooks",
      },
    });
    await write("packages/ui/components.json", {
      ...shared,
      aliases: {
        components: "@repo/ui/components",
        ui: "@repo/ui/components",
        utils: "@repo/ui/lib/utils",
        lib: "@repo/ui/lib",
        hooks: "@repo/ui/hooks",
      },
    });

    const blockPath =
      "apps/web/src/components/blocks/features-01/Features01.astro";
    const source =
      '---\nimport { Button } from "@/registry/bejamas/ui/button";\n---\n<Button />';
    const button = {
      name: "button",
      type: "registry:ui",
      files: [
        {
          path: "ui/button/Button.astro",
          type: "registry:ui",
          content: "<button />",
        },
        {
          path: "ui/button/index.ts",
          type: "registry:ui",
          content: 'export { default as Button } from "./Button.astro";',
        },
      ],
    };
    const block = {
      name: "features-01",
      type: "registry:block",
      registryDependencies: ["button"],
      files: [
        {
          path: "blocks/features-01/Features01.astro",
          type: "registry:component",
          target: blockPath.replace("apps/web/", ""),
          content: source,
        },
      ],
    };
    const items = new Map([
      ["button", button],
      ["features-01", block],
      ["broken", { name: "broken", type: "registry:block", files: [] }],
    ]);
    const requests: string[] = [];
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch(request) {
        const name = path.basename(new URL(request.url).pathname, ".json");
        requests.push(name);
        const item = items.get(name);
        return item
          ? Response.json(item)
          : new Response("Not found", { status: 404 });
      },
    });

    // Replace only the external installer. Exercise the actual CLI, config
    // resolution, registry traversal, file repair and package export updates.
    await write(
      "bin/npm",
      `#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
if (process.argv.includes("broken")) { console.error("installer failed"); process.exit(1); }
const root = ${JSON.stringify(root)};
const files = ${JSON.stringify([
        [blockPath, source],
        ["packages/ui/src/components/Button.astro", button.files[0].content],
        ["packages/ui/src/components/index.ts", button.files[1].content],
      ])};
for (const [relative, content] of files) {
  const file = path.join(root, relative);
  await fs.mkdir(path.dirname(file), {recursive:true});
  await fs.writeFile(file, content);
}
console.error("Created 3 files:");
for (const [file] of files) console.log("  - " + file);
`,
    );
    await fs.chmod(path.join(root, "bin/npm"), 0o755);
    try {
      const child = Bun.spawn(
        [
          process.execPath,
          cliEntry,
          "add",
          "features-01",
          failure,
          "--silent",
          "--cwd",
          app,
        ],
        {
          env: {
            ...process.env,
            BEJAMAS_UI_URL: `http://127.0.0.1:${server.port}`,
            PATH: `${path.join(root, "bin")}:${process.env.PATH}`,
          },
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      const [stdout, stderr, code] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      expect(code).not.toBe(0);
      expect(stdout + stderr).toContain(
        failure === "broken"
          ? "installer failed"
          : "Unable to load registry item missing",
      );
      expect(await fs.readFile(path.join(root, blockPath), "utf8")).toContain(
        'from "@repo/ui/components/button"',
      );
      expect(
        await fs.readFile(
          path.join(ui, "src/components/button/index.ts"),
          "utf8",
        ),
      ).toContain("./Button.astro");
      expect(
        JSON.parse(await fs.readFile(path.join(ui, "package.json"), "utf8"))
          .exports["./components/*"],
      ).toBe("./src/components/*/index.ts");
      expect(requests.filter((name) => name === "features-01")).toHaveLength(1);
      expect(requests.filter((name) => name === "button")).toHaveLength(1);
    } finally {
      server.stop(true);
    }
  });
}
