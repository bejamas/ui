import { describe, expect, test } from "bun:test";
import path from "node:path";
import {
  GET as getStyleIndex,
  getStaticPaths as getStyleIndexPaths,
} from "../../pages/r/styles/[style]/index.json";
import {
  GET as getStyleItem,
  getStaticPaths as getStyleItemPaths,
} from "../../pages/r/styles/[style]/[name].json";
import { STATIC_ASSET_CACHE_CONTROL } from "../../utils/http-cache";

const appRoot = path.resolve(import.meta.dir, "../../..");

describe("legacy registry style compatibility", () => {
  test("prerenders new-york-v4 style item paths", async () => {
    const previousCwd = process.cwd();
    process.chdir(appRoot);

    try {
      const paths = await getStyleItemPaths();

      expect(paths).toContainEqual({
        params: { style: "new-york-v4", name: "button" },
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("serves Juno registry items for new-york-v4 requests", async () => {
    const aliasResponse = await getStyleItem({
      params: { style: "new-york-v4", name: "button" },
    });
    const junoResponse = await getStyleItem({
      params: { style: "bejamas-juno", name: "button" },
    });

    expect(aliasResponse.status).toBe(200);
    expect(aliasResponse.headers.get("Cache-Control")).toBe(
      STATIC_ASSET_CACHE_CONTROL,
    );

    const aliasItem = (await aliasResponse.json()) as {
      name: string;
    };
    const junoItem = (await junoResponse.json()) as {
      name: string;
    };

    expect(aliasItem.name).toBe("button");
    expect(aliasItem).toEqual(junoItem);
  });

  test("prerenders new-york-v4 style index paths", () => {
    expect(getStyleIndexPaths()).toContainEqual({
      params: { style: "new-york-v4" },
    });
  });

  test("serves the Juno style index for new-york-v4 requests", async () => {
    const response = await getStyleIndex({
      params: { style: "new-york-v4" },
    });

    expect(response.status).toBe(200);

    const item = (await response.json()) as {
      type: string;
      meta?: { styleId?: string };
    };

    expect(item.type).toBe("registry:style");
    expect(item.meta?.styleId).toBe("bejamas-juno");
  });
});
