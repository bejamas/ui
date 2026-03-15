import { describe, expect, test } from "bun:test";
import { encodePreset } from "@bejamas/create-config/server";
import { GET } from "../../pages/init";

describe("/init", () => {
  test("returns absolute style-scoped registry dependency URLs", async () => {
    const preset = encodePreset({
      style: "vega",
      font: "playfair-display",
      template: "astro",
    });
    const response = await GET({
      url: new URL(`http://localhost:4322/init?preset=${preset}&template=astro`),
    });
    const item = (await response.json()) as { registryDependencies?: string[] };

    expect(item.registryDependencies).toEqual([
      "http://localhost:4322/r/styles/bejamas-vega/utils.json",
      "http://localhost:4322/r/styles/bejamas-vega/font-playfair-display.json",
    ]);
  });
});
