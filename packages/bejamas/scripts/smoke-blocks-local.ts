import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

// Local end-to-end check for block installation. Run after building the CLI
// (`bun run build`) and the web registry (`bun run --cwd ../../apps/web
// build:artifacts`). It uses the real pinned shadcn installer and package
// manager against private synthetic blocks and UI dependencies served from
// apps/web/public/r; fixtures and logs stay under tmp/ for troubleshooting.
const repoRoot = path.resolve(import.meta.dir, "../../..");
const smokeRoot = path.join(repoRoot, "tmp", `blocks-smoke-${Date.now()}`);
const cli = path.join(repoRoot, "packages/bejamas/dist/index.js");
const registryRoot = path.join(repoRoot, "apps/web/public/r");
const blocks = [
  ["smoke-panel-01", "SmokePanel01"],
  ["smoke-panel-02", "SmokePanel02"],
] as const;

// These blocks exist only in the local smoke server, never in the public catalog.
function smokeBlock(id: string, component: string) {
  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: id,
    type: "registry:block",
    registryDependencies: ["index", "button", "card"],
    files: [
      {
        path: `blocks/${id}/${component}.astro`,
        target: `src/components/blocks/${id}/${component}.astro`,
        type: "registry:component",
        content: `---\nimport { Button } from "@/registry/bejamas/ui/button";\nimport { Card, CardContent } from "@/registry/bejamas/ui/card";\n---\n<section data-smoke-block="${id}"><Card><CardContent><Button>Smoke fixture</Button></CardContent></Card></section>\n`,
      },
      {
        path: `blocks/${id}/index.ts`,
        target: `src/components/blocks/${id}/index.ts`,
        type: "registry:component",
        content: `export { default as ${component} } from "./${component}.astro";\n`,
      },
    ],
  };
}

