export const CREATE_DOCS_ROOT_ATTRIBUTE = "data-create-docs-themed";
export const CREATE_DOCS_ROOT_STYLE_ATTRIBUTE = "data-create-docs-style";

export interface CreateDocsStyleRoot {
  classList: {
    add: (...tokens: string[]) => void;
    remove: (...tokens: string[]) => void;
  };
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
}

export function getCreateStyleClass(style: string) {
  return `style-${style}`;
}

export function applyCreateDocsRootState(
  root: CreateDocsStyleRoot,
  style: string,
) {
  const nextStyleClass = getCreateStyleClass(style);
  const previousStyleClass = root.getAttribute(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE);

  if (previousStyleClass && previousStyleClass !== nextStyleClass) {
    root.classList.remove(previousStyleClass);
  }

  root.setAttribute(CREATE_DOCS_ROOT_ATTRIBUTE, "");
  root.setAttribute(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE, nextStyleClass);
  root.classList.add(nextStyleClass);
}

export function cleanupCreateDocsRootState(root: CreateDocsStyleRoot) {
  const previousStyleClass = root.getAttribute(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE);

  if (previousStyleClass) {
    root.classList.remove(previousStyleClass);
  }

  root.removeAttribute(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE);
  root.removeAttribute(CREATE_DOCS_ROOT_ATTRIBUTE);
}

export function buildCreateDocsRootInitScript(style: string) {
  return `(function () {
  const rootAttribute = ${JSON.stringify(CREATE_DOCS_ROOT_ATTRIBUTE)};
  const rootStyleAttribute = ${JSON.stringify(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE)};
  const nextStyleClass = ${JSON.stringify(getCreateStyleClass(style))};
  const root = document.documentElement;
  const previousStyleClass = root.getAttribute(rootStyleAttribute);

  if (previousStyleClass && previousStyleClass !== nextStyleClass) {
    root.classList.remove(previousStyleClass);
  }

  root.setAttribute(rootAttribute, "");
  root.setAttribute(rootStyleAttribute, nextStyleClass);
  root.classList.add(nextStyleClass);
})();`;
}
