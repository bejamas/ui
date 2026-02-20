import {
  parseFenceInfo,
  prepareExampleContent,
  type ParsedExampleSection,
} from "./examples";

/**
 * Check if an import path uses the new barrel export pattern (no .astro extension)
 */
function isBarrelImport(path: string): boolean {
  return !path.endsWith(".astro");
}

/**
 * Convert a PascalCase component name to its folder path (kebab-case).
 * Examples:
 *   - "Card" → "card"
 *   - "CardHeader" → "card"
 *   - "InputGroup" → "input-group"
 *   - "InputGroupAddon" → "input-group"
 *   - "StickySurface" → "sticky-surface"
 *   - "RadioGroup" → "radio-group"
 *   - "RadioGroupItem" → "radio-group"
 */
function componentToFolder(name: string): string {
  // Known multi-word component families (in PascalCase order)
  // These map to kebab-case folder names
  const multiWordFamilies = [
    "InputGroup",
    "LinkGroup",
    "RadioGroup",
    "ButtonGroup",
    "StickySurface",
  ];

  // Check for multi-word families first (order matters - longer matches first)
  const sortedFamilies = multiWordFamilies.sort((a, b) => b.length - a.length);
  for (const family of sortedFamilies) {
    if (name === family || name.startsWith(family)) {
      // InputGroup → input-group
      return family.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    }
  }

  // For regular names, extract the base component (first PascalCase word)
  // CardHeader → Card → card
  // AvatarFallback → Avatar → avatar
  const baseMatch = name.match(/^[A-Z][a-z]*/);
  return baseMatch ? baseMatch[0].toLowerCase() : name.toLowerCase();
}

function resolveComponentFolder(
  name: string,
  componentFolderMap?: Record<string, string>,
): string {
  if (!componentFolderMap) return componentToFolder(name);
  const direct = componentFolderMap[name];
  if (direct && direct.length) return direct;

  // Fallback: try the longest mapped prefix (e.g. InputGroup* -> input-group)
  const prefixMatch = Object.keys(componentFolderMap)
    .filter((key) => name.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];
  if (prefixMatch) return componentFolderMap[prefixMatch];

  return componentToFolder(name);
}

/**
 * Group component names by their folder path
 */
function groupComponentsByFolder(
  components: string[],
  componentFolderMap?: Record<string, string>,
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const comp of components) {
    const folder = resolveComponentFolder(comp, componentFolderMap);
    if (!groups.has(folder)) {
      groups.set(folder, []);
    }
    groups.get(folder)!.push(comp);
  }
  return groups;
}

/**
 * Generate import lines for UI components using the barrel import pattern
 */
function generateBarrelImports(
  components: string[],
  componentsAlias: string,
  componentFolderMap?: Record<string, string>,
): string[] {
  const groups = groupComponentsByFolder(components, componentFolderMap);
  const lines: string[] = [];

  // Sort folders alphabetically for consistent output
  const sortedFolders = Array.from(groups.keys()).sort();

  for (const folder of sortedFolders) {
    const names = groups.get(folder)!.sort();
    lines.push(
      `import { ${names.join(", ")} } from '${componentsAlias}/${folder}';`,
    );
  }

  return lines;
}

/**
 * Generate import lines for UI components using the old default import pattern
 */
function generateDefaultImports(
  components: string[],
  componentsAlias: string,
): string[] {
  return components
    .slice()
    .sort()
    .map((name) => `import ${name} from '${componentsAlias}/${name}.astro';`);
}

