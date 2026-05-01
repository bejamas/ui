import type { DesignSystemConfig } from "@bejamas/create-config/browser";

export const CREATE_PROJECT_PACKAGE_MANAGERS = [
  "pnpm",
  "npm",
  "yarn",
  "bun",
] as const;

export type CreateProjectPackageManager =
  (typeof CREATE_PROJECT_PACKAGE_MANAGERS)[number];

export const CREATE_PROJECT_PACKAGE_MANAGER_STORAGE_KEY =
  "bejamas:create-package-manager";

export function getCreateProjectDialogState(
  template: DesignSystemConfig["template"],
) {
  return {
    monorepo:
      template === "astro-monorepo" ||
      template === "astro-with-component-docs-monorepo",
    withDocs: template === "astro-with-component-docs-monorepo",
  };
}

export function getCreateProjectTemplateValue(options: {
  monorepo: boolean;
  withDocs: boolean;
}): DesignSystemConfig["template"] {
  if (options.withDocs) {
    return "astro-with-component-docs-monorepo";
  }

  if (options.monorepo) {
    return "astro-monorepo";
  }

  return "astro";
}

export function buildCreateProjectCommand(options: {
  packageManager: CreateProjectPackageManager;
  template: DesignSystemConfig["template"];
  preset: string;
  themeRef?: string | null;
}) {
  const runners: Record<CreateProjectPackageManager, string> = {
    pnpm: "pnpm dlx bejamas@latest init",
    npm: "npx bejamas@latest init",
    yarn: "yarn dlx bejamas@latest init",
    bun: "bunx bejamas@latest init",
  };

  return [
    runners[options.packageManager],
    `--template ${options.template}`,
    `--preset ${options.preset}`,
    options.themeRef ? `--theme-ref ${options.themeRef}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
