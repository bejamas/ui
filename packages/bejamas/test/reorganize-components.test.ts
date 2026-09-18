import { afterEach, describe, expect, it, spyOn } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  fetchRegistryItem,
  fetchRegistryTree,
  isRegistryItemUrl,
  reorganizeRegistryItems,
  reorganizeRegistryUiFiles,
  resolveBejamasRegistryItemName,
  shouldReorganizeRegistryUiFiles,
  type RegistryFile,
} from "../src/utils/reorganize-components";

const createdDirs: string[] = [];
let fetchMock: ReturnType<typeof spyOn> | undefined;

afterEach(async () => {
  fetchMock?.mockRestore();
  fetchMock = undefined;
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

describe("registry item resolution", () => {
  it("recognizes Bejamas item names, the @bejamas namespace, and URLs", () => {
    expect(resolveBejamasRegistryItemName("features-01")).toBe("features-01");
    expect(resolveBejamasRegistryItemName("@bejamas/features-01")).toBe(
      "features-01",
    );
    expect(resolveBejamasRegistryItemName("@acme/hero")).toBeNull();
    expect(resolveBejamasRegistryItemName("Features01")).toBeNull();
    expect(
      isRegistryItemUrl("https://ui.example.test/r/features-01.json"),
    ).toBe(true);
    expect(isRegistryItemUrl("features-01")).toBe(false);
  });

  it("fetches direct item URLs without mapping them onto the Bejamas registry", async () => {
    fetchMock = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ name: "remote", type: "registry:block" })),
    );

    expect(
      await fetchRegistryItem(
        "https://registry.example.test/remote.json",
        "https://ui.example.test/r",
      ),
    ).toMatchObject({ name: "remote", type: "registry:block" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://registry.example.test/remote.json",
    );
  });

  it("leaves third-party namespaces to shadcn", async () => {
    fetchMock = spyOn(globalThis, "fetch");

    expect(
      await fetchRegistryItem("@acme/remote", "https://ui.example.test/r"),
    ).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves the built-in namespace against the styled registry first", async () => {
    fetchMock = spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ name: "features-01", type: "registry:block" }),
        ),
      );

    expect(
      await fetchRegistryItem(
        "@bejamas/features-01",
        "https://ui.example.test/r",
        "bejamas-vega",
      ),
    ).toMatchObject({ name: "features-01", type: "registry:block" });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://ui.example.test/r/styles/bejamas-vega/features-01.json",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://ui.example.test/r/features-01.json",
    );
  });

  it("follows a block's UI dependencies when validating the install tree", async () => {
    fetchMock = spyOn(globalThis, "fetch").mockImplementation(
      async (input: string | URL | Request) => {
        const url = String(input);
        if (url.endsWith("/styles/bejamas-juno/features-01.json")) {
          return new Response(
            JSON.stringify({
              name: "features-01",
              type: "registry:block",
              registryDependencies: ["button", "@acme/remote"],
            }),
          );
        }
        if (url.endsWith("/styles/bejamas-juno/button.json")) {
          return new Response(
            JSON.stringify({ name: "button", type: "registry:ui" }),
          );
        }
        return new Response(null, { status: 404 });
      },
    );

    expect(
      await fetchRegistryTree(
        ["@bejamas/features-01"],
        "https://ui.example.test/r",
      ),
    ).toEqual([
      { name: "button", type: "registry:ui" },
      {
        name: "features-01",
        type: "registry:block",
        registryDependencies: ["button", "@acme/remote"],
      },
    ]);
  });
});

describe("reorganize-components", () => {
  it("preserves root files when the installer already keeps nested UI paths", async () => {
    const root = await createTempUiDir();
    const uiDir = path.join(root, "ui");
    const files = createTabsFiles();
    await fs.mkdir(uiDir);
    await fs.writeFile(path.join(uiDir, "index.ts"), files[2].content);

    const result = await reorganizeRegistryItems(
      [{ name: "tabs", type: "registry:ui", files }],
      uiDir,
      false,
    );

    expect(result.movedFiles).toEqual([]);
    expect(await fs.readFile(path.join(uiDir, "index.ts"), "utf8")).toBe(
      files[2].content,
    );
  });

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
    ).toBe(true);
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

    expect(result.totalMoved).toBe(2);
    expect(result.movedFiles).toEqual([
      "tabs/Tabs.astro",
      "tabs/TabsList.astro",
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
