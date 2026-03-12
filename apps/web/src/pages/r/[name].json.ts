import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  buildFontRegistryItem,
  buildUtilsRegistryItem,
  catalogs,
} from "@bejamas/create-config/server";
import { jsonResponse, readStaticRegistryItem } from "@/utils/create-registry";

export const prerender = true;

const staticRegistryRoot = path.resolve(process.cwd(), "public/r");

export async function getStaticPaths() {
  const filenames = await readdir(staticRegistryRoot);
  const fileNames = filenames
    .filter((filename) => filename.endsWith(".json"))
    .map((filename) => filename.slice(0, -".json".length));
  const fontNames = catalogs.fonts.map((font) => font.name);

  return Array.from(new Set([...fileNames, ...fontNames, "utils"])).map(
    (name) => ({
      params: { name },
    }),
  );
}

export async function GET({ params }: { params: { name: string } }) {
  if (params.name === "utils") {
    return jsonResponse(buildUtilsRegistryItem());
  }

  const fontItem = buildFontRegistryItem(params.name);
  if (fontItem) {
    return jsonResponse(fontItem);
  }

  try {
    const item = await readStaticRegistryItem(params.name);
    return jsonResponse(item);
  } catch {
    return jsonResponse({ error: "Registry item not found." }, { status: 404 });
  }
}
