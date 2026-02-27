import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  readTsConfig,
  resolveAliasPathUsingTsConfig,
} from "../src/utils/tsconfig-utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fixture directory for test tsconfig files
const fixturesDir = path.resolve(__dirname, "fixtures/tsconfig-utils");

describe("readTsConfig", () => {
  beforeAll(() => {
    fs.mkdirSync(fixturesDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(fixturesDir, { recursive: true, force: true });
  });

  test("returns null when tsconfig.json does not exist", () => {
    const result = readTsConfig(path.join(fixturesDir, "nonexistent"));
    expect(result).toBeNull();
  });

  test("returns null for invalid JSON", () => {
    const invalidDir = path.join(fixturesDir, "invalid-json");
    fs.mkdirSync(invalidDir, { recursive: true });
    fs.writeFileSync(
      path.join(invalidDir, "tsconfig.json"),
      "{ invalid json }",
    );

    const result = readTsConfig(invalidDir);
    expect(result).toBeNull();
  });

  test("parses valid tsconfig.json", () => {
    const validDir = path.join(fixturesDir, "valid");
    fs.mkdirSync(validDir, { recursive: true });
    fs.writeFileSync(
      path.join(validDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["src/*"],
          },
        },
      }),
    );

    const result = readTsConfig(validDir);
    expect(result).not.toBeNull();
    expect(result.compilerOptions).toBeDefined();
    expect(result.compilerOptions.paths).toEqual({ "@/*": ["src/*"] });
  });
});

describe("resolveAliasPathUsingTsConfig", () => {
  const aliasFixturesDir = path.resolve(__dirname, "fixtures/tsconfig-alias");
  const testDir = path.join(aliasFixturesDir, "alias-test");

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(
      path.join(testDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["src/*"],
            "@components/*": ["src/components/*"],
            "@ui": ["packages/ui"],
          },
        },
      }),
    );
  });

  afterAll(() => {
    fs.rmSync(aliasFixturesDir, { recursive: true, force: true });
  });

  test("returns null when tsconfig has no compilerOptions", () => {
    const noOptionsDir = path.join(aliasFixturesDir, "no-options");
    fs.mkdirSync(noOptionsDir, { recursive: true });
    fs.writeFileSync(
      path.join(noOptionsDir, "tsconfig.json"),
      JSON.stringify({}),
    );

    const result = resolveAliasPathUsingTsConfig("@/lib/utils", noOptionsDir);
    expect(result).toBeNull();
  });

  test("returns null when path does not match any alias", () => {
    const result = resolveAliasPathUsingTsConfig("some/random/path", testDir);
    expect(result).toBeNull();
  });

  test("resolves @/* alias pattern", () => {
    const result = resolveAliasPathUsingTsConfig("@/lib/utils", testDir);
    expect(result).toBe(path.resolve(testDir, "src/lib/utils"));
  });

  test("resolves @components/* alias pattern", () => {
    const result = resolveAliasPathUsingTsConfig("@components/Button", testDir);
    expect(result).toBe(path.resolve(testDir, "src/components/Button"));
  });

  test("resolves exact alias without wildcard", () => {
    const result = resolveAliasPathUsingTsConfig("@ui", testDir);
    expect(result).toBe(path.resolve(testDir, "packages/ui"));
  });

  test("handles paths as array", () => {
    const arrayDir = path.join(aliasFixturesDir, "array-paths");
    fs.mkdirSync(arrayDir, { recursive: true });
    fs.writeFileSync(
      path.join(arrayDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["src/*", "lib/*"],
          },
        },
      }),
    );

    // Should use the first path in the array
    const result = resolveAliasPathUsingTsConfig("@/utils", arrayDir);
    expect(result).toBe(path.resolve(arrayDir, "src/utils"));
  });

  test("handles custom baseUrl", () => {
    const customBaseDir = path.join(aliasFixturesDir, "custom-base");
    fs.mkdirSync(customBaseDir, { recursive: true });
    fs.writeFileSync(
      path.join(customBaseDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: "./src",
          paths: {
            "@/*": ["*"],
          },
        },
      }),
    );

    const result = resolveAliasPathUsingTsConfig("@/components", customBaseDir);
    expect(result).toBe(path.resolve(customBaseDir, "src/components"));
  });
});
