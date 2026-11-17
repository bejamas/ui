import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const docSources = loadDocSources();

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

export function getMarkdownRoutes() {
  return Array.from(docsByRoute.keys());
}

export function hasMarkdownSource(pathname: string) {
  return docsByRoute.has(normalizeDocsRoute(pathname));
}

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;

function readFrontmatterField(frontmatter: string, field: string) {
  const fieldMatch = frontmatter.match(
    new RegExp(`^${field}:\\s*["']?([^"'\\n]+)["']?\\s*$`, "m"),
  );
  return fieldMatch?.[1]?.trim() ?? "";
}

export function parseFrontmatter(content: string) {
  const match = content.match(FRONTMATTER_REGEX);

  if (!match?.[1] || match[2] === undefined) {
    return { title: "", description: "", template: "", body: content };
  }

  const frontmatter = match[1];

  return {
    title: readFrontmatterField(frontmatter, "title"),
    description: readFrontmatterField(frontmatter, "description"),
    template: readFrontmatterField(frontmatter, "template"),
    body: match[2],
  };
}

function dedent(value: string) {
  const lines = value.replace(/^\n+|\s+$/g, "").split("\n");
  const indent = Math.min(
    ...lines
      .filter((line) => line.trim().length > 0)
      .map((line) => line.match(/^ */)?.[0].length ?? 0),
  );

  return lines.map((line) => line.slice(indent)).join("\n");
}

export function transformMarkdown(content: string) {
  const { title, body: markdownContent } = parseFrontmatter(content);

  const regexes = [
    /import\s+[\s\S]*?from\s+['"].*?['"];?\s*/g,
    /<\s*\/?\s*Steps\b[^>]*>\s*/g,
    /<\s*\/?\s*FileTree\b[^>]*>\s*/g,
  ];

  let cleanContent = regexes.reduce(
    (value, regex) => value.replace(regex, ""),
    markdownContent,
  );

  // Live previews render the same component as the code block that follows
  // them, so they only add noise for readers of the markdown export.
  cleanContent = cleanContent.replace(
    /^<div class="not-content[^"]*">\n[\s\S]*?\n<\/div>\n?/gm,
    "",
  );

  cleanContent = cleanContent.replace(
    /<DocsTabs\b[^>]*>([\s\S]*?)<\/DocsTabs>/g,
    (_, tabs: string) =>
      Array.from(
        tabs.matchAll(
          /<DocsTabItem\s+label=["']([^"']+)["'][^>]*>([\s\S]*?)<\/DocsTabItem>/g,
        ),
      )
        .map(([, label, body]) => `${label}:\n\n${dedent(body ?? "")}`)
        .join("\n\n"),
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

export function resolveDocsRoot(options: {
  importMetaUrl?: string;
  cwd?: string;
} = {}) {
  const importMetaUrl = options.importMetaUrl ?? import.meta.url;
  const cwd = options.cwd ?? process.cwd();
  const candidates = [
    fileURLToPath(new URL("../content/docs", importMetaUrl)),
    path.resolve(cwd, "src/content/docs"),
    path.resolve(cwd, "apps/web/src/content/docs"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to resolve docs content root. Checked: ${candidates.join(", ")}`,
  );
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

function loadDocSources() {
  if (typeof import.meta.glob === "function") {
    return import.meta.glob("/src/content/docs/**/*.{md,mdx}", {
      eager: true,
      import: "default",
      query: "?raw",
    }) as Record<string, string>;
  }

  const docsRoot = resolveDocsRoot();
  const collected: Record<string, string> = {};
  const queue = [docsRoot];

  while (queue.length > 0) {
    const currentDir = queue.shift();
    if (!currentDir) continue;

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const resolvedPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(resolvedPath);
        continue;
      }

      if (!/\.(md|mdx)$/.test(entry.name)) {
        continue;
      }

      const relativePath = path
        .relative(docsRoot, resolvedPath)
        .split(path.sep)
        .join("/");
      const sourcePath = `/src/content/docs/${relativePath}`;

      collected[sourcePath] = fs.readFileSync(resolvedPath, "utf8");
    }
  }

  return collected;
}

export interface DocsIndexPage {
  route: string;
  title: string;
  description: string;
}

export interface DocsIndexSection {
  label: string;
  pages: DocsIndexPage[];
}

// Mirrors the "Getting Started" group of the Starlight sidebar so agents read
// pages in the same order people do. Pages missing here fall into Concepts.
const GETTING_STARTED_ROUTES = [
  "docs/introduction",
  "docs/installation",
  "docs/cli",
  "docs/forms-astro-actions",
];

export function getDocsIndex(): DocsIndexSection[] {
  const pages = new Map<string, DocsIndexPage>();

  for (const [route, source] of docsByRoute) {
    const { title, description, template } = parseFrontmatter(source);
    if (template === "splash" || !title) continue;
    pages.set(route, { route, title, description });
  }

  const byTitle = (a: DocsIndexPage, b: DocsIndexPage) =>
    a.title.localeCompare(b.title);
  const gettingStarted = GETTING_STARTED_ROUTES.flatMap((route) => {
    const page = pages.get(route);
    return page ? [page] : [];
  });
  const components = [...pages.values()]
    .filter((page) => page.route.startsWith("components/"))
    .sort(byTitle);
  const concepts = [...pages.values()]
    .filter(
      (page) =>
        !page.route.startsWith("components/") &&
        !GETTING_STARTED_ROUTES.includes(page.route),
    )
    .sort(byTitle);

  return [
    { label: "Getting Started", pages: gettingStarted },
    { label: "Components", pages: components },
    { label: "Concepts", pages: concepts },
  ];
}
