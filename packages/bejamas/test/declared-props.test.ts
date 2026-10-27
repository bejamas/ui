import { describe, expect, test } from "bun:test";
import {
  createSourceFileFromFrontmatter,
  extractPropsFromDeclaredProps,
} from "@/src/docs/generate-mdx/utils";

const extract = (code: string) =>
  extractPropsFromDeclaredProps(createSourceFileFromFrontmatter(code));

describe("extractPropsFromDeclaredProps", () => {
  test("reads a type literal Props", () => {
    expect(
      extract(`type Props = { class?: string; size: "sm" | "lg" };`),
    ).toEqual([
      { name: "class", type: "string", optional: true },
      { name: "size", type: '"sm" | "lg"', optional: false },
    ]);
  });

  test("reads intersections of local types and skips external attributes", () => {
    expect(
      extract(`
        import type { HTMLAttributes } from "astro/types";
        type OwnProps = { variant?: "default" | "outline" };
        export type Props = OwnProps & HTMLAttributes<"div"> & { class?: string };
      `),
    ).toEqual([
      { name: "variant", type: '"default" | "outline"', optional: true },
      { name: "class", type: "string", optional: true },
    ]);
  });

  test("merges union members, keeping props optional unless every member requires them", () => {
    expect(
      extract(`
        import type { HTMLAttributes, HTMLTag } from "astro/types";
        type BadgeOwnProps = { variant?: "default" | "secondary"; class?: string };
        type BadgeAsElement = { as?: Exclude<HTMLTag, "a"> } & HTMLAttributes<"span">;
        type BadgeAsAnchor = { as: "a"; href: string } & HTMLAttributes<"a">;
        export type Props = (BadgeAsElement | BadgeAsAnchor) & BadgeOwnProps;
      `),
    ).toEqual([
      { name: "as", type: 'Exclude<HTMLTag, "a"> | "a"', optional: true },
      { name: "href", type: "string", optional: true },
      { name: "variant", type: '"default" | "secondary"', optional: true },
      { name: "class", type: "string", optional: true },
    ]);
  });

  test("resolves local interfaces referenced from a type alias", () => {
    expect(
      extract(`
        interface BaseProps { id: string }
        type Props = BaseProps & { class?: string };
      `),
    ).toEqual([
      { name: "id", type: "string", optional: false },
      { name: "class", type: "string", optional: true },
    ]);
  });
});
