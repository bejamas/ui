import path from "path";
import fs from "fs-extra";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
};

export function getPackageInfo(
  cwd: string = "",
  shouldThrow: boolean = true,
): PackageJson | null {
  const packageJsonPath = path.join(cwd, "package.json");

  return fs.readJSONSync(packageJsonPath, {
    throws: shouldThrow,
  }) as PackageJson;
}
