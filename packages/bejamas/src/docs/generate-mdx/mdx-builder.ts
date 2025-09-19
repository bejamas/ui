export function buildMdx(params: {
  importName: string;
  importPath: string;
  title: string;
  description: string;
  usageMDX: string;
  hasImport: boolean;
  propsList: string;
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
    examples,
    examplesBlocks,
    autoImports,
    lucideIcons,
    primaryExampleMDX,
    componentSource,
    commandName,
  } = params;

  const importLines = [
    `import { Tabs as DocsTabs, TabItem as DocsTabItem } from '@astrojs/starlight/components';`,
    !hasImport ? `import ${importName} from '${importPath}';` : null,
    ...(autoImports?.map(
      (name) => `import ${name} from '@bejamas/ui/components/${name}.astro';`,
    ) ?? []),
    ...(lucideIcons && lucideIcons.length
      ? [`import { ${lucideIcons.join(", ")} } from '@lucide/astro';`]
      : []),
    ...(examples?.map(
      (ex) => `import ${ex.importName} from '${ex.importPath}';`,
    ) ?? []),
  ].filter((v) => v !== null && v !== undefined);

  const primaryExampleSection =
    primaryExampleMDX && primaryExampleMDX.length
      ? `<DocsTabs>
  <DocsTabItem label="Preview">
    <div class="not-content sl-bejamas-component-preview flex justify-center p-10 border border-border border-dashed rounded-xl min-h-[450px] items-center">
${primaryExampleMDX}
    </div>
  </DocsTabItem>
  <DocsTabItem label="Source">

\`\`\`astro
${primaryExampleMDX}
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
    <div class="not-content sl-bejamas-component-preview flex justify-center p-10 border border-border border-dashed rounded-xl min-h-[450px] items-center">
${blk.body}
    </div>
  </DocsTabItem>
  <DocsTabItem label="Source">

\`\`\`astro
${blk.body}
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
    usageMDX && usageMDX.length ? usageMDX : `## Usage\n\n<${importName} />\n`,
    "",
    propsList ? `## Props\n\n${propsList}` : null,
    propsList ? "" : null,
    exampleSections.length
      ? `## Examples\n\n` + exampleSections.join("\n\n")
      : null,
  ].filter((v) => v !== null && v !== undefined);

  return lines.join("\n").trim() + "\n";
}
