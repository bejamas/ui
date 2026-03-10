import { describe, expect, it } from "bun:test";
import {
  buildCreateProjectCommand,
  CREATE_PROJECT_PACKAGE_MANAGERS,
  getCreateProjectDialogState,
  getCreateProjectTemplateValue,
} from "./create-project-dialog";

describe("create project dialog helpers", () => {
  it("derives monorepo and docs state from the template", () => {
    expect(getCreateProjectDialogState("astro")).toEqual({
      monorepo: false,
      withDocs: false,
    });
    expect(getCreateProjectDialogState("astro-monorepo")).toEqual({
      monorepo: true,
      withDocs: false,
    });
    expect(
      getCreateProjectDialogState("astro-with-component-docs-monorepo"),
    ).toEqual({
      monorepo: true,
      withDocs: true,
    });
  });

  it("maps dialog toggle state back to the supported template values", () => {
    expect(
      getCreateProjectTemplateValue({ monorepo: false, withDocs: false }),
    ).toBe("astro");
    expect(
      getCreateProjectTemplateValue({ monorepo: true, withDocs: false }),
    ).toBe("astro-monorepo");
    expect(
      getCreateProjectTemplateValue({ monorepo: true, withDocs: true }),
    ).toBe("astro-with-component-docs-monorepo");
    expect(
      getCreateProjectTemplateValue({ monorepo: false, withDocs: true }),
    ).toBe("astro-with-component-docs-monorepo");
  });

  it("builds package-manager specific init commands", () => {
    const commands = Object.fromEntries(
      CREATE_PROJECT_PACKAGE_MANAGERS.map((packageManager) => [
        packageManager,
        buildCreateProjectCommand({
          packageManager,
          template: "astro-monorepo",
          preset: "abc123",
          rtl: true,
          rtlLanguage: "he",
          themeRef: "theme-42",
        }),
      ]),
    );

    expect(commands.pnpm).toBe(
      "pnpm dlx bejamas init --template astro-monorepo --preset abc123 --theme-ref theme-42 --rtl --lang he",
    );
    expect(commands.npm).toBe(
      "npx bejamas init --template astro-monorepo --preset abc123 --theme-ref theme-42 --rtl --lang he",
    );
    expect(commands.yarn).toBe(
      "yarn dlx bejamas init --template astro-monorepo --preset abc123 --theme-ref theme-42 --rtl --lang he",
    );
    expect(commands.bun).toBe(
      "bunx bejamas init --template astro-monorepo --preset abc123 --theme-ref theme-42 --rtl --lang he",
    );
  });

  it("omits the RTL language flag when RTL is disabled", () => {
    const command = buildCreateProjectCommand({
      packageManager: "bun",
      template: "astro",
      preset: "abc123",
      rtl: false,
      rtlLanguage: "fa",
      themeRef: null,
    });

    expect(command).toBe("bunx bejamas init --template astro --preset abc123");
  });
});
