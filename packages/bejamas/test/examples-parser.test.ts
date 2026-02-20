import { describe, expect, test } from "bun:test";
import {
  extractComponentTagsFromExamplesSections,
  extractComponentTagsFromPreviewMarkdown,
  parseFenceInfo,
  parseExamplesSections,
  prepareExampleContent,
} from "@/src/docs/generate-mdx/examples";
import { buildMdx } from "@/src/docs/generate-mdx/mdx-builder";

describe("examples parser", () => {
  test("parses ## sections and ### items without splitting headings inside fenced astro", () => {
    const input = `## Align

Use the align prop.

### inline-start

Use start alignment.

\`\`\`astro
---
const label = "### not heading";
---
<Field>
  <InputGroup />
</Field>
\`\`\`

### inline-end

<InputGroup align="inline-end" />`;

    const sections = parseExamplesSections(input);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("Align");
    expect(sections[0].introMD).toContain("Use the align prop.");
    expect(sections[0].items).toHaveLength(2);
    expect(sections[0].items[0].title).toBe("inline-start");
    expect(sections[0].items[0].body).toContain('const label = "### not heading";');
    expect(sections[0].items[1].title).toBe("inline-end");
  });

  test("creates an implicit section when only ### headings are present", () => {
    const input = `### First
<FirstExample />

### Second
<SecondExample />`;

    const sections = parseExamplesSections(input);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBeNull();
    expect(sections[0].items).toHaveLength(2);
    expect(sections[0].items[0].title).toBe("First");
    expect(sections[0].items[1].title).toBe("Second");
  });

  test("extracts preview snippet and source from fenced astro content", () => {
    const body = `Use this layout.

\`\`\`astro
---
import { SearchIcon } from '@lucide/astro';
---
<Field><SearchIcon /></Field>
\`\`\``;

    const prepared = prepareExampleContent(body);
    expect(prepared.sourceFromFence).toBe(true);
    expect(prepared.skipPreview).toBe(false);
    expect(prepared.descriptionMD).toContain("Use this layout.");
    expect(prepared.sourceCode).toContain("import { SearchIcon }");
    expect(prepared.snippet).toBe("<Field><SearchIcon /></Field>");
  });

  test("parses astro fence flags and supports nopreview", () => {
    const parsed = parseFenceInfo("astro nocollapse nopreview");
    expect(parsed.lang).toBe("astro");
    expect(parsed.flags.has("nocollapse")).toBe(true);
    expect(parsed.flags.has("nopreview")).toBe(true);
  });

  test("marks fenced astro content with nopreview flag", () => {
    const prepared = prepareExampleContent(`\`\`\`astro nopreview
<Field><InputGroup /></Field>
\`\`\``);
    expect(prepared.sourceFromFence).toBe(true);
    expect(prepared.skipPreview).toBe(true);
    expect(prepared.snippet).toBe("<Field><InputGroup /></Field>");
    expect(prepared.sourceCode).toContain("<Field><InputGroup /></Field>");
  });

  test("extracts component tags from fenced examples for auto imports", () => {
    const sections = parseExamplesSections(`## Align

### inline-start

\`\`\`astro
---
import { SearchIcon } from '@lucide/astro';
---
<Field>
  <InputGroup>
    <InputGroupAddon>
      <SearchIcon />
    </InputGroupAddon>
  </InputGroup>
</Field>
\`\`\``);

    const tags = extractComponentTagsFromExamplesSections(sections);
    expect(tags).toContain("Field");
    expect(tags).toContain("InputGroup");
    expect(tags).toContain("InputGroupAddon");
    expect(tags).toContain("SearchIcon");
  });

  test("extracts component tags from fenced astro blocks in generic markdown", () => {
    const markdown = `## Align

\`\`\`astro
---
import { SearchIcon } from '@lucide/astro';
---
<Field>
  <InputGroup>
    <InputGroupAddon>
      <SearchIcon />
    </InputGroupAddon>
  </InputGroup>
</Field>
\`\`\``;

    const tags = extractComponentTagsFromPreviewMarkdown(markdown);
    expect(tags).toContain("Field");
    expect(tags).toContain("InputGroup");
    expect(tags).toContain("InputGroupAddon");
    expect(tags).toContain("SearchIcon");
  });

  test("ignores nopreview astro fences when extracting preview component tags", () => {
    const markdown = `\`\`\`astro nopreview
<Field>
  <InputGroup />
</Field>
\`\`\`

\`\`\`astro
<Button />
\`\`\``;
    const tags = extractComponentTagsFromPreviewMarkdown(markdown);
    expect(tags).toContain("Button");
    expect(tags).not.toContain("Field");
    expect(tags).not.toContain("InputGroup");
  });
});

