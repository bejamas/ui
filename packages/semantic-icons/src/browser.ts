import {
  renderSemanticIconSvg,
  type IconLibraryName,
  type SemanticIconName,
} from "./index.ts";

export const SEMANTIC_ICON_SELECTOR = "[data-semantic-icon]";

export function syncSemanticIconsInRoot(
  root: ParentNode,
  iconLibrary: IconLibraryName,
) {
  const icons = Array.from(root.querySelectorAll<SVGElement>(SEMANTIC_ICON_SELECTOR));

  for (const icon of icons) {
    const semanticName = icon.dataset.semanticIcon as SemanticIconName | undefined;

    if (!semanticName) {
      continue;
    }

    const attributes: Record<string, string | true> = {};

    for (const attributeName of icon.getAttributeNames()) {
      if (attributeName === "xmlns" || attributeName === "viewBox") {
        continue;
      }

      if (attributeName === "data-icon-library") {
        attributes[attributeName] = iconLibrary;
        continue;
      }

      const attributeValue = icon.getAttribute(attributeName);

      if (attributeValue === "") {
        attributes[attributeName] = true;
      } else if (attributeValue) {
        attributes[attributeName] = attributeValue;
      }
    }

    icon.outerHTML = renderSemanticIconSvg(iconLibrary, semanticName, attributes);
  }
}
