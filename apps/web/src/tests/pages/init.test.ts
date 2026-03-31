import { describe, expect, test } from "bun:test";
import { encodePreset } from "@bejamas/create-config/server";
import { GET } from "../../pages/init";

describe("/init", () => {
  test("returns absolute style-scoped registry dependency URLs", async () => {
    const preset = encodePreset({
      style: "vega",
      font: "playfair-display",
    });
    const response = await GET({
      url: new URL(`http://localhost:4322/init?preset=${preset}&template=astro`),
    });
    const item = (await response.json()) as { registryDependencies?: string[] };

    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
    );
    expect(item.registryDependencies).toEqual([
      "http://localhost:4322/r/styles/bejamas-vega/utils.json",
      "http://localhost:4322/r/styles/bejamas-vega/font-playfair-display.json",
    ]);
  });

  test("includes distinct heading font registry dependencies when present", async () => {
    const preset = encodePreset({
      style: "juno",
      font: "inter",
      fontHeading: "playfair-display",
    });
    const response = await GET({
      url: new URL(`http://localhost:4322/init?preset=${preset}&template=astro`),
    });
    const item = (await response.json()) as { registryDependencies?: string[] };

    expect(item.registryDependencies).toEqual([
      "http://localhost:4322/r/styles/bejamas-juno/utils.json",
      "http://localhost:4322/r/styles/bejamas-juno/font-inter.json",
      "http://localhost:4322/r/styles/bejamas-juno/font-heading-playfair-display.json",
    ]);
  });

  test("accepts modern shadcn b-codes and keeps both font dependencies", async () => {
    const response = await GET({
      url: new URL("http://localhost:4322/init?preset=b4aRK5K0fb&template=astro"),
    });
    const item = (await response.json()) as { registryDependencies?: string[] };

    expect(item.registryDependencies).toEqual([
      "http://localhost:4322/r/styles/bejamas-maia/utils.json",
      "http://localhost:4322/r/styles/bejamas-maia/font-ibm-plex-sans.json",
      "http://localhost:4322/r/styles/bejamas-maia/font-heading-merriweather.json",
    ]);
  });

  test("resolves luma to the shared style registry namespace", async () => {
    const preset = encodePreset({
      style: "luma",
      font: "inter",
      theme: "neutral",
    });
    const response = await GET({
      url: new URL(`http://localhost:4322/init?preset=${preset}&template=astro`),
    });
    const item = (await response.json()) as { registryDependencies?: string[] };

    expect(item.registryDependencies).toEqual([
      "http://localhost:4322/r/styles/bejamas-luma/utils.json",
      "http://localhost:4322/r/styles/bejamas-luma/font-inter.json",
    ]);
  });

  test("marks custom theme init payloads as non-cacheable", async () => {
    const preset = encodePreset({
      style: "vega",
    });
    const response = await GET({
      url: new URL(
        `http://localhost:4322/init?preset=${preset}&themeRef=custom-123&template=astro`,
      ),
    });

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
