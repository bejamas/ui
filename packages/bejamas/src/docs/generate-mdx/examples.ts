export interface ParsedExampleItem {
  title: string;
  body: string;
}

export interface ParsedExampleSection {
  /**
   * Null means "implicit section" (no explicit ## heading in @examples).
   */
  title: string | null;
  /**
   * Markdown text that appears between a ## section heading and the first ### item.
   * For implicit sections, this is content before the first ### heading.
   */
  introMD: string;
  items: ParsedExampleItem[];
}

export interface PreparedExampleContent {
  descriptionMD: string;
  /**
   * Renderable snippet used in preview (markup only).
   */
  snippet: string;
  /**
   * Source code shown in the code block.
   */
  sourceCode: string;
  /**
   * True when source came from an explicit ```astro fenced block.
   */
  sourceFromFence: boolean;
  /**
   * True when the fenced astro block includes the `nopreview` flag.
   */
  skipPreview: boolean;
}

export interface FenceInfo {
  lang: string;
  flags: Set<string>;
}

type MutableSection = {
  title: string | null;
  intro: string[];
  items: Array<{ title: string; body: string[] }>;
};

type MutableItem = { title: string; body: string[] };

function createImplicitSection(): MutableSection {
  return { title: null, intro: [], items: [] };
}

function normalizeSection(section: MutableSection): ParsedExampleSection {
  return {
    title: section.title,
    introMD: section.intro.join("\n").trim(),
    items: section.items.map((item) => ({
      title: item.title,
      body: item.body.join("\n").trim(),
    })),
  };
}

function pushItem(section: MutableSection | null, item: MutableItem | null): void {
  if (!section || !item) return;
  if (!item.title.trim().length && !item.body.join("\n").trim().length) return;
  section.items.push(item);
}

function pushSection(
  sections: ParsedExampleSection[],
  section: MutableSection | null,
): void {
  if (!section) return;
  const normalized = normalizeSection(section);
  if (
    !normalized.title &&
    !normalized.introMD.length &&
    normalized.items.length === 0
  ) {
    return;
  }
  sections.push(normalized);
}

function extractHeading(line: string, level: 2 | 3): string | null {
  const pattern = level === 2 ? /^##(?!#)\s+(.+)$/ : /^###(?!#)\s+(.+)$/;
  const match = line.trim().match(pattern);
  return match ? match[1].trim() : null;
}

function splitDescriptionAndSnippetRaw(body: string): {
  descriptionMD: string;
  snippet: string;
} {
  if (!body || !body.trim().length) return { descriptionMD: "", snippet: "" };
  const lines = body.split("\n");
  let snippetStartIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const ln = lines[i];
    if (!ln.trim().length) continue;
    if (/^\s*[<{]/.test(ln)) {
      snippetStartIdx = i;
      break;
    }
  }
  if (snippetStartIdx <= 0) {
    return { descriptionMD: "", snippet: body.trim() };
  }
  return {
    descriptionMD: lines.slice(0, snippetStartIdx).join("\n").trim(),
    snippet: lines.slice(snippetStartIdx).join("\n").trim(),
  };
}

function splitAstroFrontmatter(sourceCode: string): {
  frontmatter: string;
  markup: string;
} {
  const match = sourceCode.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: "", markup: sourceCode.trim() };
  }
  return {
    frontmatter: match[1].trim(),
    markup: match[2].trim(),
  };
}

export function parseFenceInfo(infoRaw: string): FenceInfo {
  const parts = (infoRaw || "")
    .trim()
    .split(/\s+/)
    .filter((v) => v.length)
    .map((v) => v.toLowerCase());
  if (!parts.length) return { lang: "", flags: new Set<string>() };
  const [lang, ...flags] = parts;
  return { lang, flags: new Set(flags) };
}

function extractFirstAstroFence(body: string): {
  sourceCode: string;
  descriptionMD: string;
  skipPreview: boolean;
} | null {
  if (!body || !body.trim().length) return null;
  const lines = body.split("\n");
  const outside: string[] = [];
  const astroCode: string[] = [];
  let inFence = false;
  let currentFenceIsAstro = false;
  let currentFenceSkipPreview = false;
  let capturedSkipPreview = false;
  let capturedAstro = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      if (!inFence) {
        inFence = true;
        const parsed = parseFenceInfo(trimmed.slice(3).trim());
        currentFenceIsAstro = parsed.lang === "astro";
        currentFenceSkipPreview = parsed.flags.has("nopreview");
        if (!currentFenceIsAstro || capturedAstro) {
          outside.push(line);
        }
        continue;
      }
      if (currentFenceIsAstro && !capturedAstro) {
        capturedAstro = true;
        capturedSkipPreview = currentFenceSkipPreview;
      } else {
        outside.push(line);
      }
      inFence = false;
      currentFenceIsAstro = false;
      currentFenceSkipPreview = false;
      continue;
    }

    if (inFence && currentFenceIsAstro && !capturedAstro) {
      astroCode.push(line);
      continue;
    }

    outside.push(line);
  }

  if (!capturedAstro) return null;
  return {
    sourceCode: astroCode.join("\n").trim(),
    descriptionMD: outside.join("\n").trim(),
    skipPreview: capturedSkipPreview,
  };
}

