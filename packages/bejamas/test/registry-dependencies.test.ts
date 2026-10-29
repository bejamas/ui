import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const calls: { cmd: string; args: string[]; options: Record<string, any> }[] =
  [];
mock.module("execa", () => ({
  execa: async (cmd: string, args: string[], options: Record<string, any>) => {
    calls.push({ cmd, args, options });
    return { stdout: "", stderr: "", exitCode: 0 };
  },
}));

const { ensureRegistryDependencies } =
  await import("../src/utils/registry-dependencies");

const dirs: string[] = [];
afterEach(() => {
  calls.length = 0;
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("registry dependency install", () => {
  test("installs into a pnpm workspace root without ERR_PNPM_ADDING_TO_ROOT", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "bejamas-ws-root-"));
    dirs.push(cwd);
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "site", private: true }),
    );
    writeFileSync(
      path.join(cwd, "pnpm-workspace.yaml"),
      "packages:\n  - 'tools/*'\n",
    );
    writeFileSync(path.join(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");

    await ensureRegistryDependencies(cwd, [
      {
        name: "accordion",
        type: "registry:ui",
        dependencies: ["@data-slot/accordion"],
      },
    ] as never);

    expect(calls).toHaveLength(1);
    expect(calls[0].cmd).toBe("pnpm");
    expect(calls[0].args).toEqual(["add", "@data-slot/accordion"]);
    expect(calls[0].options.cwd).toBe(cwd);
    expect(calls[0].options.env).toMatchObject({
      npm_config_ignore_workspace_root_check: "true",
    });
  });
});
