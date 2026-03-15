import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  reorganizeRegistryUiFiles,
  shouldReorganizeRegistryUiFiles,
  type RegistryFile,
} from "../src/utils/reorganize-components";

const createdDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdDirs
      .splice(0)
      .map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

async function createTempUiDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bejamas-reorg-"));
  createdDirs.push(dir);
  return dir;
}

function createTabsFiles(): RegistryFile[] {
  return [
    {
      path: "ui/tabs/Tabs.astro",
      type: "registry:ui",
      content: "---\n---\n",
    },
    {
      path: "ui/tabs/TabsList.astro",
      type: "registry:ui",
      content: "---\n---\n",
    },
    {
      path: "ui/tabs/index.ts",
      type: "registry:ui",
      content: 'export { default as Tabs } from "./Tabs.astro";\n',
    },
  ];
}

describe("reorganize-components", () => {
  it("only requires reorganization for workspace ui targets that would flatten paths", () => {
    const files = createTabsFiles();

    expect(shouldReorganizeRegistryUiFiles(files, "/repo/app/src/ui")).toBe(
      false,
    );
    expect(
      shouldReorganizeRegistryUiFiles(
        files,
        "/repo/packages/ui/src/components",
      ),
    ).toBe(true);
    expect(
      shouldReorganizeRegistryUiFiles(
        files,
        "/repo/packages/ui/src/components/ui",
      ),
    ).toBe(false);
    expect(
      shouldReorganizeRegistryUiFiles(
        [
          {
            path: "ui/button/Button.astro",
            type: "registry:ui",
            content: "---\n---\n",
          },
        ],
        "/repo/packages/ui/src/components",
      ),
    ).toBe(false);
    expect(
      shouldReorganizeRegistryUiFiles(
        undefined,
        "/repo/packages/ui/src/components",
      ),
    ).toBe(false);
  });

  it("moves flat ui files into their component subfolder", async () => {
    const uiDir = await createTempUiDir();
    const files = createTabsFiles();

    await fs.writeFile(path.join(uiDir, "Tabs.astro"), "tabs");
    await fs.writeFile(path.join(uiDir, "TabsList.astro"), "tabs-list");
    await fs.writeFile(path.join(uiDir, "index.ts"), "index");

    const result = await reorganizeRegistryUiFiles(files, uiDir, false);

    expect(result.totalMoved).toBe(3);
    expect(result.movedFiles).toEqual([
      "tabs/Tabs.astro",
      "tabs/TabsList.astro",
      "tabs/index.ts",
    ]);
    expect(await Bun.file(path.join(uiDir, "Tabs.astro")).exists()).toBe(false);
    expect(
      await Bun.file(path.join(uiDir, "tabs", "Tabs.astro")).exists(),
    ).toBe(true);
    expect(
      await Bun.file(path.join(uiDir, "tabs", "TabsList.astro")).exists(),
    ).toBe(true);
    expect(await Bun.file(path.join(uiDir, "tabs", "index.ts")).exists()).toBe(
      true,
    );
  });

  it("removes flat duplicates when the nested target already exists", async () => {
    const uiDir = await createTempUiDir();
    const files = createTabsFiles();

    await fs.mkdir(path.join(uiDir, "tabs"), { recursive: true });
    await fs.writeFile(path.join(uiDir, "Tabs.astro"), "flat");
    await fs.writeFile(path.join(uiDir, "tabs", "Tabs.astro"), "nested");

    const result = await reorganizeRegistryUiFiles(files, uiDir, false);

    expect(result.totalMoved).toBe(0);
    expect(result.skippedFiles).toContain("tabs/Tabs.astro");
    expect(await Bun.file(path.join(uiDir, "Tabs.astro")).exists()).toBe(false);
    expect(
      await Bun.file(path.join(uiDir, "tabs", "Tabs.astro")).exists(),
    ).toBe(true);
  });

  it("overwrites nested targets during preset reinstall reorganization", async () => {
    const uiDir = await createTempUiDir();
    const files = createTabsFiles();

    await fs.mkdir(path.join(uiDir, "tabs"), { recursive: true });
    await fs.writeFile(path.join(uiDir, "Tabs.astro"), "reinstalled");
    await fs.writeFile(path.join(uiDir, "tabs", "Tabs.astro"), "old");

    const result = await reorganizeRegistryUiFiles(files, uiDir, false, true);

    expect(result.totalMoved).toBe(1);
    expect(result.movedFiles).toContain("tabs/Tabs.astro");
    expect(await Bun.file(path.join(uiDir, "Tabs.astro")).exists()).toBe(false);
    expect(
      await fs.readFile(path.join(uiDir, "tabs", "Tabs.astro"), "utf8"),
    ).toBe("reinstalled");
  });
});
