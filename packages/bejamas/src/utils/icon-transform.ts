import {
  ICON_LIBRARY_COLLECTIONS,
  SEMANTIC_ICON_NAMES,
  getSemanticIconNameFromLucideExport,
  getSemanticIconNameFromLucidePath,
  renderSemanticIconSvgWithAttributeString,
  type IconLibraryName,
  type SemanticIconName,
} from "@bejamas/semantic-icons";

const FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---/;

type IconUsage = {
  localName: string;
  semanticName: ReturnType<typeof getSemanticIconNameFromLucideExport>;
};

export function rewriteAstroIcons(content: string, iconLibrary: string) {
  if (!(iconLibrary in ICON_LIBRARY_COLLECTIONS)) {
    return content;
  }

  const library = iconLibrary as IconLibraryName;
  const shouldRewriteLucideImports = library !== "lucide";
  const frontmatterMatch = content.match(FRONTMATTER_PATTERN);

  if (!frontmatterMatch) {
    return content;
  }

  let frontmatter = frontmatterMatch[1];
  let body = content.slice(frontmatterMatch[0].length);
  const iconUsages: IconUsage[] = [];
  const semanticIconImports: string[] = [];

  if (shouldRewriteLucideImports) {
    frontmatter = frontmatter.replace(
      /^\s*import\s+([A-Za-z0-9_$]+)\s+from\s+["']@lucide\/astro\/icons\/([^"']+)["'];?\s*$/gm,
      (full, localName, iconPath) => {
        const semanticName = getSemanticIconNameFromLucidePath(iconPath);

        if (!semanticName) {
          return full;
        }

        iconUsages.push({ localName, semanticName });
        return "";
      },
    );

    frontmatter = frontmatter.replace(
      /import\s+\{([^}]*)\}\s+from\s+["']@lucide\/astro["'];?/g,
      (full, importsBlock) => {
        const keptImports: string[] = [];

        for (const rawImport of importsBlock.split(",")) {
          const trimmedImport = rawImport.trim();
          if (!trimmedImport) {
            continue;
          }

          const aliasMatch = trimmedImport.match(
            /^([A-Za-z0-9_$]+)(?:\s+as\s+([A-Za-z0-9_$]+))?$/,
          );

          if (!aliasMatch) {
            keptImports.push(trimmedImport);
            continue;
          }

          const [, importedName, localAlias] = aliasMatch;
          const semanticName = getSemanticIconNameFromLucideExport(importedName);

          if (!semanticName) {
            keptImports.push(trimmedImport);
            continue;
          }

          iconUsages.push({
            localName: localAlias ?? importedName,
            semanticName,
          });
        }

        if (!keptImports.length) {
          return "";
        }

        return `import { ${keptImports.join(", ")} } from "@lucide/astro";`;
      },
    );
  }

  frontmatter = frontmatter.replace(
    /^\s*import\s+([A-Za-z0-9_$]+)\s+from\s+["'][^"']*SemanticIcon\.astro["'];?\s*$/gm,
    (_full, localName) => {
      semanticIconImports.push(localName);
      return "";
    },
  );

  if (!iconUsages.length && !semanticIconImports.length) {
    return content;
  }

  for (const { localName, semanticName } of iconUsages.sort(
    (left, right) => right.localName.length - left.localName.length,
  )) {
    const selfClosingPattern = new RegExp(
      `<${localName}(\\s[^>]*?)?\\s*/>`,
      "g",
    );
    const pairedPattern = new RegExp(
      `<${localName}(\\s[^>]*?)?>([\\s\\S]*?)<\\/${localName}>`,
      "g",
    );

    body = body.replace(selfClosingPattern, (_full, attributeString = "") =>
      renderSemanticIconSvgWithAttributeString(
        library,
        semanticName,
        attributeString,
      ),
    );

    body = body.replace(pairedPattern, (_full, attributeString = "") =>
      renderSemanticIconSvgWithAttributeString(
        library,
        semanticName,
        attributeString,
      ),
    );
  }

  for (const localName of semanticIconImports.sort(
    (left, right) => right.length - left.length,
  )) {
    const selfClosingPattern = new RegExp(
      `<${localName}(\\s[^>]*?)?\\s*/>`,
      "g",
    );
    const pairedPattern = new RegExp(
      `<${localName}(\\s[^>]*?)?>([\\s\\S]*?)<\\/${localName}>`,
      "g",
    );

    body = body.replace(selfClosingPattern, (full, attributeString = "") =>
      renderSemanticIconUsage(full, library, attributeString),
    );

    body = body.replace(pairedPattern, (full, attributeString = "") =>
      renderSemanticIconUsage(full, library, attributeString),
    );
  }

  const normalizedFrontmatter = frontmatter
    .split("\n")
    .filter((line, index, lines) => {
      if (line.trim().length > 0) {
        return true;
      }

      const previousLine = lines[index - 1];
      return previousLine?.trim().length > 0;
    })
    .join("\n")
    .trim();

  return `---\n${normalizedFrontmatter}\n---${body}`;
}

function renderSemanticIconUsage(
  original: string,
  library: IconLibraryName,
  attributeString = "",
) {
  const semanticName = attributeString.match(
    /\sname=(["'])([^"']+)\1/,
  )?.[2] as SemanticIconName | undefined;

  if (!semanticName || !SEMANTIC_ICON_NAMES.includes(semanticName)) {
    return original;
  }

  const normalizedAttributeString = attributeString
    .replace(/\sname=(["'])[^"']+\1/g, "")
    .replace(/\slibrary=(["'])[^"']+\1/g, "")
    .replace(/\sdata-icon-library=(["'])[^"']+\1/g, "")
    .trim();

  return renderSemanticIconSvgWithAttributeString(
    library,
    semanticName,
    normalizedAttributeString,
  );
}
