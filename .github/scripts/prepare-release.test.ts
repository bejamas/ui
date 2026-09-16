import { describe, expect, test } from "bun:test";
import {
  prepareManifest,
  validatePackedManifest,
  type Manifest,
} from "./prepare-release";

const icons = { name: "@bejamas/semantic-icons", version: "0.1.0" };
const privateTool = {
  name: "@bejamas/create-config",
  version: "0.1.0",
  private: true,
};
const workspace = new Map([icons, privateTool].map((pkg) => [pkg.name, pkg]));
const theme: Manifest = {
  name: "theme",
  version: "0.2.1",
  dependencies: { [icons.name]: "workspace:*" },
};

describe("release manifests", () => {
  test("materializes stable runtime dependencies without mutating the source", () => {
    expect(prepareManifest(theme, workspace).dependencies?.[icons.name]).toBe(
      "0.1.0",
    );
    expect(theme.dependencies?.[icons.name]).toBe("workspace:*");
  });
  test("uses the same canary version as the dependency", () => {
    const canary = new Map([
      [icons.name, { ...icons, version: "0.0.0-canary.abc123" }],
    ]);
    expect(prepareManifest(theme, canary).dependencies?.[icons.name]).toBe(
      "0.0.0-canary.abc123",
    );
  });
  test("rejects private runtime dependencies, including concrete versions", () => {
    for (const range of ["workspace:*", "0.1.0"]) {
      expect(() =>
        prepareManifest(
          { ...theme, dependencies: { [privateTool.name]: range } },
          workspace,
        ),
      ).toThrow("private package");
    }
  });
  test("omits private bundled build tools", () => {
    expect(
      prepareManifest(
        { ...theme, devDependencies: { [privateTool.name]: "workspace:*" } },
        workspace,
      ).devDependencies,
    ).toEqual({});
  });
  test("rejects a workspace protocol leaked into an actual packed manifest", () => {
    expect(() => validatePackedManifest(theme, workspace)).toThrow(
      "still contains workspace:*",
    );
    expect(() =>
      validatePackedManifest(prepareManifest(theme, workspace), workspace),
    ).not.toThrow();
  });
  test("rejects unknown workspace packages", () => {
    expect(() => prepareManifest(theme, new Map())).toThrow(
      "unknown workspace dependency",
    );
  });
});
