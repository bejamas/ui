import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { STYLES } from "../src/catalog/styles";

const repoRoot = path.resolve(import.meta.dir, "../../..");

type RegistryItem = {
  dependencies: string[];
  registryDependencies?: string[];
  files: { path: string; content: string }[];
};

function readItem(relativePath: string): RegistryItem {
  return JSON.parse(
    readFileSync(path.resolve(repoRoot, relativePath), "utf8"),
  ) as RegistryItem;
}

describe("toast distribution", () => {
  test("every style publishes the primitive-backed toast and its helper", () => {
    for (const style of STYLES) {
      const item = readItem(`apps/web/public/r/styles/${style.id}/toast.json`);
      const files = new Map(
        item.files.map((file) => [file.path, file.content]),
      );
      const toast = files.get("ui/toast/Toast.astro");

      expect(item.dependencies).toContain("@data-slot/toast");
      expect(item.registryDependencies).toContain("button");
      expect(toast).toContain('data-slot="toast-template"');
      expect(toast).toContain('data-slot="toast-viewport"');
      // The style token must be resolved into concrete utilities.
      expect(toast).not.toContain("cn-toast");
      expect(files.get("ui/toast/toast.ts")).toContain(
        'from "@data-slot/toast"',
      );
      expect(files.get("ui/toast/index.ts")).toContain("Toast");
    }
  });

  test("the default install registry includes the runtime dependency", () => {
    const item = readItem("apps/web/public/r/toast.json");

    expect(item.dependencies).toContain("@data-slot/toast");
    expect(item.files.map((file) => file.path)).toContain("ui/toast/toast.ts");
    expect(item.files.every((file) => file.path.startsWith("ui/toast/"))).toBe(
      true,
    );
  });
});
