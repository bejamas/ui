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
  /**
   * True when the fenced astro block includes the `console` flag.
   */
  enableConsolePanel: boolean;
  /**
   * Explicit console scripts sourced from an adjacent JS/TS fence.
   */
  consoleScripts: string[];
  /**
   * Raw markdown for a paired source fence that should render after the astro block.
   */
  companionSourceMD: string;
  /**
   * Markdown that appears between the astro fence and its paired JS/TS fence.
   */
  companionIntroMD: string;
  /**
   * Markdown that appears after a paired JS/TS fence.
   */
  trailingDescriptionMD: string;
  /**
   * True when the paired JS/TS fence had no prose between it and the astro fence.
   */
  mergeCompanionWithSource: boolean;
}

export interface FenceInfo {
  lang: string;
  flags: Set<string>;
}

interface PreviewRenderConfig {
  defaultPreview?: boolean;
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

function stripFrontmatterComments(frontmatter: string): string {
  if (!frontmatter || !frontmatter.length) return "";
  return frontmatter
    .replace(/\/\*[\s\S]*?\*\//g, "\n")
    .replace(/^[ \t]*\/\/.*$/gm, "")
    .trim();
}

function isImportOnlyFrontmatter(frontmatter: string): boolean {
  const cleaned = stripFrontmatterComments(frontmatter);
  if (!cleaned.length) return true;

  let remaining = cleaned;
  const importFromPattern =
    /(?:^|\n)\s*import\s+(?:type\s+)?[\s\S]*?\s+from\s+['"][^'"]+['"]\s*;?(?=\n|$)/g;
  const importSideEffectPattern =
    /(?:^|\n)\s*import\s+['"][^'"]+['"]\s*;?(?=\n|$)/g;
  const exportFromPattern =
    /(?:^|\n)\s*export\s+(?:\*\s+from|\{[\s\S]*?\}\s+from)\s+['"][^'"]+['"]\s*;?(?=\n|$)/g;

  remaining = remaining
    .replace(importFromPattern, "\n")
    .replace(importSideEffectPattern, "\n")
    .replace(exportFromPattern, "\n")
    .trim();

  return remaining.replace(/[;\s]/g, "").length === 0;
}

function isAstroFrontmatterPreviewUnsafe(frontmatter: string): boolean {
  const cleaned = stripFrontmatterComments(frontmatter);
  if (!cleaned.length) return false;

  const runtimeTokenPattern =
    /\b(?:const|let|var|function|class|if|for|while|switch|try|catch|return|throw|await|new)\b|=>|Astro\./;
  if (runtimeTokenPattern.test(cleaned)) return true;

  return !isImportOnlyFrontmatter(cleaned);
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

export function decodeEscapedScriptTags(source: string): string {
  if (!source || !source.length) return source;
  return source
    .replace(/&lt;script&gt;/gi, "<script>")
    .replace(/&lt;\/script&gt;/gi, "</script>");
}

type ParsedFenceBlock = {
  openLine: string;
  closeLine: string;
  lang: string;
  flags: Set<string>;
  body: string;
  startLine: number;
  endLine: number;
};

const CONSOLE_SCRIPT_FENCE_LANGS = new Set([
  "js",
  "ts",
  "javascript",
  "typescript",
]);

function parseFenceBlocks(body: string): {
  lines: string[];
  fences: ParsedFenceBlock[];
} {
  const lines = body.split("\n");
  const fences: ParsedFenceBlock[] = [];
  let active:
    | {
        startLine: number;
        openLine: string;
        lang: string;
        flags: Set<string>;
        bodyLines: string[];
      }
    | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed.startsWith("```")) {
      if (active) active.bodyLines.push(line);
      continue;
    }

    if (!active) {
      const parsed = parseFenceInfo(trimmed.slice(3).trim());
      active = {
        startLine: i,
        openLine: line,
        lang: parsed.lang,
        flags: parsed.flags,
        bodyLines: [],
      };
      continue;
    }

    fences.push({
      openLine: active.openLine,
      closeLine: line,
      lang: active.lang,
      flags: active.flags,
      body: active.bodyLines.join("\n"),
      startLine: active.startLine,
      endLine: i,
    });
    active = null;
  }

  return { lines, fences };
}

function serializeFenceBlock(fence: ParsedFenceBlock): string {
  const parts = [fence.openLine];
  if (fence.body.length) parts.push(fence.body);
  parts.push(fence.closeLine);
  return parts.join("\n");
}

function buildRemainingMarkdown(
  lines: string[],
  fences: ParsedFenceBlock[],
  consumedFenceIndexes: Set<number>,
): string {
  const skippedLines = new Set<number>();
  for (const [index, fence] of fences.entries()) {
    if (!consumedFenceIndexes.has(index)) continue;
    for (let line = fence.startLine; line <= fence.endLine; line += 1) {
      skippedLines.add(line);
    }
  }

  return lines
    .filter((_, index) => !skippedLines.has(index))
    .join("\n")
    .trim();
}

function extractFirstAstroFence(body: string): {
  sourceCode: string;
  descriptionMD: string;
  skipPreview: boolean;
  enableConsolePanel: boolean;
  consoleScripts: string[];
  companionSourceMD: string;
  companionIntroMD: string;
  trailingDescriptionMD: string;
  mergeCompanionWithSource: boolean;
} | null {
  if (!body || !body.trim().length) return null;
  const { lines, fences } = parseFenceBlocks(body);
  const astroFenceIndex = fences.findIndex((fence) => fence.lang === "astro");
  if (astroFenceIndex === -1) return null;

  const astroFence = fences[astroFenceIndex];
  const consumedFenceIndexes = new Set<number>([astroFenceIndex]);
  let companionSourceMD = "";
  let consoleScripts: string[] = [];
  let companionIntroMD = "";
  let trailingDescriptionMD = "";
  let mergeCompanionWithSource = false;

  if (astroFence.flags.has("console")) {
    const nextFence = fences[astroFenceIndex + 1];
    if (nextFence && CONSOLE_SCRIPT_FENCE_LANGS.has(nextFence.lang)) {
      consumedFenceIndexes.add(astroFenceIndex + 1);
      companionSourceMD = serializeFenceBlock(nextFence);
      companionIntroMD = lines
        .slice(astroFence.endLine + 1, nextFence.startLine)
        .join("\n")
        .trim();
      trailingDescriptionMD = lines.slice(nextFence.endLine + 1).join("\n").trim();
      mergeCompanionWithSource = companionIntroMD.length === 0;
      const normalizedScript = nextFence.body.trim();
      if (normalizedScript.length) {
        consoleScripts = [normalizedScript];
      }
    }
  }

  const descriptionMD = companionSourceMD.length
    ? lines.slice(0, astroFence.startLine).join("\n").trim()
    : buildRemainingMarkdown(lines, fences, consumedFenceIndexes);

  return {
    sourceCode: decodeEscapedScriptTags(astroFence.body.trim()),
    descriptionMD,
    skipPreview: astroFence.flags.has("nopreview"),
    enableConsolePanel: astroFence.flags.has("console"),
    consoleScripts,
    companionSourceMD,
    companionIntroMD,
    trailingDescriptionMD,
    mergeCompanionWithSource,
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
      enableConsolePanel: false,
      consoleScripts: [],
      companionSourceMD: "",
      companionIntroMD: "",
      trailingDescriptionMD: "",
      mergeCompanionWithSource: false,
    };
  }