export function buildMdx(params: {
  importName: string;
  importPath: string;
  title: string;
  description: string;
  descriptionBodyMDX?: string;
  figmaUrl?: string;
  usageMDX: string;
  hasImport: boolean;
  propsList: string;
  propsTable?: Array<{
    name: string;
    type?: string;
    required?: boolean;
    defaultValue?: string | null;
    description?: string | null;
  }>;
  examples: Array<{
    importName: string;
    importPath: string;
    title: string;
    source: string;
  }>;
  examplesSections: ParsedExampleSection[];
  componentFolderMap?: Record<string, string>;
  autoImports: string[];
  lucideIcons: string[];
  primaryExampleMDX: string;
  componentSource: string;
  commandName: string;
  componentsAlias: string;
  /**
   * Optional: additional named exports from the main component's barrel.
   * Used when the main component has subcomponents (e.g., Card, CardHeader, CardTitle).
   * If provided, these will be included in the main import statement.
   */
  namedExports?: string[];
  /**
   * Optional: API reference documentation (events, programmatic control, data attributes).
   */
  apiMDX?: string;
}): string {
  const {
    importName,
    importPath,
    title,
    description,
    descriptionBodyMDX,
    usageMDX,
    hasImport,
    propsList,
    propsTable,
    examples,
    examplesSections,
    componentFolderMap,
    autoImports,
    lucideIcons,
    primaryExampleMDX,
    componentSource,
    commandName,
    figmaUrl,
    componentsAlias,
    namedExports,
    apiMDX,
  } = params;

  // Detect if we should use the new barrel import pattern
  const useBarrelPattern = isBarrelImport(importPath);

  const sortedLucide = (lucideIcons ?? []).slice().sort();
  const lucideTopLine = sortedLucide.length
    ? `import { ${sortedLucide.join(", ")} } from '@lucide/astro';`
    : null;
  const externalTopImports = [
    `import { Tabs as DocsTabs, TabItem as DocsTabItem } from '@astrojs/starlight/components';`,
    lucideTopLine,
  ]
    .filter((v) => v != null)
    .slice()
    .sort((a, b) => String(a).localeCompare(String(b)));

  const sortedUiAuto = (autoImports ?? []).slice().sort();

  // Generate UI component imports based on pattern
  const uiAutoLines = useBarrelPattern
    ? generateBarrelImports(sortedUiAuto, componentsAlias, componentFolderMap)
    : generateDefaultImports(sortedUiAuto, componentsAlias);

  const exampleLines = (examples ?? [])
    .map((ex) => `import ${ex.importName} from '${ex.importPath}';`)
    .sort((a, b) => a.localeCompare(b));

  // Build main component import
  let mainImportLine: string | null = null;
  if (!hasImport) {
    if (useBarrelPattern) {
      // New pattern: named exports
      const exports = [importName, ...(namedExports ?? [])].sort();
      mainImportLine = `import { ${exports.join(", ")} } from '${importPath}';`;
    } else {
      // Old pattern: default export
      mainImportLine = `import ${importName} from '${importPath}';`;
    }
  }

  const internalTopImports = [mainImportLine, ...uiAutoLines, ...exampleLines]
    .filter((v) => v != null)
    .slice()
    .sort((a, b) => String(a).localeCompare(String(b)));

  const importLines = [
    ...externalTopImports,
    externalTopImports.length && internalTopImports.length ? "" : null,
    ...internalTopImports,
  ].filter((v) => v !== null && v !== undefined);

  // Helper: build per-snippet imports so code fences are minimal and copy-pasteable
  const extractTags = (snippet: string): Set<string> => {
    const found = new Set<string>();
    const tagRegex = /<([A-Z][A-Za-z0-9_]*)\b/g;
    let m: RegExpExecArray | null;
    while ((m = tagRegex.exec(snippet)) !== null) {
      found.add(m[1]);
    }
    return found;
  };

  const buildSnippetImportLines = (snippet: string): string[] => {
    if (!snippet || !snippet.length) return [];
    const used = extractTags(snippet);
    const usedIcons = sortedLucide.filter((n) => used.has(n));

    // Find UI components used in snippet
    const usedUi = (autoImports ?? []).filter((n) => used.has(n));

    // Check if main component (and its subcomponents) are used
    const includeMain = !hasImport && used.has(importName);

    // For new pattern, also check for subcomponents from the main barrel
    const usedNamedExports =
      useBarrelPattern && namedExports
        ? namedExports.filter((n) => used.has(n))
        : [];

    const external: string[] = [];
    if (usedIcons.length) {
      external.push(`import { ${usedIcons.join(", ")} } from '@lucide/astro';`);
    }

    const internal: string[] = [];

    if (useBarrelPattern) {
      // New pattern: group by folder and use named imports

      // Main component and its subcomponents
      if (includeMain || usedNamedExports.length > 0) {
        const mainExports = [
          ...(includeMain ? [importName] : []),
          ...usedNamedExports,
        ].sort();
        internal.push(
          `import { ${mainExports.join(", ")} } from '${importPath}';`,
        );
      }

      // Other UI components grouped by folder
      if (usedUi.length > 0) {
        internal.push(
          ...generateBarrelImports(usedUi, componentsAlias, componentFolderMap),
        );
      }
    } else {
      // Old pattern: default imports
      if (includeMain) {
        internal.push(`import ${importName} from '${importPath}';`);
      }
      internal.push(
        ...usedUi
          .slice()
          .sort()
          .map(
            (name) => `import ${name} from '${componentsAlias}/${name}.astro';`,
          ),
      );
    }

    const externalSorted = external.slice().sort((a, b) => a.localeCompare(b));
    const internalSorted = internal.slice().sort((a, b) => a.localeCompare(b));
    return [
      ...externalSorted,
      externalSorted.length && internalSorted.length ? "" : null,
      ...internalSorted,
    ].filter((v) => v !== null && v !== undefined) as string[];
  };

  const wrapTextNodes = (snippet: string): string => {
    if (!snippet) return snippet;
    return snippet.replace(/>([^<]+)</g, (match, inner) => {
      const trimmed = inner.trim();
      if (!trimmed.length) return match;
      // Skip if the entire trimmed content is a JSX expression
      if (/^\{[\s\S]*\}$/.test(trimmed)) return match;
      // Skip if the content already contains JSX expressions (e.g., "Use{\" \"}" or mixed content)
      // This prevents double-wrapping and breaking inline JSX whitespace expressions
      if (/\{[^}]*\}/.test(inner)) return match;
      return `>{${JSON.stringify(inner)}}<`;
    });
  };

  /**
   * Normalize whitespace in preview content.
   * This collapses ALL newlines and multiple spaces into single spaces to prevent
   * MDX parsing issues. In particular, a '>' at the start of a line is interpreted
   * as a block quote marker by MDX, which causes "Unexpected lazy line" errors.
   */
  const normalizeInlineWhitespace = (snippet: string): string => {
    if (!snippet) return snippet;
    // Collapse ALL newlines and multiple whitespace into single spaces
    // This prevents MDX from interpreting '>' at start of line as block quote
    return snippet.replace(/\s+/g, " ").trim();
  };

  /**
   * Convert <p> tags that contain component tags to <span> tags.
   * This is necessary because components may render as block elements (like <div>),
   * and HTML doesn't allow block elements inside <p>. The browser would automatically
   * close the <p> before any block element, breaking the layout.
   */
  const convertParagraphsWithComponents = (snippet: string): string => {
    if (!snippet) return snippet;
    // Detect if a <p> tag contains component tags (PascalCase like <KbdGroup>)
    // If so, convert <p> to <span> to allow block-level children
    return snippet.replace(
      /<p(\s[^>]*)?>([^]*?)<\/p>/gi,
      (match, attrs, content) => {
        // Check if content contains component tags (PascalCase)
        if (/<[A-Z][A-Za-z0-9]*/.test(content)) {
          // Convert to span with inline-block display to preserve paragraph-like behavior
          const spanAttrs = attrs || "";
          return `<span${spanAttrs} style="display:block">${content}</span>`;
        }
        return match;
      },
    );
  };

  const toMdxPreview = (snippet: string): string => {
    if (!snippet) return snippet;
    // Raw script tags in MDX JSX preview blocks can break Acorn parsing on `{}`.
    // Keep scripts in source fences but strip them from rendered previews.
    const withoutScripts = snippet.replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      "",
    );
    // Convert HTML comments to MDX comment blocks for preview sections
    const withoutComments = withoutScripts.replace(
      /<!--([\s\S]*?)-->/g,
      "{/*$1*/}",
    );
    // Convert <p> tags containing components to <span> to avoid HTML validity issues
    const withConvertedParagraphs =
      convertParagraphsWithComponents(withoutComments);
    // If the snippet contains user-defined <p> elements, preserve structure as-is
    if (/<p[\s>]/i.test(withConvertedParagraphs)) {
      return normalizeInlineWhitespace(withConvertedParagraphs);
    }
    // Normalize whitespace to prevent MDX from splitting inline text into paragraphs
    const normalized = normalizeInlineWhitespace(withConvertedParagraphs);
    return wrapTextNodes(normalized);
  };

  const renderAstroPreviewsInMarkdown = (block: string): string => {
    if (!block || !block.length) return block;

    const lines = block.split("\n");
    const out: string[] = [];
    let inFence = false;
    let fenceOpen = "";
    let currentFenceLang = "";
    let currentFenceFlags = new Set<string>();
    const fenceBody: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("```")) {
        if (!inFence) {
          inFence = true;
          fenceOpen = line;
          const parsed = parseFenceInfo(trimmed.slice(3).trim());
          currentFenceLang = parsed.lang;
          currentFenceFlags = parsed.flags;
          fenceBody.length = 0;
          continue;
        }

        if (currentFenceLang === "astro" && !currentFenceFlags.has("nopreview")) {
          const sourceCode = fenceBody.join("\n").trim();
          const prepared = prepareExampleContent(
            `${fenceOpen}\n${sourceCode}\n${line}`,
          );
          if (prepared.snippet && prepared.snippet.length) {
            out.push(
              `<div class="not-content sl-bejamas-component-preview flex justify-center px-4 md:px-10 py-12 border border-border rounded-t-lg min-h-72 items-center">`,
            );
            out.push(toMdxPreview(prepared.snippet));
            out.push("</div>");
            out.push("");
          }
        }

        out.push(fenceOpen);
        if (fenceBody.length) out.push(...fenceBody);
        out.push(line);

        inFence = false;
        fenceOpen = "";
        currentFenceLang = "";
        currentFenceFlags = new Set<string>();
        fenceBody.length = 0;
        continue;
      }

      if (inFence) {
        fenceBody.push(line);
        continue;
      }

      out.push(line);
    }

    if (inFence) {
      out.push(fenceOpen);
      if (fenceBody.length) out.push(...fenceBody);
    }

    return out.join("\n").trim();
  };

  const renderedDescriptionBodyMDX = renderAstroPreviewsInMarkdown(
    descriptionBodyMDX || "",
  );
  const renderedUsageMDX = renderAstroPreviewsInMarkdown(usageMDX || "");
  const renderedApiMDX = renderAstroPreviewsInMarkdown(apiMDX || "");

  const primaryExampleSection =
    primaryExampleMDX && primaryExampleMDX.length
      ? `<div class="not-content sl-bejamas-component-preview flex justify-center px-4 md:px-10 py-12 border border-border rounded-t-lg min-h-72 items-center">
${toMdxPreview(primaryExampleMDX)}
</div>

\`\`\`astro
${(() => {
  const lines = buildSnippetImportLines(primaryExampleMDX);
  return lines.length ? `---\n${lines.join("\n")}\n---\n\n` : "";
})()}${primaryExampleMDX}
\`\`\``
      : null;

  const renderExampleItem = (
    headingLevel: "###" | "####",
    headingTitle: string,
    body: string,
  ): string => {
    const prepared = prepareExampleContent(body);
    const titleLine = `${headingLevel} ${headingTitle}`;
    const blocks: string[] = [titleLine];
    if (prepared.descriptionMD && prepared.descriptionMD.length) {
      blocks.push(prepared.descriptionMD);
    }

    if (
      prepared.snippet &&
      prepared.snippet.length &&
      prepared.sourceCode &&
      prepared.sourceCode.length &&
      !prepared.skipPreview
    ) {
      const previewBody = toMdxPreview(prepared.snippet);
      blocks.push(
        `<div class="not-content sl-bejamas-component-preview flex justify-center px-4 md:px-10 py-12 border border-border rounded-t-lg min-h-72 items-center">
${previewBody}
</div>`,
      );
    }

    if (prepared.sourceCode && prepared.sourceCode.length) {
      const sourceBlock = prepared.sourceFromFence
        ? prepared.sourceCode
        : `${(() => {
            const lines = buildSnippetImportLines(prepared.sourceCode);
            return lines.length ? `---\n${lines.join("\n")}\n---\n\n` : "";
          })()}${prepared.sourceCode}`;
      blocks.push(`\`\`\`astro
${sourceBlock}
\`\`\``);
    }

    return blocks.join("\n\n");
  };

  const renderedExampleSections: string[] = [];
  if (examplesSections && examplesSections.length) {
    let implicitExampleCounter = 1;

    for (const section of examplesSections) {
      const sectionParts: string[] = [];
      const hasSectionTitle = !!(section.title && section.title.length);
      if (hasSectionTitle) {
        sectionParts.push(`### ${section.title}`);
      }

      if (section.introMD && section.introMD.length) {
        sectionParts.push(section.introMD);
      }

      if (section.items && section.items.length) {
        const itemHeadingLevel: "###" | "####" = hasSectionTitle
          ? "####"
          : "###";
        for (const item of section.items) {
          sectionParts.push(
            renderExampleItem(itemHeadingLevel, item.title, item.body),
          );
        }
      } else if (!hasSectionTitle && section.introMD && section.introMD.length) {
        const prepared = prepareExampleContent(section.introMD);
        if (prepared.snippet && prepared.snippet.length) {
          sectionParts.length = 0;
          sectionParts.push(
            renderExampleItem(
              "###",
              `Example ${implicitExampleCounter}`,
              section.introMD,
            ),
          );
          implicitExampleCounter += 1;
        }
      }

      if (sectionParts.length) {
        renderedExampleSections.push(sectionParts.join("\n\n").trim());
      }
    }
  }
  if (examples && examples.length) {
    for (const ex of examples) {
      renderedExampleSections.push(
        `### ${ex.title}

<div class="not-content">
  <${ex.importName} />
</div>

\`\`\`astro
${ex.source}
\`\`\``,
      );
    }
  }

  const formatDefault = (val: unknown): string => {
    if (val == null) return "";
    let raw = String(val).trim();
    if (!raw.length) return "";
    // Normalize curly quotes to ASCII
    raw = raw
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2018\u2019]/g, "'");
    const isSingleQuoted = /^'[^']*'$/.test(raw);
    const isDoubleQuoted = /^"[^"]*"$/.test(raw);
    const isBacktickSimple = /^`[^`]*`$/.test(raw) && raw.indexOf("${") === -1;

    let content = raw;
    if (isSingleQuoted || isDoubleQuoted || isBacktickSimple) {
      const inner = raw.slice(1, -1);
      // Re-quote with standard double quotes
      content = `"${inner}"`;
    }
    // Escape table pipes
    content = content.replace(/\|/g, "\\|");
    // Choose a backtick fence that doesn't appear in content
    const hasTick = content.includes("`");
    const hasDoubleTick = content.includes("``");
    const fence = !hasTick ? "`" : !hasDoubleTick ? "``" : "```";
    return `${fence}${content}${fence}`;
  };

  const installationSection = `## Installation

<DocsTabs syncKey="pkg">
  <DocsTabItem label="bun">
  \`\`\`bash
  bunx bejamas add ${commandName}
  \`\`\`
  </DocsTabItem>
  <DocsTabItem label="npm">
  \`\`\`bash
  npx bejamas add ${commandName}
  \`\`\`
  </DocsTabItem>
  <DocsTabItem label="pnpm">
  \`\`\`bash
  pnpm dlx bejamas add ${commandName}
  \`\`\`
  </DocsTabItem>
  <DocsTabItem label="yarn">
  \`\`\`bash
  yarn dlx bejamas add ${commandName}
  \`\`\`
  </DocsTabItem>
</DocsTabs>`;

  const serializeFrontmatter = (
    label: string,
    value?: string,
  ): string | null => {
    if (!value || !value.length) return null;
    return `${label}: ${JSON.stringify(value)}`;
  };

  const lines = [
    "---",
    serializeFrontmatter("title", title),
    serializeFrontmatter("description", description),
    serializeFrontmatter("figmaUrl", figmaUrl),
    "---",
    "",
    ...importLines,
    importLines.length ? "" : null,
    renderedDescriptionBodyMDX && renderedDescriptionBodyMDX.length
      ? renderedDescriptionBodyMDX
      : null,
    renderedDescriptionBodyMDX && renderedDescriptionBodyMDX.length ? "" : null,
    primaryExampleSection,
    primaryExampleSection ? "" : null,
    installationSection,
    "",
    renderedUsageMDX && renderedUsageMDX.length
      ? `## Usage\n\n${renderedUsageMDX}`
      : null,
    "",
    propsTable && propsTable.length
      ? `## Props\n\n| Prop | Type | Default |\n|---|---|---|\n${propsTable
          .map(
            (p) =>
              `| <code>${p.name}</code> | \`${(p.type || "").replace(/\|/g, "\\|")}\` | ${formatDefault(p.defaultValue)} |`,
          )
          .join("\n")}`
      : propsList
        ? `## Props\n\n${propsList}`
        : null,
    (propsTable && propsTable.length) || propsList ? "" : null,
    renderedExampleSections.length
      ? `## Examples\n\n` + renderedExampleSections.join("\n\n")
      : null,
    renderedExampleSections.length ? "" : null,
    renderedApiMDX && renderedApiMDX.length
      ? `## API Reference\n\n${renderedApiMDX}`
      : null,
  ].filter((v) => v !== null && v !== undefined);

  return lines.join("\n").trim() + "\n";
}
