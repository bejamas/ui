// Generated from packages/registry/src/lib. Do not edit packages/ui/src/lib/headless-dependencies.ts directly.
/** Headless behaviors imported by emitted frontmatter, client scripts or helpers. */
export function getHeadlessDependencies(files: { content?: string }[]) {
  const dependencies = new Set<string>();
  for (const file of files) {
    // JSDoc demos describe optional components and must not add dependencies.
    const source = (file.content ?? "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of source.matchAll(
      /(?:\bfrom\s*|\bimport\s*\(?\s*)["'](@data-slot\/[^/"']+)(?:\/[^"']*)?["']/g,
    )) {
      dependencies.add(match[1]);
    }
  }
  return [...dependencies].sort();
}
