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
});
