import { expect, test } from "bun:test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageDir = path.resolve(__dirname, "..");
const cliEntry = path.resolve(packageDir, "dist/index.js");

async function runCli(args: string[]) {
  const proc = Bun.spawn(["bun", cliEntry, ...args], {
    cwd: packageDir,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env },
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
}

test("shows version with -v/--version", async () => {
  const pkgJsonPath = path.resolve(packageDir, "package.json");
  const pkg = await Bun.file(pkgJsonPath).json();
  const expectedVersion: string = pkg.version;

  const { stdout, stderr, exitCode } = await runCli(["-v"]);

  expect(exitCode).toBe(0);
  expect(stderr).toBe("");
  expect(stdout.trim()).toBe(expectedVersion);

  const res2 = await runCli(["--version"]);
  expect(res2.exitCode).toBe(0);
  expect(res2.stderr).toBe("");
  expect(res2.stdout.trim()).toBe(expectedVersion);
});

test("shows help with --help", async () => {
  const { stdout, stderr, exitCode } = await runCli(["--help"]);
  expect(exitCode).toBe(0);
  expect(stderr).toBe("");
  expect(stdout).toContain("bejamas");
  expect(stdout).toMatch(/Usage|Commands/i);
  expect(stdout).toContain("apply");
  expect(stdout).toContain("preset");
  expect(stdout).toContain("info");
  expect(stdout).toContain("docs");
  expect(stdout).toContain("docs:build");
});

test("shows RTL language support in init help", async () => {
  const { stdout, stderr, exitCode } = await runCli(["init", "--help"]);

  expect(exitCode).toBe(0);
  expect(stderr).toBe("");
  expect(stdout).toContain("--lang");
  expect(stdout).toContain("--reinstall");
});

test("shows inspection flags in add help", async () => {
  const { stdout, stderr, exitCode } = await runCli(["add", "--help"]);

  expect(exitCode).toBe(0);
  expect(stderr).toBe("");
  expect(stdout).toContain("--dry-run");
  expect(stdout).toContain("--diff");
  expect(stdout).toContain("--view");
});

test("shows apply preset flags in apply help", async () => {
  const { stdout, stderr, exitCode } = await runCli(["apply", "--help"]);

  expect(exitCode).toBe(0);
  expect(stderr).toBe("");
  expect(stdout).toContain("--preset");
  expect(stdout).toContain("--only");
  expect(stdout).toContain("--cwd");
});

test("shows preset subcommands in preset help", async () => {
  const { stdout, stderr, exitCode } = await runCli(["preset", "--help"]);

  expect(exitCode).toBe(0);
  expect(stderr).toBe("");
  expect(stdout).toContain("decode");
  expect(stdout).toContain("resolve");
  expect(stdout).toContain("url");
  expect(stdout).toContain("open");
});

test("shows wrapper flags in docs help", async () => {
  const { stdout, stderr, exitCode } = await runCli(["docs", "--help"]);

  expect(exitCode).toBe(0);
  expect(stderr).toBe("");
  expect(stdout).toContain("--base");
  expect(stdout).toContain("--json");
});

test("shows wrapper flags in info help", async () => {
  const { stdout, stderr, exitCode } = await runCli(["info", "--help"]);

  expect(exitCode).toBe(0);
  expect(stderr).toBe("");
  expect(stdout).toContain("--cwd");
  expect(stdout).toContain("--json");
});

test("keeps docs generation on docs:build", async () => {
  const { stdout, stderr, exitCode } = await runCli(["docs:build", "--help"]);

  expect(exitCode).toBe(0);
  expect(stderr).toBe("");
  expect(stdout).toContain("generate docs from @bejamas/ui components");
  expect(stdout).not.toContain("proxy to shadcn docs");
});

test("exposes the local smoke runner script", async () => {
  const pkgJsonPath = path.resolve(packageDir, "package.json");
  const pkg = (await Bun.file(pkgJsonPath).json()) as {
    scripts?: Record<string, string>;
  };

  expect(pkg.scripts?.["smoke:init:local"]).toBe(
    "bun run scripts/smoke-init-local.ts",
  );
});
