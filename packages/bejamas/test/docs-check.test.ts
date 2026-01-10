import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageDir = path.resolve(__dirname, "..");
const cliEntry = path.resolve(packageDir, "dist/index.js");

// Fixture directory for test components
const fixturesDir = path.resolve(__dirname, "fixtures/docs-check");
const componentsDir = path.resolve(fixturesDir, "src/components");

async function runCli(args: string[], cwd?: string) {
  const proc = Bun.spawn(["bun", cliEntry, ...args], {
    cwd: cwd || packageDir,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      BEJAMAS_UI_ROOT: fixturesDir,
      // Disable colors for easier testing
      NO_COLOR: "1",
      FORCE_COLOR: "0",
    },
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
}

// Sample component with complete documentation
const COMPLETE_COMPONENT = `---
/**
 * @component CompleteButton
 * @title Complete Button
 * @description A fully documented button component.
 * @figmaUrl https://figma.com/example
 *
 * @preview
 * <CompleteButton>Click me</CompleteButton>
 *
 * @usage
 * \`\`\`astro
 * <CompleteButton>Click me</CompleteButton>
 * \`\`\`
 *
 * @examples
 * ### Default
 * <CompleteButton>Default</CompleteButton>
 */

interface Props {
  variant?: string;
}

const { variant = "default" } = Astro.props;
---

<button class={variant}>
  <slot />
</button>
`;

// Sample component with incomplete documentation (missing recommended fields)
const INCOMPLETE_COMPONENT = `---
/**
 * @component IncompleteCard
 * @title Incomplete Card
 * @description A card component missing some recommended fields.
 *
 * @preview
 * <IncompleteCard>Content</IncompleteCard>
 */

interface Props {
  title?: string;
}

const { title } = Astro.props;
---

<div class="card">
  <slot />
</div>
`;

// Sample component with missing required documentation
const MISSING_DOCS_COMPONENT = `---
/**
 * Just a component without proper JSDoc tags
 */

interface Props {
  value?: string;
}

const { value } = Astro.props;
---

<span>{value}</span>
`;

// Sample component with partial required fields
const PARTIAL_REQUIRED_COMPONENT = `---
/**
 * @component PartialInput
 * @title Partial Input
 */

interface Props {
  type?: string;
}

const { type = "text" } = Astro.props;
---

<input type={type} />
`;

describe("docs:check command", () => {
  beforeAll(() => {
    // Create fixtures directory structure
    fs.mkdirSync(componentsDir, { recursive: true });

    // Create package.json for the fixture
    fs.writeFileSync(
      path.resolve(fixturesDir, "package.json"),
      JSON.stringify({ name: "test-ui", version: "1.0.0" }, null, 2),
    );

    // Write test component files
    fs.writeFileSync(
      path.resolve(componentsDir, "CompleteButton.astro"),
      COMPLETE_COMPONENT,
    );
    fs.writeFileSync(
      path.resolve(componentsDir, "IncompleteCard.astro"),
      INCOMPLETE_COMPONENT,
    );
    fs.writeFileSync(
      path.resolve(componentsDir, "MissingDocs.astro"),
      MISSING_DOCS_COMPONENT,
    );
    fs.writeFileSync(
      path.resolve(componentsDir, "PartialInput.astro"),
      PARTIAL_REQUIRED_COMPONENT,
    );
  });

  afterAll(() => {
    // Clean up fixtures
    fs.rmSync(fixturesDir, { recursive: true, force: true });
  });

  test("shows help with docs:check --help", async () => {
    const { stdout, stderr, exitCode } = await runCli(["docs:check", "--help"]);
    expect(exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("docs:check");
    expect(stdout).toContain("--cwd");
    expect(stdout).toContain("--json");
  });

  test("outputs formatted report by default", async () => {
    const { stdout, exitCode } = await runCli(["docs:check"]);

    // Should exit with 1 because there are components missing required docs
    expect(exitCode).toBe(1);

    // Check for section headers
    expect(stdout).toContain("docs:check");
    expect(stdout).toContain("Component Documentation Status");
    expect(stdout).toContain("Summary:");

    // Check for complete component
    expect(stdout).toContain("Complete");
    expect(stdout).toContain("CompleteButton");

    // Check for incomplete component
    expect(stdout).toContain("Incomplete");
    expect(stdout).toContain("IncompleteCard");

    // Check for missing docs component
    expect(stdout).toContain("Missing Docs");
    expect(stdout).toContain("MissingDocs");
  });

  test("outputs JSON with --json flag", async () => {
    const { stdout, exitCode } = await runCli(["docs:check", "--json"]);

    // Should exit with 1 when there are missing docs (for CI integration)
    expect(exitCode).toBe(1);

    const result = JSON.parse(stdout);

    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("complete");
    expect(result).toHaveProperty("incomplete");
    expect(result).toHaveProperty("missing");

    expect(result.total).toBe(4);
    expect(Array.isArray(result.complete)).toBe(true);
    expect(Array.isArray(result.incomplete)).toBe(true);
    expect(Array.isArray(result.missing)).toBe(true);
  });

  test("JSON output contains correct component categorization", async () => {
    const { stdout } = await runCli(["docs:check", "--json"]);
    const result = JSON.parse(stdout);

    // Complete component should be in complete array
    const completeNames = result.complete.map((c: any) => c.name);
    expect(completeNames).toContain("CompleteButton");

    // Incomplete component should be in incomplete array
    const incompleteNames = result.incomplete.map((c: any) => c.name);
    expect(incompleteNames).toContain("IncompleteCard");

    // Missing docs components should be in missing array
    const missingNames = result.missing.map((c: any) => c.name);
    expect(missingNames).toContain("MissingDocs");
    expect(missingNames).toContain("PartialInput");
  });

  test("JSON output includes missing field details", async () => {
    const { stdout } = await runCli(["docs:check", "--json"]);
    const result = JSON.parse(stdout);

    // Find the incomplete component
    const incompleteCard = result.incomplete.find(
      (c: any) => c.name === "IncompleteCard",
    );
    expect(incompleteCard).toBeDefined();
    expect(incompleteCard.missingRecommended).toContain("@usage");
    expect(incompleteCard.missingRecommended).toContain("@figmaUrl");

    // Find the missing docs component
    const missingDocs = result.missing.find(
      (c: any) => c.name === "MissingDocs",
    );
    expect(missingDocs).toBeDefined();
    expect(missingDocs.missingRequired).toContain("@component");
    expect(missingDocs.missingRequired).toContain("@title");
    expect(missingDocs.missingRequired).toContain("@description");
  });

  test("detects missing @description field", async () => {
    const { stdout } = await runCli(["docs:check", "--json"]);
    const result = JSON.parse(stdout);

    const partialInput = result.missing.find(
      (c: any) => c.name === "PartialInput",
    );
    expect(partialInput).toBeDefined();
    expect(partialInput.missingRequired).toContain("@description");
  });

  test("formatted output shows @ tags for missing fields", async () => {
    const { stdout } = await runCli(["docs:check"]);

    // Check that @ tags are mentioned in the output
    expect(stdout).toMatch(/@usage|@figmaUrl|@component|@title|@description/);
  });

  test("exits with code 1 when components have missing required docs", async () => {
    const { exitCode } = await runCli(["docs:check"]);
    expect(exitCode).toBe(1);
  });

  test("respects --cwd option", async () => {
    const { stdout, exitCode } = await runCli([
      "docs:check",
      "--cwd",
      fixturesDir,
      "--json",
    ]);

    // Should exit with 1 because fixtures have missing docs
    expect(exitCode).toBe(1);

    const result = JSON.parse(stdout);
    expect(result.total).toBe(4);
  });
});

describe("docs:check with all complete components", () => {
  const allCompleteFixturesDir = path.resolve(
    __dirname,
    "fixtures/docs-check-complete",
  );
  const allCompleteComponentsDir = path.resolve(
    allCompleteFixturesDir,
    "src/components",
  );

  beforeAll(() => {
    fs.mkdirSync(allCompleteComponentsDir, { recursive: true });
    fs.writeFileSync(
      path.resolve(allCompleteFixturesDir, "package.json"),
      JSON.stringify({ name: "test-complete-ui", version: "1.0.0" }, null, 2),
    );
    fs.writeFileSync(
      path.resolve(allCompleteComponentsDir, "Button.astro"),
      COMPLETE_COMPONENT,
    );
  });

  afterAll(() => {
    fs.rmSync(allCompleteFixturesDir, { recursive: true, force: true });
  });

  test("exits with code 0 when all components have complete docs", async () => {
    const proc = Bun.spawn(["bun", cliEntry, "docs:check"], {
      cwd: packageDir,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        BEJAMAS_UI_ROOT: allCompleteFixturesDir,
        NO_COLOR: "1",
      },
    });

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });
});

describe("docs:check error scenarios", () => {
  test("exits with error when components directory does not exist", async () => {
    const emptyFixturesDir = path.resolve(
      __dirname,
      "fixtures/docs-check-empty",
    );
    fs.mkdirSync(emptyFixturesDir, { recursive: true });
    fs.writeFileSync(
      path.resolve(emptyFixturesDir, "package.json"),
      JSON.stringify({ name: "test-empty-ui", version: "1.0.0" }, null, 2),
    );
    // Note: intentionally NOT creating src/components

    try {
      const proc = Bun.spawn(["bun", cliEntry, "docs:check"], {
        cwd: packageDir,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          BEJAMAS_UI_ROOT: emptyFixturesDir,
          NO_COLOR: "1",
        },
      });

      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);

      expect(exitCode).toBe(1);
      expect(stdout + stderr).toMatch(/not found|expected structure/i);
    } finally {
      fs.rmSync(emptyFixturesDir, { recursive: true, force: true });
    }
  });

  test("exits gracefully when no astro files found", async () => {
    const noAstroDir = path.resolve(__dirname, "fixtures/docs-check-no-astro");
    const componentsDir = path.resolve(noAstroDir, "src/components");
    fs.mkdirSync(componentsDir, { recursive: true });
    fs.writeFileSync(
      path.resolve(noAstroDir, "package.json"),
      JSON.stringify({ name: "test-no-astro", version: "1.0.0" }, null, 2),
    );
    // Create a non-astro file
    fs.writeFileSync(
      path.resolve(componentsDir, "utils.ts"),
      "export const x = 1;",
    );

    try {
      const proc = Bun.spawn(["bun", cliEntry, "docs:check"], {
        cwd: packageDir,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          BEJAMAS_UI_ROOT: noAstroDir,
          NO_COLOR: "1",
        },
      });

      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);

      expect(exitCode).toBe(0);
      expect(stdout + stderr).toMatch(/no .astro|no component/i);
    } finally {
      fs.rmSync(noAstroDir, { recursive: true, force: true });
    }
  });
});