describe("mdx builder examples rendering", () => {
  test("keeps fenced astro source intact and renders hierarchy for section + item headings", () => {
    const examplesSections = parseExamplesSections(`## Align

Use the align prop.

### inline-start

Use \`align="inline-start"\`.

\`\`\`astro
---
import { SearchIcon } from '@lucide/astro';
import { Field } from '@bejamas/ui/components/field';
---
<Field class="max-w-sm">
  <InputGroup>
    <InputGroupInput />
    <InputGroupAddon align="inline-start">
      <SearchIcon />
    </InputGroupAddon>
  </InputGroup>
</Field>
\`\`\``);

    const mdx = buildMdx({
      importName: "InputGroup",
      importPath: "@bejamas/ui/components/input-group",
      title: "Input Group",
      description: "An input group",
      usageMDX: "",
      hasImport: false,
      propsList: "",
      examples: [],
      examplesSections,
      componentFolderMap: {
        DropdownMenu: "dropdown-menu",
        Field: "field",
        InputGroupAddon: "input-group",
        InputGroupInput: "input-group",
      },
      autoImports: ["DropdownMenu", "Field", "InputGroupAddon", "InputGroupInput"],
      lucideIcons: ["SearchIcon"],
      primaryExampleMDX: "",
      componentSource: "",
      commandName: "input-group",
      componentsAlias: "@bejamas/ui/components",
      namedExports: ["InputGroupAddon", "InputGroupInput"],
      apiMDX: "",
    });

    expect(mdx).toContain("## Examples");
    expect(mdx).toContain("### Align");
    expect(mdx).toContain("#### inline-start");
    expect(mdx).toContain(
      "import { DropdownMenu } from '@bejamas/ui/components/dropdown-menu';",
    );
    expect(mdx).not.toContain(
      "import { DropdownMenu } from '@bejamas/ui/components/dropdown';",
    );

    const sourceMatch = mdx.match(/#### inline-start[\s\S]*?```astro\n([\s\S]*?)\n```/);
    expect(sourceMatch).toBeTruthy();
    expect(sourceMatch![1]).toContain("import { SearchIcon } from '@lucide/astro';");
    expect(sourceMatch![1]).toContain('<Field class="max-w-sm">');
    expect(sourceMatch![1]).not.toContain("sl-bejamas-component-preview");
  });

  test("renders preview for astro fences in usage content", () => {
    const mdx = buildMdx({
      importName: "InputGroup",
      importPath: "@bejamas/ui/components/input-group",
      title: "Input Group",
      description: "An input group",
      usageMDX: `## Align

\`\`\`astro
---
import { SearchIcon } from '@lucide/astro';
---
<Field class="max-w-sm">
  <InputGroup>
    <InputGroupInput />
    <InputGroupAddon>
      <SearchIcon />
    </InputGroupAddon>
  </InputGroup>
</Field>
\`\`\``,
      hasImport: false,
      propsList: "",
      examples: [],
      examplesSections: [],
      componentFolderMap: {
        Field: "field",
        InputGroupAddon: "input-group",
        InputGroupInput: "input-group",
      },
      autoImports: ["Field", "InputGroupAddon", "InputGroupInput"],
      lucideIcons: ["SearchIcon"],
      primaryExampleMDX: "",
      componentSource: "",
      commandName: "input-group",
      componentsAlias: "@bejamas/ui/components",
      namedExports: ["InputGroupAddon", "InputGroupInput"],
      apiMDX: "",
    });

    expect(mdx).toContain("## Usage");
    expect(mdx).toContain("## Align");
    expect(mdx).toContain("sl-bejamas-component-preview");
    expect(mdx).toContain("```astro");
    expect(mdx).toContain('<Field class="max-w-sm">');
  });

  test("skips injected preview for astro fences with nopreview in usage content", () => {
    const mdx = buildMdx({
      importName: "InputGroup",
      importPath: "@bejamas/ui/components/input-group",
      title: "Input Group",
      description: "An input group",
      usageMDX: `\`\`\`astro nocollapse nopreview
<Field class="max-w-sm">
  <InputGroup />
</Field>
\`\`\``,
      hasImport: false,
      propsList: "",
      examples: [],
      examplesSections: [],
      componentFolderMap: {
        Field: "field",
      },
      autoImports: ["Field"],
      lucideIcons: [],
      primaryExampleMDX: "",
      componentSource: "",
      commandName: "input-group",
      componentsAlias: "@bejamas/ui/components",
      namedExports: [],
      apiMDX: "",
    });

    expect(mdx).toContain("## Usage");
    expect(mdx).toContain("```astro nocollapse nopreview");
    expect(mdx).not.toContain("sl-bejamas-component-preview");
  });

  test("strips script tags from injected previews but keeps source fence unchanged", () => {
    const mdx = buildMdx({
      importName: "Popover",
      importPath: "@bejamas/ui/components/popover",
      title: "Popover",
      description: "A popover",
      usageMDX: "",
      hasImport: false,
      propsList: "",
      examples: [],
      examplesSections: [],
      componentFolderMap: {
        Popover: "popover",
        PopoverContent: "popover",
        PopoverTrigger: "popover",
      },
      autoImports: ["PopoverContent", "PopoverTrigger"],
      lucideIcons: [],
      primaryExampleMDX: "",
      componentSource: "",
      commandName: "popover",
      componentsAlias: "@bejamas/ui/components",
      namedExports: ["PopoverContent", "PopoverTrigger"],
      apiMDX: `\`\`\`astro
<Popover id="my-popover">
  <PopoverTrigger variant="outline">Open</PopoverTrigger>
  <PopoverContent>
    <p>Content</p>
  </PopoverContent>
</Popover>
<script>
  const popover = document.getElementById('my-popover');
  popover.addEventListener('popover:change', (e) => {
    console.log('Is open:', e.detail.open);
  });
</script>
\`\`\``,
    });

    expect(mdx).toContain("sl-bejamas-component-preview");
    expect(mdx).toContain("<Popover id=\"my-popover\">");
    expect(mdx).not.toContain(
      "<script> const popover = document.getElementById('my-popover');",
    );

    const sourceMatch = mdx.match(/```astro\n([\s\S]*?)\n```/);
    expect(sourceMatch).toBeTruthy();
    expect(sourceMatch![1]).toContain("popover.addEventListener");
    expect(sourceMatch![1]).toContain("console.log('Is open:', e.detail.open);");
  });

  test("skips example preview when fenced astro block uses nopreview", () => {
    const examplesSections = parseExamplesSections(`### Hidden Preview

\`\`\`astro nopreview
<Popover>
  <PopoverTrigger>Open</PopoverTrigger>
  <PopoverContent>Body</PopoverContent>
</Popover>
\`\`\``);

    const mdx = buildMdx({
      importName: "Popover",
      importPath: "@bejamas/ui/components/popover",
      title: "Popover",
      description: "A popover",
      usageMDX: "",
      hasImport: false,
      propsList: "",
      examples: [],
      examplesSections,
      componentFolderMap: {
        PopoverContent: "popover",
        PopoverTrigger: "popover",
      },
      autoImports: ["PopoverContent", "PopoverTrigger"],
      lucideIcons: [],
      primaryExampleMDX: "",
      componentSource: "",
      commandName: "popover",
      componentsAlias: "@bejamas/ui/components",
      namedExports: ["PopoverContent", "PopoverTrigger"],
      apiMDX: "",
    });

    expect(mdx).toContain("### Hidden Preview");
    expect(mdx).toContain("```astro");
    expect(mdx).not.toContain("sl-bejamas-component-preview");
  });
});
