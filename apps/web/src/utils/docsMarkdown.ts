const docSources = import.meta.glob("/src/content/docs/**/*.{md,mdx}", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

const docsByRoute = new Map(
  Object.entries(docSources).map(([sourcePath, rawContent]) => [
    toRoutePath(sourcePath),
    rawContent,
  ]),
);

export function normalizeDocsRoute(pathname: string) {
  return pathname.replace(/^\/+|\/+$/g, "");
}

export function getMarkdownSource(pathname: string) {
  return docsByRoute.get(normalizeDocsRoute(pathname));
}

export function hasMarkdownSource(pathname: string) {
  return docsByRoute.has(normalizeDocsRoute(pathname));
}

export function transformMarkdown(content: string) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  let title = "";
  let markdownContent = content;

  if (match?.[1] && match[2] !== undefined) {
    const frontmatter = match[1];
    markdownContent = match[2];

    const titleMatch = frontmatter.match(/title:\s*["']?([^"'\n]+)["']?/);
    if (titleMatch?.[1]) {
      title = titleMatch[1].trim();
    }
  }

  const regexes = [
    /import\s+[\s\S]*?from\s+['"].*?['"];?\s*/g,
    /<\s*\/?\s*Steps\b[^>]*>\s*/g,
  ];

  let cleanContent = regexes.reduce(
    (value, regex) => value.replace(regex, ""),
    markdownContent,
  );

  cleanContent = cleanContent.replace(
    /<LinkCard[\s\S]*?title=["']([^"']+)["'][\s\S]*?href=["']([^"']+)["'][\s\S]*?\/>/g,
    (_, linkTitle, href) => `[${linkTitle}](${href})`,
  );

  cleanContent = cleanContent.replace(
    /{%\s*linkcard[\s\S]*?title=["']([^"']+)["'][\s\S]*?href=["']([^"']+)["'][\s\S]*?\/%}/g,
    (_, linkTitle, href) => `[${linkTitle}](${href})`,
  );

  cleanContent = cleanContent.replace(/\n{3,}/g, "\n\n");

  return `${title ? `# ${title}\n\n` : ""}${cleanContent.trim()}`;
}

function toRoutePath(sourcePath: string) {
  const relativePath = sourcePath.replace(/^\/src\/content\/docs\//, "");
  const withoutExtension = relativePath.replace(/\.(md|mdx)$/, "");
  const segments = withoutExtension.split("/");

  if (segments[segments.length - 1] === "index") {
    return segments.slice(0, -1).join("/");
  }

  return withoutExtension;
}