export function parseExamplesSections(examplesMDX: string): ParsedExampleSection[] {
  if (!examplesMDX || !examplesMDX.trim().length) return [];

  const sections: ParsedExampleSection[] = [];
  const lines = examplesMDX.split("\n");
  let currentSection: MutableSection | null = null;
  let currentItem: MutableItem | null = null;
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      if (!currentSection) currentSection = createImplicitSection();
      if (currentItem) currentItem.body.push(line);
      else currentSection.intro.push(line);
      continue;
    }

    if (!inFence) {
      const h2 = extractHeading(line, 2);
      if (h2) {
        pushItem(currentSection, currentItem);
        currentItem = null;
        pushSection(sections, currentSection);
        currentSection = { title: h2, intro: [], items: [] };
        continue;
      }

      const h3 = extractHeading(line, 3);
      if (h3) {
        if (!currentSection) currentSection = createImplicitSection();
        pushItem(currentSection, currentItem);
        currentItem = { title: h3, body: [] };
        continue;
      }
    }

    if (!currentSection) currentSection = createImplicitSection();
    if (currentItem) currentItem.body.push(line);
    else currentSection.intro.push(line);
  }

  pushItem(currentSection, currentItem);
  pushSection(sections, currentSection);
  return sections;
}

export function prepareExampleContent(body: string): PreparedExampleContent {
  if (!body || !body.trim().length) {
    return {
      descriptionMD: "",
      snippet: "",
      sourceCode: "",
      sourceFromFence: false,
      skipPreview: false,
    };
  }

  const fenced = extractFirstAstroFence(body);
  if (fenced) {
    const { markup } = splitAstroFrontmatter(fenced.sourceCode);
    return {
      descriptionMD: fenced.descriptionMD,
      snippet: markup,
      sourceCode: fenced.sourceCode,
      sourceFromFence: true,
      skipPreview: fenced.skipPreview,
    };
  }

  const split = splitDescriptionAndSnippetRaw(body);
  return {
    descriptionMD: split.descriptionMD,
    snippet: split.snippet,
    sourceCode: split.snippet,
    sourceFromFence: false,
    skipPreview: false,
  };
}

function extractTags(block: string): string[] {
  if (!block || !block.length) return [];
  const found = new Set<string>();
  const tagRegex = /<([A-Z][A-Za-z0-9_]*)\b/g;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(block)) !== null) {
    found.add(match[1]);
  }
  return Array.from(found);
}

export function extractComponentTagsFromPreviewMarkdown(block: string): string[] {
  if (!block || !block.length) return [];
  const found = new Set<string>();
  const lines = block.split("\n");
  let inFence = false;
  let currentFenceLang = "";
  let currentFenceFlags = new Set<string>();
  const fenceBody: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      if (!inFence) {
        inFence = true;
        const parsed = parseFenceInfo(trimmed.slice(3).trim());
        currentFenceLang = parsed.lang;
        currentFenceFlags = parsed.flags;
        fenceBody.length = 0;
        continue;
      }

      if (currentFenceLang === "astro" && !currentFenceFlags.has("nopreview")) {
        const sourceCode = fenceBody.join("\n").trim();
        const { markup } = splitAstroFrontmatter(sourceCode);
        for (const tag of extractTags(markup)) found.add(tag);
      }

      inFence = false;
      currentFenceLang = "";
      currentFenceFlags = new Set<string>();
      fenceBody.length = 0;
      continue;
    }

    if (inFence) {
      fenceBody.push(line);
      continue;
    }

    for (const tag of extractTags(line)) found.add(tag);
  }

  return Array.from(found);
}

export function extractComponentTagsFromExamplesSections(
  sections: ParsedExampleSection[],
): string[] {
  if (!sections?.length) return [];
  const found = new Set<string>();
  for (const section of sections) {
    for (const tag of extractComponentTagsFromPreviewMarkdown(section.introMD)) {
      found.add(tag);
    }
    for (const item of section.items) {
      const prepared = prepareExampleContent(item.body);
      if (prepared.skipPreview) continue;
      for (const tag of extractTags(prepared.snippet)) found.add(tag);
    }
  }
  return Array.from(found);
}
