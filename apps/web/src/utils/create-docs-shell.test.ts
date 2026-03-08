import { describe, expect, it } from "bun:test";
import {
  CREATE_DOCS_ROOT_ATTRIBUTE,
  CREATE_DOCS_ROOT_STYLE_ATTRIBUTE,
  applyCreateDocsRootState,
  buildCreateDocsRootInitScript,
  cleanupCreateDocsRootState,
  getCreateStyleClass,
} from "./create-docs-shell";

function createMockRoot() {
  const attributes = new Map<string, string>();
  const classes = new Set<string>();

  return {
    attributes,
    classes,
    root: {
      classList: {
        add: (...tokens: string[]) => {
          for (const token of tokens) {
            classes.add(token);
          }
        },
        remove: (...tokens: string[]) => {
          for (const token of tokens) {
            classes.delete(token);
          }
        },
      },
      getAttribute: (name: string) => attributes.get(name) ?? null,
      setAttribute: (name: string, value: string) => {
        attributes.set(name, value);
      },
      removeAttribute: (name: string) => {
        attributes.delete(name);
      },
    },
  };
}

describe("create docs shell helpers", () => {
  it("applies the route marker and active style class to the root host", () => {
    const { root, classes, attributes } = createMockRoot();

    applyCreateDocsRootState(root, "nova");

    expect(classes.has("style-nova")).toBe(true);
    expect(attributes.get(CREATE_DOCS_ROOT_ATTRIBUTE)).toBe("");
    expect(attributes.get(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE)).toBe("style-nova");
  });

  it("replaces the previous create style class when the selection changes", () => {
    const { root, classes } = createMockRoot();

    applyCreateDocsRootState(root, "nova");
    applyCreateDocsRootState(root, "vega");

    expect(classes.has("style-nova")).toBe(false);
    expect(classes.has("style-vega")).toBe(true);
  });

  it("cleans up the route marker and style class", () => {
    const { root, classes, attributes } = createMockRoot();

    applyCreateDocsRootState(root, "lyra");
    cleanupCreateDocsRootState(root);

    expect(classes.has("style-lyra")).toBe(false);
    expect(attributes.has(CREATE_DOCS_ROOT_ATTRIBUTE)).toBe(false);
    expect(attributes.has(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE)).toBe(false);
  });

  it("builds an init script that tags the route root with the selected style", () => {
    const script = buildCreateDocsRootInitScript("bejamas");

    expect(script).toContain(CREATE_DOCS_ROOT_ATTRIBUTE);
    expect(script).toContain(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE);
    expect(script).toContain(getCreateStyleClass("bejamas"));
  });
});
