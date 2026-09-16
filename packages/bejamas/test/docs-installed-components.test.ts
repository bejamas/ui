import { afterEach, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildMdx } from "../src/docs/generate-mdx/mdx-builder";
import { parseExamplesSections } from "../src/docs/generate-mdx/examples";

const base: Parameters<typeof buildMdx>[0] = {
  importName: "Label",
  importPath: "@repo/ui/components/label",
  title: "Label",
  description: "",
  usageMDX: "",
  hasImport: false,
  propsList: "",
  examples: [],
  examplesSections: [],
  componentFolderMap: { Label: "label", Input: "input" },
  availableComponents: ["Label", "Input"],
  autoImports: ["Checkbox"],
  lucideIcons: [],
  primaryExampleMDX: "<Checkbox /><Label>Agree</Label>",
  componentSource: "",
  commandName: "label",
  componentsAlias: "@repo/ui/components",
};

function executable(mdx: string) {
  return mdx.replace(/^(`{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, "");
}

test("unavailable previews remain copyable source without unresolved executable imports or tags", () => {
  const mdx = buildMdx(base);
  expect(mdx).toContain("bejamas add checkbox");
  expect(mdx).toMatch(
    /import\s*\{\s*Checkbox\s*\}\s*from\s*["']@repo\/ui\/components\/checkbox["']/,
  );
  expect(executable(mdx)).not.toContain("<Checkbox");
  expect(executable(mdx)).not.toContain("@repo/ui/components/checkbox");
});

test("missing InputGroup never falls back to the installed Input barrel", () => {
  const mdx = buildMdx({
    ...base,
    autoImports: ["InputGroup", "InputGroupAddon"],
    primaryExampleMDX: "<InputGroup><InputGroupAddon /></InputGroup>",
  });
  expect(mdx).toContain("bejamas add input-group");
  expect(mdx).toMatch(
    /import\s*\{[^}]*\bInputGroup\b[^}]*\}\s*from\s*["']@repo\/ui\/components\/input-group["']/,
  );
  expect(executable(mdx)).not.toContain("InputGroup");
});

test("checks forced previews, raw description markup and individual example items", () => {
  const mdx = buildMdx({
    ...base,
    usageMDX: "```astro preview\n<Checkbox />\n```",
    descriptionBodyMDX: "Extra description\n\n<Checkbox />",
    examplesSections: parseExamplesSections(
      "### Missing\n<Checkbox />\n\n### Installed\n<Label>Works</Label>",
    ),
  });
  expect(executable(mdx)).not.toContain("<Checkbox");
  expect(executable(mdx)).toContain("<Label>");
  expect(mdx).toContain("### Missing");
  expect(mdx).toContain("Extra description");
});

test("supports installed flat and nested components in the same preview", () => {
  const mdx = buildMdx({
    ...base,
    autoImports: ["Button"],
    availableComponents: ["Label", "Button"],
    componentFolderMap: { Label: "label", Button: "Button.astro" },
    primaryExampleMDX: "<Label /><Button />",
  });
  expect(executable(mdx)).toMatch(
    /import\s+Button\s+from\s*["']@repo\/ui\/components\/Button\.astro["']/,
  );
  expect(executable(mdx)).toMatch(
    /import\s*\{\s*Label\s*\}\s*from\s*["']@repo\/ui\/components\/label["']/,
  );
  expect(executable(mdx)).toContain("<Button");
});

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

async function generate(cwd: string) {
  const cli = path.resolve(import.meta.dir, "../dist/index.js");
  const child = Bun.spawn(
    [process.execPath, cli, "docs:build", "--out", "docs"],
    {
      cwd,
      env: {
        ...process.env,
        BEJAMAS_DOCS_CWD: cwd,
        BEJAMAS_DOCS_OUT_DIR: "docs",
        BEJAMAS_SKIP_AUTO_RUN: "1",
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
  expect(code, `${stdout}\n${stderr}`).toBe(0);
}

test("docs:build handles the scaffolded subset, repeated runs and newly installed components", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "bejamas-docs-"));
  tempDirs.push(cwd);
  const template = path.resolve(
    import.meta.dir,
    "../../../templates/monorepo-astro-with-docs/packages/ui",
  );
  await fs.cp(path.join(template, "src"), path.join(cwd, "src"), {
    recursive: true,
  });
  await fs.copyFile(
    path.join(template, "components.json"),
    path.join(cwd, "components.json"),
  );
  await fs.writeFile(
    path.join(cwd, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { baseUrl: ".", paths: { "@repo/ui/*": ["./src/*"] } },
    }),
  );
  await fs.writeFile(
    path.join(cwd, "package.json"),
    '{"name":"@repo/ui","type":"module"}',
  );
  await generate(cwd);
  const labelPath = path.join(cwd, "docs/label.mdx");
  const first = await fs.readFile(labelPath, "utf8");
  expect(first).toContain("bejamas add checkbox");
  expect(executable(first)).not.toContain("<Checkbox");
  expect(first).not.toContain("@bejamas/ui/components");
  await generate(cwd);
  expect(await fs.readFile(labelPath, "utf8")).toBe(first);

  const registry = path.resolve(import.meta.dir, "../../registry/src/ui");
  for (const name of ["checkbox", "input", "input-group", "spinner"]) {
    await fs.cp(
      path.join(registry, name),
      path.join(cwd, "src/components", name),
      { recursive: true },
    );
  }
  // A stale cross-component re-export must never claim ownership of InputGroup.
  await fs.appendFile(
    path.join(cwd, "src/components/input/index.ts"),
    '\nexport { default as InputGroup } from "../input-group/InputGroup.astro";',
  );
  await generate(cwd);
  const label = await fs.readFile(labelPath, "utf8");
  expect(executable(label)).toMatch(
    /import\s*\{[^}]*\bCheckbox\b[^}]*\}\s*from\s*["']@repo\/ui\/components\/checkbox["']/,
  );
  expect(executable(label)).toContain("<Checkbox");
  expect(label).not.toContain("Preview unavailable");
  const spinner = await fs.readFile(path.join(cwd, "docs/spinner.mdx"), "utf8");
  expect(executable(spinner)).toMatch(
    /import\s*\{[^}]*\bInputGroup\b[^}]*\}\s*from\s*["']@repo\/ui\/components\/input-group["']/,
  );
  expect(executable(spinner)).not.toMatch(
    /import\s*\{[^}]*\bInputGroup\b[^}]*\}\s*from\s*["']@repo\/ui\/components\/input["']/,
  );
}, 15000);
