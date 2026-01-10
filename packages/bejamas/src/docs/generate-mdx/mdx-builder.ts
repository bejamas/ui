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

/**
 * Group component names by their folder path
 */
function groupComponentsByFolder(components: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const comp of components) {
    const folder = componentToFolder(comp);
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
): string[] {
  const groups = groupComponentsByFolder(components);
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
  examplesBlocks: Array<{ title: string; body: string }>;
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
    examplesBlocks,
    autoImports,
    lucideIcons,
    primaryExampleMDX,
    componentSource,
    commandName,
    figmaUrl,
    componentsAlias,
    namedExports,
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
    ? generateBarrelImports(sortedUiAuto, componentsAlias)
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
        internal.push(...generateBarrelImports(usedUi, componentsAlias));
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
      if (/^\{[\s\S]*\}$/.test(trimmed)) return match;
      return `>{${JSON.stringify(inner)}}<`;
    });
  };

  const toMdxPreview = (snippet: string): string => {
    if (!snippet) return snippet;
    // Convert HTML comments to MDX comment blocks for preview sections
    const withoutComments = snippet.replace(/<!--([\s\S]*?)-->/g, "{/*$1*/}");
    return wrapTextNodes(withoutComments);
  };

  // Split an example body into leading markdown description (paragraphs)
  // and the Astro/HTML snippet that should be rendered in Preview/Source tabs
  const splitDescriptionAndSnippet = (
    body: string,
  ): { descriptionMD: string; snippet: string } => {
    if (!body || !body.trim().length) return { descriptionMD: "", snippet: "" };
    const lines = body.split("\n");
    let snippetStartIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      // Skip empty lines before first meaningful content
      if (!ln.trim().length) continue;
      // Heuristic: consider this line the start of the snippet if it looks like Astro/HTML/JSX
      // e.g. starts with '<' or '{'
      if (/^\s*[<{]/.test(ln)) {
        snippetStartIdx = i;
        break;
      }
      // Otherwise it's part of markdown description; keep looking until we hit markup
    }
    if (snippetStartIdx <= 0) {
      // No clear description or snippet starts at the very beginning → treat all as snippet
      return { descriptionMD: "", snippet: body.trim() };
    }
    const descriptionMD = lines.slice(0, snippetStartIdx).join("\n").trim();
    const snippet = lines.slice(snippetStartIdx).join("\n").trim();
    return { descriptionMD, snippet };
  };

  const primaryExampleSection =
    primaryExampleMDX && primaryExampleMDX.length
      ? `<DocsTabs>
  <DocsTabItem label="Preview">
    <div class="not-content sl-bejamas-component-preview flex justify-center px-10 py-12 border border-border rounded-md min-h-[450px] items-center [&_input]:max-w-xs">
${toMdxPreview(primaryExampleMDX)}
    </div>
  </DocsTabItem>
  <DocsTabItem label="Source">

\`\`\`astro
${(() => {
  const lines = buildSnippetImportLines(primaryExampleMDX);
  return lines.length ? `---\n${lines.join("\n")}\n---\n\n` : "";
})()}${primaryExampleMDX}
\`\`\`
  </DocsTabItem>
</DocsTabs>`
      : null;

  const exampleSections: string[] = [];
  if (examplesBlocks && examplesBlocks.length) {
    for (const blk of examplesBlocks) {
      const { descriptionMD, snippet } = splitDescriptionAndSnippet(blk.body);
      const previewBody = toMdxPreview(snippet);

      // If there's no snippet, render only header + description
      if (!snippet || !snippet.length) {
        exampleSections.push(
          `### ${blk.title}

${descriptionMD}`.trim(),
        );
        continue;
      }

      exampleSections.push(
        `### ${blk.title}

${descriptionMD ? `${descriptionMD}\n\n` : ""}<DocsTabs>
  <DocsTabItem label="Preview">
    <div class="not-content sl-bejamas-component-preview flex justify-center px-10 py-12 border border-border rounded-md min-h-[450px] items-center [&_input]:max-w-xs">
${previewBody}
    </div>
  </DocsTabItem>
  <DocsTabItem label="Source">

\`\`\`astro
${(() => {
  const lines = buildSnippetImportLines(snippet);
  return lines.length ? `---\n${lines.join("\n")}\n---\n\n` : "";
})()}${snippet}
\`\`\`
  </DocsTabItem>
</DocsTabs>`,
      );
    }
  }
  if (examples && examples.length) {
    for (const ex of examples) {
      exampleSections.push(
        `### ${ex.title}

<DocsTabs>
  <DocsTabItem label="Preview">
    <div class="not-content">
      <${ex.importName} />
    </div>
  </DocsTabItem>
  <DocsTabItem label="Source">

\`\`\`astro
${ex.source}
\`\`\`
  </DocsTabItem>
</DocsTabs>`,
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
<DocsTabs syncKey="installation">
   <DocsTabItem label="CLI">

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
</DocsTabs>
</DocsTabItem>
<DocsTabItem label="Manual">

\`\`\`astro
${componentSource}
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
    descriptionBodyMDX && descriptionBodyMDX.length ? descriptionBodyMDX : null,
    descriptionBodyMDX && descriptionBodyMDX.length ? "" : null,
    primaryExampleSection,
    primaryExampleSection ? "" : null,
    installationSection,
    "",
    usageMDX && usageMDX.length ? `## Usage\n\n${usageMDX}` : null,
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
    exampleSections.length
      ? `## Examples\n\n` + exampleSections.join("\n\n")
      : null,
  ].filter((v) => v !== null && v !== undefined);

  return lines.join("\n").trim() + "\n";
}
