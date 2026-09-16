import { afterEach, expect, test, spyOn } from "bun:test";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  fetchRegistryTree,
  reorganizeComponents,
  repairUiPackageExports,
  type RegistryItem,
} from "../src/utils/reorganize-components";
import { missingRegistryDependencies } from "../src/utils/registry-dependencies";

const registryDir = path.resolve(
  import.meta.dir,
  "../../../apps/web/public/r/styles/bejamas-juno",
);
const tempDirs: string[] = [];
let fetchMock: ReturnType<typeof spyOn> | undefined;
afterEach(async () => {
  fetchMock?.mockRestore();
  await Promise.all(
    tempDirs
      .splice(0)
      .map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

async function fixture() {
  const uiDir = await fs.mkdtemp(path.join(os.tmpdir(), "bejamas-install-"));
  tempDirs.push(uiDir);
  fetchMock = spyOn(globalThis, "fetch").mockImplementation(
    async (url: string | URL | Request) => {
      const name = path.basename(String(url));
      const text = await fs.readFile(path.join(registryDir, name), "utf8");
      return new Response(text);
    },
  );
  return uiDir;
}

// Reproduce upstream shadcn's flat workspace writes, including shared index.ts.
async function flatten(
  items: RegistryItem[],
  uiDir: string,
  overwrite = false,
) {
  for (const item of items) {
    for (const file of item.files ?? []) {
      if (file.type !== "registry:ui") continue;
      const target = path.join(uiDir, path.basename(file.path));
      if (!overwrite && (await Bun.file(target).exists())) continue;
      await fs.writeFile(target, file.content);
    }
  }
}

test("sequential add-all preserves scaffolded files and produces valid local barrels", async () => {
  const uiDir = await fixture();
  const templateUi = path.resolve(
    import.meta.dir,
    "../../../templates/monorepo-astro-with-docs/packages/ui/src/components",
  );
  await fs.cp(templateUi, uiDir, { recursive: true });
  const originalButton = await fs.readFile(
    path.join(uiDir, "button/Button.astro"),
    "utf8",
  );
  const names = (await fs.readdir(registryDir))
    .filter((n) => n.endsWith(".json"))
    .sort();
  for (const filename of names) {
    const item: RegistryItem = JSON.parse(
      await fs.readFile(path.join(registryDir, filename), "utf8"),
    );
    if (item.type !== "registry:ui") continue;
    const tree = await fetchRegistryTree(
      [item.name],
      "https://fixture.invalid/r",
    );
    await flatten(tree, uiDir);
    await reorganizeComponents(
      [item.name],
      uiDir,
      "https://fixture.invalid/r",
      false,
    );
  }
  expect(
    await fs.readFile(path.join(uiDir, "button/Button.astro"), "utf8"),
  ).toBe(originalButton);
  expect((await fs.readdir(uiDir)).filter((n) => n.endsWith(".astro"))).toEqual(
    [],
  );
  for (const entry of await fs.readdir(uiDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const parts = (await fs.readdir(path.join(uiDir, entry.name))).filter((n) =>
      n.endsWith(".astro"),
    );
    if (!parts.length) continue;
    const barrel = await fs.readFile(
      path.join(uiDir, entry.name, "index.ts"),
      "utf8",
    );
    for (const part of parts)
      expect(barrel).toContain(`default as ${path.basename(part, ".astro")}`);
    for (const match of barrel.matchAll(/from ["']\.\/([^"']+\.astro)["']/g)) {
      expect(parts).toContain(match[1]);
    }
  }
});

test("dependency barrels cannot overwrite the requested component barrel and overwrite updates nested files", async () => {
  const uiDir = await fixture();
  const tree = await fetchRegistryTree(
    ["input-group"],
    "https://fixture.invalid/r",
  );
  await flatten(tree, uiDir);
  await reorganizeComponents(
    ["input-group"],
    uiDir,
    "https://fixture.invalid/r",
    false,
  );
  const barrel = await fs.readFile(
    path.join(uiDir, "input-group/index.ts"),
    "utf8",
  );
  expect(barrel).toContain("default as InputGroupTextarea");
  expect(barrel).not.toContain('from "./Textarea.astro"');
  await fs.writeFile(path.join(uiDir, "input/Input.astro"), "custom input");
  await flatten(tree, uiDir, true);
  await reorganizeComponents(
    ["input-group"],
    uiDir,
    "https://fixture.invalid/r",
    false,
    "bejamas-juno",
    true,
  );
  expect(
    await fs.readFile(path.join(uiDir, "input/Input.astro"), "utf8"),
  ).not.toBe("custom input");
});

test("finds undeclared headless dependencies even with incomplete registry metadata", () => {
  const items: RegistryItem[] = [
    {
      name: "switch",
      type: "registry:ui",
      dependencies: ["clsx@^2.1.1"],
      files: [
        {
          path: "ui/switch/Switch.astro",
          type: "registry:ui",
          content: `/** import { createDialog } from "@data-slot/dialog" */
<script>import { createSwitch } from "@data-slot/switch";</script>`,
        },
      ],
    },
  ];
  expect(
    missingRegistryDependencies({ dependencies: { clsx: "^2.1.0" } }, items),
  ).toEqual(["@data-slot/switch"]);
});

test("keeps explicit headless dependency versions without adding an unversioned duplicate", () => {
  expect(
    missingRegistryDependencies({}, [
      {
        name: "switch",
        type: "registry:ui",
        dependencies: ["@data-slot/switch@^0.2.166"],
        files: [
          {
            path: "Switch.astro",
            type: "registry:ui",
            content: 'import { createSwitch } from "@data-slot/switch";',
          },
        ],
      },
    ]),
  ).toEqual(["@data-slot/switch@^0.2.166"]);
});

test("repairs an existing scaffold's export pattern so package resolution reaches named barrels", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bejamas-exports-"));
  tempDirs.push(root);
  const uiDir = path.join(root, "src/components");
  await fs.mkdir(path.join(uiDir, "button"), { recursive: true });
  await fs.writeFile(path.join(uiDir, "button/Button.astro"), "<button />");
  await fs.writeFile(
    path.join(uiDir, "button/index.ts"),
    'export { default as Button } from "./Button.astro";',
  );
  const manifestPath = path.join(root, "package.json");
  await fs.writeFile(
    manifestPath,
    JSON.stringify({
      name: "@repo/ui",
      exports: {
        "./components/*": "./src/components/*.astro",
        "./lib/*": "./src/lib/*.ts",
      },
    }),
  );
  await repairUiPackageExports(uiDir, root);
  expect(
    createRequire(manifestPath).resolve("@repo/ui/components/button"),
  ).toBe(await fs.realpath(path.join(uiDir, "button/index.ts")));
  expect(
    JSON.parse(await fs.readFile(manifestPath, "utf8")).exports["./lib/*"],
  ).toBe("./src/lib/*.ts");
});
