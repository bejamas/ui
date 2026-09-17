import blockCatalogJson from "@/content/docs/blocks.json";

export interface BlockGalleryItem {
  label: string;
  id: string;
  description?: string;
  href: string;
}

interface BlockGalleryCategory {
  label: string;
  description?: string;
  items?: BlockGalleryItem[];
}

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
  files: PublishedRegistryFile[];
}

// Published payloads use the registry alias that the CLI rewrites during
// installation; show the shape a default Astro project ends up with.
function normalizePublishedSourceForDisplay(source: string): string {
  return source.replaceAll("@/registry/bejamas/ui/", "@/ui/");
}

export const blockCatalog = blockCatalogJson as Record<
  string,
  BlockGalleryCategory
>;

export const blockGalleryItems = Object.values(blockCatalog).flatMap(
  (category) => category.items ?? [],
);

export function getBlockGalleryItem(id: string): BlockGalleryItem | undefined {
  return blockGalleryItems.find((item) => item.id === id);
}

export function getBlockInstallCommand(id: string): string {
  return `bunx bejamas@latest add ${id}`;
}

export function selectPublishedBlockSourceFiles(
  registryItems: Record<string, unknown>,
  id: string,
): BlockSourceFile[] {
  const artifactPath = Object.keys(registryItems).find((path) =>
    path.endsWith(`/public/r/${id}.json`),
  );
  const item = artifactPath
    ? (registryItems[artifactPath] as PublishedRegistryItem)
    : undefined;

  if (!item || item.name !== id || !Array.isArray(item.files)) return [];

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
