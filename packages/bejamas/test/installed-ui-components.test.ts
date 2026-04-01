import { describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { detectInstalledUiComponents } from "../src/utils/installed-ui-components";

describe("detectInstalledUiComponents", () => {
  it("finds nested Astro component folders and top-level component files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "bejamas-ui-components-"));

    try {
      await mkdir(path.resolve(root, "tabs"), { recursive: true });
      await mkdir(path.resolve(root, "dropdown-menu"), { recursive: true });
      await mkdir(path.resolve(root, "internal"), { recursive: true });
      await writeFile(path.resolve(root, "tabs", "Tabs.astro"), "---\n---\n");
      await writeFile(path.resolve(root, "tabs", "index.ts"), "export {};\n");
      await writeFile(
        path.resolve(root, "dropdown-menu", "DropdownMenu.astro"),
        "---\n---\n",
      );
      await writeFile(path.resolve(root, "Button.astro"), "---\n---\n");
      await writeFile(path.resolve(root, "internal", "README.md"), "# note\n");

      const components = await detectInstalledUiComponents(root);

      expect(components).toEqual(["button", "dropdown-menu", "tabs"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
