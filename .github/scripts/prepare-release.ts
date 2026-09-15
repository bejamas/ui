import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export interface Manifest {
  name: string;
  version: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const dependencyFields = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
  "devDependencies",
] as const;

export function prepareManifest(
  manifest: Manifest,
  workspace: Map<string, Manifest>,
) {
  const result = structuredClone(manifest);
  for (const field of dependencyFields) {
    for (const [name, range] of Object.entries(result[field] ?? {})) {
      const dependency = workspace.get(name);
      if (dependency?.private) {
        if (field !== "devDependencies") {
          throw new Error(
            `${manifest.name}: ${field} references private package ${name}`,
          );
        }
        // Bundled build tools are not part of the published package.
        delete result[field]![name];
        continue;
      }
      if (!range.startsWith("workspace:")) continue;
      if (!dependency)
        throw new Error(
          `${manifest.name}: unknown workspace dependency ${name}`,
        );
      const requested = range.slice("workspace:".length);
      if (!["*", "^", "~"].includes(requested)) {
        throw new Error(
          `${manifest.name}: unsupported workspace range ${range} for ${name}`,
        );
      }
      result[field]![name] =
        `${requested === "*" ? "" : requested}${dependency.version}`;
    }
  }
  return result;
}

export function validatePackedManifest(
  manifest: Manifest,
  workspace: Map<string, Manifest>,
) {
  for (const field of dependencyFields) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) {
      if (range.startsWith("workspace:")) {
        throw new Error(
          `${manifest.name}: packed ${field}.${name} still contains ${range}`,
        );
      }
      if (field !== "devDependencies" && workspace.get(name)?.private) {
        throw new Error(
          `${manifest.name}: packed dependency ${name} is private`,
        );
      }
    }
  }
}

async function prepareRelease(packagesDir: string) {
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const packages: { directory: string; manifest: Manifest }[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const directory = path.join(packagesDir, entry.name);
    try {
      packages.push({
        directory,
        manifest: JSON.parse(
          await readFile(path.join(directory, "package.json"), "utf8"),
        ),
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const workspace = new Map(
    packages.map(({ manifest }) => [manifest.name, manifest]),
  );
  // Validate every package before changing any manifests.
  const publicPackages = packages
    .filter(({ manifest }) => !manifest.private)
    .map(({ directory, manifest }) => ({
      directory,
      manifest: prepareManifest(manifest, workspace),
    }));
  const packDir = await mkdtemp(path.join(tmpdir(), "bejamas-release-"));
  try {
    for (const { directory, manifest } of publicPackages) {
      await writeFile(
        path.join(directory, "package.json"),
        JSON.stringify(manifest, null, 2) + "\n",
      );
      const pack = Bun.spawnSync(
        [
          "npm",
          "pack",
          "--ignore-scripts",
          "--json",
          "--pack-destination",
          packDir,
        ],
        { cwd: directory },
      );
      if (pack.exitCode !== 0) throw new Error(pack.stderr.toString());
      const [{ filename }] = JSON.parse(pack.stdout.toString());
      const unpack = Bun.spawnSync([
        "tar",
        "-xOf",
        path.join(packDir, filename),
        "package/package.json",
      ]);
      if (unpack.exitCode !== 0) throw new Error(unpack.stderr.toString());
      validatePackedManifest(JSON.parse(unpack.stdout.toString()), workspace);
      console.log(
        `Validated packed manifest: ${manifest.name}@${manifest.version}`,
      );
    }
  } finally {
    await rm(packDir, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  await prepareRelease(path.resolve(import.meta.dir, "../../packages"));
}
