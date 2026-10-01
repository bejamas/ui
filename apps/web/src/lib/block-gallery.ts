import blockCatalogJson from "@/content/docs/blocks.json";

export type BlockGalleryItem =
  (typeof blockCatalogJson)[keyof typeof blockCatalogJson]["items"][number];

export interface BlockSourceFile {
  path: string;
  displayName: string;
  code: string;
}

interface PublishedRegistryFile {
  path: string;
  content: string;
  target?: string;
}

interface PublishedRegistryItem {
  name: string;
  type: string;
  files: PublishedRegistryFile[];
}

// Published payloads use the registry alias that the CLI rewrites during
// installation; show the shape a default Astro project ends up with.
function normalizePublishedSourceForDisplay(source: string): string {
  return source.replaceAll("@/registry/bejamas/ui/", "@/ui/");
}

export const blockCatalog = blockCatalogJson;

export const blockGalleryItems: BlockGalleryItem[] = Object.values(
  blockCatalog,
).flatMap((category) => category.items);

// Only verified Shadcnblocks adaptations belong in this collection. Keep the
// complete catalog for registry consumers and a future b/ui collection.
export const shadcnblocksItems = blockGalleryItems.filter(
  (item) => "sourceUrl" in item,
);

export type ShadcnblocksItem = (typeof shadcnblocksItems)[number];

export const shadcnblocksCategories = Array.from(
  new Set(shadcnblocksItems.map((item) => item.sourceCategory)),
).map((label) => ({
  label,
  slug: label.toLowerCase(),
  items: shadcnblocksItems.filter((item) => item.sourceCategory === label),
}));

export function getBlockGalleryItem(id: string): BlockGalleryItem | undefined {
  return blockGalleryItems.find((item) => item.id === id);
}

export function getBlockInstallCommand(id: string): string {
  const item = getBlockGalleryItem(id);
  const source = item && "sourceUrl" in item ? item.sourceUrl : undefined;
  const namespace = source?.startsWith("https://www.shadcnblocks.com/block/")
    ? "@shadcnblocks/"
    : "";
  return `bunx bejamas@latest add ${namespace}${id}`;
}

/** Lazy `import.meta.glob` loaders for the published registry payloads. */
export type RegistryPayloadLoaders = Record<string, () => Promise<unknown>>;

/**
 * Load the published source for one block. The payload is found by its file
 * name and must be a `registry:block` item, so block names are not restricted
 * to any naming pattern. Throws when a catalog block has no published source,
 * which would otherwise render an empty Source tab.
 */
export async function loadPublishedBlockSourceFiles(
  loaders: RegistryPayloadLoaders,
  id: string,
): Promise<BlockSourceFile[]> {
  const artifactPath = Object.keys(loaders).find((path) =>
    path.endsWith(`/public/r/${id}.json`),
  );
  const item = artifactPath ? await loaders[artifactPath]() : undefined;
  const files = selectPublishedBlockSourceFiles(item, id);
  if (!files.length) {
    throw new Error(
      `No published registry source for block "${id}" in public/r/${id}.json. Run \`bun run build:artifacts\`.`,
    );
  }
  return files;
}

export function selectPublishedBlockSourceFiles(
  payload: unknown,
  id: string,
): BlockSourceFile[] {
  const item = payload as Partial<PublishedRegistryItem> | undefined;
  if (
    !item ||
    item.name !== id ||
    item.type !== "registry:block" ||
    !Array.isArray(item.files)
  ) {
    return [];
  }

  return item.files
    .map((file) => ({
      path: file.path,
      displayName: file.target ?? file.path,
      code: normalizePublishedSourceForDisplay(file.content),
    }))
    .sort((a, b) => {
      const aIsEntry = a.displayName.endsWith("/index.ts");
      const bIsEntry = b.displayName.endsWith("/index.ts");
      if (aIsEntry !== bIsEntry) return aIsEntry ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });
}
