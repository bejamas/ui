export function buildMdx(params: {
  importName: string;
  importPath: string;
  title: string;
  description: string;
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
}): string {
  const {
    importName,
    importPath,
    title,
    description,
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
  } = params;

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
  const uiAutoLines = sortedUiAuto.map(
    (name) => `import ${name} from '@bejamas/ui/components/${name}.astro';`,
  );
  const exampleLines = (examples ?? [])
    .map((ex) => `import ${ex.importName} from '${ex.importPath}';`)
    .sort((a, b) => a.localeCompare(b));
  const internalTopImports = [
    !hasImport ? `import ${importName} from '${importPath}';` : null,
    ...uiAutoLines,
    ...exampleLines,
  ]
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
    const usedUi = (autoImports ?? [])
      .filter((n) => used.has(n))
      .slice()
      .sort();
    const includeMain = !hasImport && used.has(importName);

    const external: string[] = [];
    if (usedIcons.length) {
      external.push(`import { ${usedIcons.join(", ")} } from '@lucide/astro';`);
    }
    const internal: string[] = [];
    if (includeMain)
      internal.push(`import ${importName} from '${importPath}';`);
    internal.push(
      ...usedUi.map(
        (name) => `import ${name} from '@bejamas/ui/components/${name}.astro';`,
      ),
    );

    const externalSorted = external.slice().sort((a, b) => a.localeCompare(b));
    const internalSorted = internal.slice().sort((a, b) => a.localeCompare(b));
    return [
      ...externalSorted,
      externalSorted.length && internalSorted.length ? "" : null,
      ...internalSorted,
    ].filter((v) => v !== null && v !== undefined) as string[];
  };

  const primaryExampleSection =
    primaryExampleMDX && primaryExampleMDX.length
      ? `<DocsTabs>
  <DocsTabItem label="Preview">
    <div class="not-content sl-bejamas-component-preview flex justify-center p-10 border border-border rounded-xl min-h-[450px] items-center">
${primaryExampleMDX}
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
      exampleSections.push(
        `### ${blk.title}

<DocsTabs>
  <DocsTabItem label="Preview">
    <div class="not-content sl-bejamas-component-preview flex justify-center p-10 border border-border rounded-xl min-h-[450px] items-center">
${blk.body}
    </div>
  </DocsTabItem>
  <DocsTabItem label="Source">

\`\`\`astro
${(() => {
  const lines = buildSnippetImportLines(blk.body);
  return lines.length ? `---\n${lines.join("\n")}\n---\n\n` : "";
})()}${blk.body}
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

  const lines = [
    "---",
    `title: ${title}`,
    description ? `description: ${description}` : null,
    "---",
    "",
    ...importLines,
    importLines.length ? "" : null,
    description ? description : null,
    description ? "" : null,
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
