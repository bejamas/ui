// Set canary versions for all publishable packages
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.join(__dirname, "..", "packages");

interface PackageJson {
  name: string;
  version: string;
  private?: boolean;
  [key: string]: unknown;
}

exec("git rev-parse --short HEAD", (err, stdout) => {
  if (err) {
    console.error("Failed to get git SHA:", err);
    process.exit(1);
  }

  const shortSha = stdout.trim();
  const canaryVersion = `0.0.0-canary.${shortSha}`;

  console.log(`Setting canary version: ${canaryVersion}\n`);

  try {
    const packages = fs
      .readdirSync(packagesDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    let publishedCount = 0;

    for (const pkgName of packages) {
      const pkgJsonPath = path.join(packagesDir, pkgName, "package.json");

      if (!fs.existsSync(pkgJsonPath)) {
        console.log(`⏭️  Skipping ${pkgName} - no package.json found`);
        continue;
      }

      const pkg: PackageJson = JSON.parse(
        fs.readFileSync(pkgJsonPath, "utf-8"),
      );

      // Skip private packages
      if (pkg.private === true) {
        console.log(`⏭️  Skipping ${pkg.name} - marked as private`);
        continue;
      }

      // Update version
      pkg.version = canaryVersion;
      fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, "\t") + "\n");

      console.log(`✅ Updated ${pkg.name} to ${canaryVersion}`);
      publishedCount++;
    }

    console.log(`\n📦 Updated ${publishedCount} package(s)`);

    if (publishedCount === 0) {
      console.log("⚠️  No publishable packages found!");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error updating package versions:", error);
    process.exit(1);
  }
});
