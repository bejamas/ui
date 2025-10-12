import path from "path";
import { initOptionsSchema } from "@/src/commands/init";
import * as ERRORS from "@/src/utils/errors";
import fs from "fs-extra";
import { z } from "zod";

export async function preFlightInit(
  options: z.infer<typeof initOptionsSchema>,
) {
  const errors: Record<string, boolean> = {};

  // Ensure target directory exists.
  // Check for empty project. We assume if no package.json exists, the project is empty.
  if (
    !fs.existsSync(options.cwd) ||
    !fs.existsSync(path.resolve(options.cwd, "package.json"))
  ) {
    errors[ERRORS.MISSING_DIR_OR_EMPTY_PROJECT] = true;
    return {
      errors,
      projectInfo: null,
    };
  }

  return {
    errors,
    projectInfo: null,
  };
}
