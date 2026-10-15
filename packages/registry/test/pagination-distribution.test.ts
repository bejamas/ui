import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { STYLES } from "../src/catalog/styles";

const repoRoot = path.resolve(import.meta.dir, "../../..");

const PARTS = [
  "Pagination",
  "PaginationContent",
  "PaginationItem",
  "PaginationLink",
  "PaginationPrevious",
  "PaginationNext",
  "PaginationFirst",
  "PaginationLast",
  "PaginationEllipsis",
];

type RegistryItem = {
  registryDependencies?: string[];
  files: { path: string; content: string }[];
};

function readItem(relativePath: string): RegistryItem {
  return JSON.parse(
    readFileSync(path.resolve(repoRoot, relativePath), "utf8"),
  ) as RegistryItem;
}

describe("pagination distribution", () => {
  test("every style publishes all parts with resolved style tokens", () => {
    for (const style of STYLES) {
      const item = readItem(
        `apps/web/public/r/styles/${style.id}/pagination.json`,
      );
      const files = new Map(
        item.files.map((file) => [file.path, file.content]),
      );

      expect(item.registryDependencies?.some((dep) => dep.endsWith("button")))
        .toBe(true);

      for (const part of PARTS) {
        const content = files.get(`ui/pagination/${part}.astro`);
        expect(content).toBeDefined();
        // Style tokens must be resolved into concrete utilities.
        expect(content).not.toContain("cn-pagination");
        expect(files.get("ui/pagination/index.ts")).toContain(part);
      }

      expect(files.get("ui/pagination/Pagination.astro")).toContain(
        'aria-label="pagination"',
      );
      expect(files.get("ui/pagination/PaginationLink.astro")).toContain(
        'aria-current={isActive ? "page" : undefined}',
      );
      expect(files.get("ui/pagination/PaginationEllipsis.astro")).toContain(
        "More pages",
      );
    }
  });

  test("the default install registry ships only pagination files", () => {
    const item = readItem("apps/web/public/r/pagination.json");

    expect(
      item.files.every((file) => file.path.startsWith("ui/pagination/")),
    ).toBe(true);
    expect(item.files).toHaveLength(PARTS.length + 1);
  });
});
