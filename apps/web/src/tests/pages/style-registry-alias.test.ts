import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { GET as getStyleIndex } from "../../pages/r/styles/[style]/index.json.ts";
import { GET as getStyleItem } from "../../pages/r/styles/[style]/[name].json.ts";
import { rewriteLegacyStyleRegistryUrl } from "../../utils/style-registry-aliases";

const middlewareFile = path.resolve(import.meta.dir, "../../middleware.ts");
const appRoot = path.resolve(import.meta.dir, "../../..");
const styleIndexRouteUrl = new URL(
  "../../pages/r/styles/[style]/index.json.ts",
  import.meta.url,
).href;
const styleItemRouteUrl = new URL(
  "../../pages/r/styles/[style]/[name].json.ts",
  import.meta.url,
).href;

describe("style registry aliases", () => {
  test("rewrites legacy style registry JSON URLs to bejamas-juno", () => {
    const rewrittenUrl = rewriteLegacyStyleRegistryUrl(
      new URL("http://localhost:4322/r/styles/new-york-v4/utils.json?foo=1"),
    );

    expect(rewrittenUrl?.pathname).toBe("/r/styles/bejamas-juno/utils.json");
    expect(rewrittenUrl?.search).toBe("?foo=1");
    expect(
      rewriteLegacyStyleRegistryUrl(
        new URL("http://localhost:4322/r/styles/bejamas-juno/utils.json"),
      ),
    ).toBeNull();
  });

  test("middleware applies the shared legacy style registry rewrite", () => {
    const source = fs.readFileSync(middlewareFile, "utf8");

    expect(source).toContain("rewriteLegacyStyleRegistryUrl(context.url)");
    expect(source).toContain("return next(rewrittenUrl);");
  });

  test("prerenders style registry paths for the legacy alias", async () => {
    const previousCwd = process.cwd();

    try {
      process.chdir(appRoot);

      const { getStaticPaths: getStyleIndexPaths } = await import(
        `${styleIndexRouteUrl}?style-registry-alias-index`
      );
      const { getStaticPaths: getStyleItemPaths } = await import(
        `${styleItemRouteUrl}?style-registry-alias-item`
      );
      const indexPaths = getStyleIndexPaths();
      const itemPaths = await getStyleItemPaths();

      expect(
        indexPaths.some((path) => path.params.style === "new-york-v4"),
      ).toBe(true);
      expect(
        itemPaths.some(
          (path) =>
            path.params.style === "new-york-v4" && path.params.name === "utils",
        ),
      ).toBe(true);
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("serves legacy alias requests from the bejamas-juno registry files", async () => {
    const indexResponse = await getStyleIndex({
      params: { style: "new-york-v4" },
    });
    const styleIndex = (await indexResponse.json()) as {
      meta?: { styleId?: string };
    };

    expect(indexResponse.status).toBe(200);
    expect(styleIndex.meta?.styleId).toBe("bejamas-juno");

    const itemResponse = await getStyleItem({
      params: { style: "new-york-v4", name: "utils" },
    });
    const styleItem = (await itemResponse.json()) as { name?: string };

    expect(itemResponse.status).toBe(200);
    expect(styleItem.name).toBe("utils");
  });
});
