import { readdir } from "node:fs/promises";
import path from "node:path";
import { STYLES } from "@bejamas/create-config/browser";
import {
  jsonResponse,
  readStaticStyleRegistryItem,
} from "@/utils/create-registry";

const staticStylesRoot = path.resolve(process.cwd(), "public/r/styles");

export async function getStaticPaths() {
  const paths = await Promise.all(
    STYLES.map(async (style) => {
      const filenames = await readdir(path.join(staticStylesRoot, style.id));

      return filenames
        .filter(
          (filename) => filename.endsWith(".json") && filename !== "index.json",
        )
        .map((filename) => ({
          params: {
            style: style.id,
            name: filename.slice(0, -".json".length),
          },
        }));
    }),
  );

  return paths.flat();
}

export async function GET({
  params,
}: {
  params: { style: string; name: string };
}) {
  const style = STYLES.find((entry) => entry.id === params.style);
  if (!style) {
    return jsonResponse({ error: "Style not found." }, { status: 404 });
  }

  if (params.name === "index") {
    return jsonResponse({ error: "Unsupported route." }, { status: 404 });
  }

  try {
    const item = await readStaticStyleRegistryItem(style.id, params.name);
    return jsonResponse(item);
  } catch {
    return jsonResponse({ error: "Registry item not found." }, { status: 404 });
  }
}
