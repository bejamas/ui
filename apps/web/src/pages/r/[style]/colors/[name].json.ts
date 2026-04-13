import fs from "node:fs/promises";
import path from "node:path";
import { BASE_COLORS, STYLES } from "@bejamas/create-config/server";
import { jsonResponse } from "@/utils/create-registry";
import { STATIC_ASSET_CACHE_CONTROL } from "@/utils/http-cache";

export const prerender = true;

const colorsDir = path.resolve(process.cwd(), "public/r/colors");

export function getStaticPaths() {
  return STYLES.flatMap((style) =>
    BASE_COLORS.map((color) => ({
      params: {
        style: style.id,
        name: color.name,
      },
    })),
  );
}

export async function GET({
  params,
}: {
  params: { style: string; name: string };
}) {
  const style = STYLES.find((entry) => entry.id === params.style);
  if (!style) {
    return jsonResponse(
      { error: "Style not found." },
      {
        status: 404,
        headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
      },
    );
  }

  const filepath = path.resolve(colorsDir, `${params.name}.json`);

  try {
    const payload = JSON.parse(await fs.readFile(filepath, "utf8"));
    return jsonResponse(payload, {
      headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
    });
  } catch {
    return jsonResponse(
      { error: "Base color not found." },
      {
        status: 404,
        headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
      },
    );
  }
}
