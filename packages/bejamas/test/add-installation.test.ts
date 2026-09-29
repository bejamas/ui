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

test("fails instead of hanging when shadcn asks a question it cannot decline", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bejamas-add-prompt-"));
  roots.push(root);
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "app" }),
  );
  await fs.mkdir(path.join(root, "bin"));
  // A select question is left open until stdin closes, like shadcn's setup flow.
  await fs.writeFile(
    path.join(root, "bin/npm"),
    `#!/usr/bin/env bun
process.stdout.write("? Which color would you like to use as the base color? › - Use arrow-keys. Return to submit.\\n❯   Neutral\\n    Gray");
process.stdin.resume();
setInterval(() => {}, 1000);
`,
  );
  await fs.chmod(path.join(root, "bin/npm"), 0o755);
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () =>
      Response.json({ name: "button", type: "registry:ui", files: [] }),
  });
  try {
    const child = Bun.spawn(
      [process.execPath, cliEntry, "add", "button", "--cwd", root],
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
    const timeout = setTimeout(() => child.kill(), 10_000);
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    clearTimeout(timeout);
    expect(child.signalCode).toBeNull();
    expect(code).toBe(1);
    expect(stdout + stderr).toContain(
      'cannot answer: "Which color would you like to use as the base color?"',
    );
  } finally {
    server.stop(true);
  }
}, 15_000);

test("leaves files shadcn skipped untouched while repairing written ones", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bejamas-add-skipped-"));
  roots.push(root);
  async function write(relative: string, value: string | object) {
    const file = path.join(root, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(
      file,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  }
  await write("package.json", { name: "app" });
  await write("tsconfig.json", {
    compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"] } },
  });
  await write("components.json", {
    style: "bejamas-juno",
    iconLibrary: "lucide",
    tailwind: {
      css: "src/styles/globals.css",
      baseColor: "neutral",
      cssVariables: true,
    },
    aliases: {
      components: "@/components",
      ui: "@/ui",
      utils: "@/lib/utils",
      lib: "@/lib",
      hooks: "@/hooks",
    },
  });

  const registryImport =
    '---\nimport { Button } from "@/registry/bejamas/ui/button";\n---\n<Button />';
  const written = "src/components/blocks/features-01/Features01.astro";
  const keptBlock = "src/components/blocks/features-01/Custom.astro";
  const keptUi = "src/ui/card/Card.astro";
  // Files the user already has and declines to overwrite.
  await write(keptBlock, registryImport);
  await write(keptUi, registryImport);

  await write(
    "bin/npm",
    `#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
const file = path.join(${JSON.stringify(root)}, ${JSON.stringify(written)});
await fs.mkdir(path.dirname(file), { recursive: true });
await fs.writeFile(file, ${JSON.stringify(registryImport)});
console.error("Created 1 file:");
console.log("  - ${written}");
console.error("Skipped 2 files: (files might be identical, use --overwrite to overwrite)");
console.log("  - ${keptBlock}");
console.log("  - ${keptUi}");
`,
  );
  await fs.chmod(path.join(root, "bin/npm"), 0o755);
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () =>
      Response.json({
        name: "features-01",
        type: "registry:block",
        files: [
          {
            path: "blocks/features-01/Features01.astro",
            type: "registry:component",
            target: written,
            content: registryImport,
          },
        ],
      }),
  });
  try {
    const child = Bun.spawn(
      [process.execPath, cliEntry, "add", "features-01", "--cwd", root],
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
    expect(code, stdout + stderr).toBe(0);
    expect(await fs.readFile(path.join(root, written), "utf8")).toContain(
      'from "@/ui/button"',
    );
    expect(await fs.readFile(path.join(root, keptBlock), "utf8")).toBe(
      registryImport,
    );
    expect(await fs.readFile(path.join(root, keptUi), "utf8")).toBe(
      registryImport,
    );
  } finally {
    server.stop(true);
  }
});

test("installs missing dependencies once for a multi-item command", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "bejamas-add-batch-deps-"),
  );
  roots.push(root);
  async function write(relative: string, value: string | object) {
    const file = path.join(root, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(
      file,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  }
  await write("package.json", { name: "app" });
  await write("tsconfig.json", {
    compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"] } },
  });
  await write("components.json", {
    style: "bejamas-juno",
    iconLibrary: "lucide",
    tailwind: {
      css: "src/styles/globals.css",
      baseColor: "neutral",
      cssVariables: true,
    },
    aliases: {
      components: "@/components",
      ui: "@/ui",
      utils: "@/lib/utils",
      lib: "@/lib",
      hooks: "@/hooks",
    },
  });

  const installLog = path.join(root, "installs.log");
  await write(
    "bin/npm",
    `#!/usr/bin/env bun
import fs from "node:fs/promises";
const args = process.argv.slice(2);
if (args[0] === "install") {
  await fs.appendFile(${JSON.stringify(installLog)}, args.slice(1).join(" ") + "\\n");
  process.exit(0);
}
console.error("No files updated.");
`,
  );
  await fs.chmod(path.join(root, "bin/npm"), 0o755);
  const items = new Map([
    [
      "button",
      {
        name: "button",
        type: "registry:ui",
        dependencies: ["@data-slot/a"],
        files: [],
      },
    ],
    [
      "card",
      {
        name: "card",
        type: "registry:ui",
        dependencies: ["@data-slot/b"],
        files: [],
      },
    ],
  ]);
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const item = items.get(
        path.basename(new URL(request.url).pathname, ".json"),
      );
      return item
        ? Response.json(item)
        : new Response("Not found", { status: 404 });
    },
  });
  try {
    const child = Bun.spawn(
      [process.execPath, cliEntry, "add", "button", "card", "--cwd", root],
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
    expect(code, stdout + stderr).toBe(0);
    expect(await fs.readFile(installLog, "utf8")).toBe(
      "@data-slot/a @data-slot/b\n",
    );
  } finally {
    server.stop(true);
  }
});