async function write(relativePath: string, value: string | object) {
  const target = path.join(smokeRoot, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(
    target,
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
  );
}

async function run(
  cwd: string,
  args: string[],
  env: Record<string, string | undefined>,
) {
  const proc = Bun.spawn(args, { cwd, env, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  const output = stdout + stderr;
  await fs.appendFile(
    path.join(smokeRoot, "commands.log"),
    `$ ${args.join(" ")}\n${output}\n`,
  );
  assert.equal(code, 0, `${args.join(" ")} failed:\n${output}`);
  return output;
}

async function snapshot(root: string): Promise<Record<string, string>> {
  const entries: Record<string, string> = {};
  async function visit(dir: string) {
    for (const item of await fs.readdir(dir, { withFileTypes: true })) {
      if (["node_modules", ".astro", "dist"].includes(item.name)) continue;
      const file = path.join(dir, item.name);
      if (item.isDirectory()) await visit(file);
      else if (item.isFile())
        entries[path.relative(root, file)] = await fs.readFile(file, "utf8");
    }
  }
  await visit(root);
  return entries;
}

async function createFixture(monorepo: boolean) {
  const name = monorepo ? "monorepo" : "astro";
  const app = monorepo ? `${name}/apps/web` : name;
  const ui = monorepo ? `${name}/packages/ui` : name;
  const templatePackage = await Bun.file(
    path.join(repoRoot, "templates/astro/package.json"),
  ).json();
  const dependencies = {
    ...templatePackage.dependencies,
    astro: "7.2.9",
    tailwindcss: "^4.3.2",
    "@tailwindcss/vite": "^4.3.2",
    "tw-animate-css": "^1.4.0",
    typescript: "^5.9.3",
    bejamas: `file:${path.join(smokeRoot, "local-bejamas")}`,
  };

  if (monorepo) {
    await write(`${name}/package.json`, {
      name: "blocks-smoke",
      private: true,
      workspaces: ["apps/*", "packages/*"],
    });
    await write(`${ui}/package.json`, {
      name: "@repo/ui",
      type: "module",
      dependencies,
      exports: {
        "./components/*": "./src/components/*/index.ts",
        "./lib/*": "./src/lib/*.ts",
      },
    });
    await write(`${ui}/tsconfig.json`, {
      compilerOptions: { baseUrl: ".", paths: { "@repo/ui/*": ["./src/*"] } },
    });
  }
  await write(`${app}/package.json`, {
    name: `blocks-${name}-web`,
    type: "module",
    scripts: { build: "astro build" },
    dependencies: {
      ...dependencies,
      ...(monorepo ? { "@repo/ui": "workspace:*" } : {}),
    },
  });
  await write(`${app}/tsconfig.json`, {
    extends: "astro/tsconfigs/strict",
    compilerOptions: {
      baseUrl: ".",
      paths: {
        "@/*": ["./src/*"],
        ...(monorepo ? { "@repo/ui/*": ["../../packages/ui/src/*"] } : {}),
      },
    },
  });
  await write(
    `${app}/astro.config.mjs`,
    'import { defineConfig } from "astro/config";\nimport tailwindcss from "@tailwindcss/vite";\nexport default defineConfig({ vite: { plugins: [tailwindcss()] } });\n',
  );
  const tailwind = {
    config: "",
    css: "src/styles/globals.css",
    baseColor: "neutral",
    cssVariables: true,
  };
  // Deliberately unusual aliases: blocks must be repaired even when they land
  // outside the configured component roots.
  const aliases = {
    components: "@/widgets",
    utils: "@/lib/utils",
    ui: "@/ui",
    lib: "@/lib",
    hooks: "@/hooks",
  };
  await write(`${app}/components.json`, {
    style: monorepo ? "bejamas-vega" : "bejamas-juno",
    iconLibrary: "lucide",
    tailwind: {
      ...tailwind,
      css: monorepo ? "../../packages/ui/src/styles/globals.css" : tailwind.css,
    },
    aliases: {
      ...aliases,
      ...(monorepo
        ? { ui: "@repo/ui/components", utils: "@repo/ui/lib/utils" }
        : {}),
    },
  });
  if (monorepo)
    await write(`${ui}/components.json`, {
      style: "bejamas-vega",
      iconLibrary: "lucide",
      tailwind,
      aliases: {
        components: "@repo/ui/components",
        ui: "@repo/ui/components",
        utils: "@repo/ui/lib/utils",
        lib: "@repo/ui/lib",
        hooks: "@repo/ui/hooks",
      },
    });
  await write(
    `${ui}/src/styles/globals.css`,
    await fs.readFile(
      path.join(repoRoot, "templates/astro/src/styles/globals.css"),
      "utf8",
    ),
  );
  await write(
    `${ui}/src/lib/utils.ts`,
    'import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\nexport function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }\n',
  );
  await write(
    `${app}/src/pages/index.astro`,
    "<html><body>Block smoke fixture</body></html>",
  );
  return {
    root: path.join(smokeRoot, name),
    app: path.join(smokeRoot, app),
    ui: path.join(smokeRoot, ui),
    monorepo,
  };
}

await fs.mkdir(smokeRoot, { recursive: true });
await write("local-bejamas/package.json", {
  name: "bejamas",
  version: "0.0.0-local",
  type: "module",
  exports: { "./tailwind.css": "./tailwind.css" },
});
for (const file of ["tailwind.css", "src/tailwind.css"]) {
  await write(
    `local-bejamas/${file}`,
    await fs.readFile(path.join(repoRoot, "packages/bejamas", file), "utf8"),
  );
}
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (!pathname.startsWith("/r/"))
      return new Response("Not found", { status: 404 });
    const block = blocks.find(
      ([id]) =>
        pathname === `/r/${id}.json` ||
        (/^\/r\/styles\/bejamas-[a-z]+\//.test(pathname) &&
          pathname.endsWith(`/${id}.json`)),
    );
    if (block) return Response.json(smokeBlock(...block));
    const filePath = path.resolve(registryRoot, pathname.slice(3));
    if (!filePath.startsWith(`${registryRoot}/`))
      return new Response("Not found", { status: 404 });
    const file = Bun.file(filePath);
    return (await file.exists())
      ? new Response(file, { headers: { "Content-Type": "application/json" } })
      : new Response("Not found", { status: 404 });
  },
});
const baseUrl = `http://127.0.0.1:${server.port}`;
const env = {
  ...process.env,
  BEJAMAS_UI_URL: baseUrl,
  REGISTRY_URL: `${baseUrl}/r`,
  npm_config_user_agent: `bun/${Bun.version}`,
};
console.log(`[blocks smoke] Fixtures: ${smokeRoot}`);
try {
  for (const monorepo of [false, true]) {
    const fixture = await createFixture(monorepo);
    console.log(
      `[blocks smoke] Installing fixture dependencies: ${fixture.root}`,
    );
    await run(fixture.root, ["bun", "install"], env);
    const before = await snapshot(fixture.root);
    const dryRun = await run(
      fixture.app,
      ["bun", cli, "add", blocks[0][0], "--dry-run"],
      env,
    );
    assert.match(dryRun, /SmokePanel01\.astro/);
    assert.deepEqual(
      await snapshot(fixture.root),
      before,
      "dry-run changed project files",
    );
    for (const [index, [id, component]] of blocks.entries()) {
      // Exercise both accepted input forms: bare name and @bejamas namespace.
      // Direct registry URLs are left to shadcn, which confirms overwrites
      // per file and is not scripted here.
      const specifier = index === 1 ? `@bejamas/${id}` : id;
      console.log(`[blocks smoke] Adding ${specifier}`);
      const installOutput = await run(
        fixture.app,
        [
          "bun",
          cli,
          "add",
          specifier,
          "--yes",
          ...(index === 0 ? ["--silent"] : []),
        ],
        env,
      );
      if (index === 0)
        assert.equal(installOutput.trim(), "", "silent install emitted output");
      const installedPath = path.join(
        fixture.app,
        `src/components/blocks/${id}/${component}.astro`,
      );
      assert(
        await Bun.file(installedPath).exists(),
        `${id} missing at its declared target`,
      );
      const source = await fs.readFile(installedPath, "utf8");
      assert.doesNotMatch(source, /@bejamas\/registry|@\/registry\//);
      assert.match(
        source,
        monorepo ? /@repo\/ui\/components\// : /from "@\/ui\//,
      );
    }
    const uiComponents = await fs.readdir(
      path.join(fixture.ui, "src", monorepo ? "components" : "ui"),
    );
    for (const dependency of ["button", "card"])
      assert(
        uiComponents.includes(dependency),
        `${dependency} was not installed as a block dependency`,
      );
    const first = path.join(
      fixture.app,
      "src/components/blocks/smoke-panel-01/SmokePanel01.astro",
    );
    const installed = await fs.readFile(first, "utf8");
    await fs.writeFile(first, `${installed}\n<!-- user customization -->\n`);
    await run(fixture.app, ["bun", cli, "add", blocks[0][0]], env);
    assert.match(await fs.readFile(first, "utf8"), /user customization/);
    await run(
      fixture.app,
      ["bun", cli, "add", blocks[0][0], "--overwrite"],
      env,
    );
    assert.doesNotMatch(await fs.readFile(first, "utf8"), /user customization/);
    const imports = blocks
      .map(
        ([id, component]) =>
          `import { ${component} } from "../components/blocks/${id}";`,
      )
      .join("\n");
    const cssImport = monorepo
      ? "../../../../packages/ui/src/styles/globals.css"
      : "../styles/globals.css";
    await fs.writeFile(
      path.join(fixture.app, "src/pages/index.astro"),
      `---\n${imports}\nimport "${cssImport}";\n---\n<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Installed blocks</title></head><body>${blocks.map(([, name]) => `<${name} />`).join("\n")}</body></html>`,
    );
    console.log(`[blocks smoke] Building installed blocks in ${fixture.app}`);
    await run(fixture.app, ["bun", "run", "build"], env);
    const html = await fs.readFile(
      path.join(fixture.app, "dist/index.html"),
      "utf8",
    );
    for (const [id] of blocks)
      assert(html.includes(`data-smoke-block="${id}"`), `${id} did not render`);
  }
  console.log(
    "[blocks smoke] PASS: standalone + monorepo install, bare and namespaced inputs, dry-run, overwrite, and Astro builds.",
  );
} finally {
  server.stop(true);
}