  const fenced = extractFirstAstroFence(body);
  if (fenced) {
    const { frontmatter, markup } = splitAstroFrontmatter(fenced.sourceCode);
    const unsafeFrontmatter = isAstroFrontmatterPreviewUnsafe(frontmatter);
    return {
      descriptionMD: fenced.descriptionMD,
      snippet: markup,
      sourceCode: fenced.sourceCode,
      sourceFromFence: true,
      skipPreview: fenced.skipPreview || unsafeFrontmatter,
      enableConsolePanel: fenced.enableConsolePanel,
      consoleScripts: fenced.consoleScripts,
      companionSourceMD: fenced.companionSourceMD,
      companionIntroMD: fenced.companionIntroMD,
      trailingDescriptionMD: fenced.trailingDescriptionMD,
      mergeCompanionWithSource: fenced.mergeCompanionWithSource,
    };
  }

  const split = splitDescriptionAndSnippetRaw(body);
  return {
    descriptionMD: split.descriptionMD,
    snippet: split.snippet,
    sourceCode: split.snippet,
    sourceFromFence: false,
    skipPreview: false,
    enableConsolePanel: false,
    consoleScripts: [],
    companionSourceMD: "",
    companionIntroMD: "",
    trailingDescriptionMD: "",
    mergeCompanionWithSource: false,
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

export function extractComponentTagsFromPreviewMarkdown(
  block: string,
  config: PreviewRenderConfig = {},
): string[] {
  if (!block || !block.length) return [];
  const { defaultPreview = true } = config;
  const found = new Set<string>();
  const lines = block.split("\n");
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

      if (currentFenceLang === "astro") {
        const sourceCode = fenceBody.join("\n").trim();
        const prepared = prepareExampleContent(
          `${fenceOpen}\n${sourceCode}\n${line}`,
        );
        const hasForcedPreviewFlag =
          currentFenceFlags.has("preview") || currentFenceFlags.has("console");
        const shouldPreview =
          !prepared.skipPreview && (defaultPreview || hasForcedPreviewFlag);
        if (shouldPreview) {
          for (const tag of extractTags(prepared.snippet)) found.add(tag);
        }
      }

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
