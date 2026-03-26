---
title: CLI
description: Astro-first wrapper around shadcn for init/add, project info, docs lookup, and docs generation.
sidebar:
  order: 7
---

The `bejamas` CLI is a thin Astro-first wrapper over shadcn. Use it for:

- **`init`**: scaffold Astro (single app or monorepo).
- **`add`**: install from registries with short names.
- **`info`**: show the current project and config summary from shadcn.
- **`docs`**: fetch docs, examples, and API links for components.
- **`docs:build`**: generate MDX docs from `.astro` comments.
- **`docs:check`**: validate documentation completeness for components.

For advanced registry browsing, use the **shadcn** CLI (`view`, `search`, `list`, `build`).

## Install

Use directly via npx:

```bash
npx bejamas@latest --help
```

## Commands

### init

Create an Astro app or monorepo, wire Tailwind v4, tokens, base styles, and components.json.

You can also switch an existing app to a different preset by rerunning `init --preset`. Installed UI components are reconfigured to the new preset automatically; use `--no-reinstall` to opt out.

Starter templates are English-only by default. Use `--rtl --lang <ar|fa|he>` when you want the CLI to add the template i18n/RTL wiring.

#### Usage

```bash
npx bejamas init [--mode astro|monorepo|monorepo+docs] [--dir .] [--pm pnpm|npm|yarn] [-y]
npx bejamas init --preset <encoded-preset> --yes
```

Sets up Astro project(s) + optional docs workspace (monorepo+docs)

Tailwind v4 + globals

Base tokens & CSS variables

components.json (shadcn schema)

### add <name>

Install a component/block from configured registries (see components.json → registries). Writes files under your aliases.

#### Usage

```bash
npx bejamas add <name>
npx bejamas add @bejamas/pricing-table
npx bejamas add @shadcn/button
```

**Notes**

Namespaced form `@namespace/name` targets a specific registry.

--dry-run shows what would be written.

### info

Proxy to `shadcn info` so you can inspect the current project, installed components, and config.

#### Usage

```bash
npx bejamas info
npx bejamas info --json
```

### docs <component>

Proxy to `shadcn docs` for component docs, examples, and API links.

#### Usage

```bash
npx bejamas docs combobox
npx bejamas docs combobox --json
```

### docs:build

Generate MDX docs from comments in .astro files (props/slots/usage).

Use `docs:build` explicitly for generation. The plain `docs` command is reserved for the shadcn docs lookup wrapper.

**Usage**

```bash
npx bejamas docs:build [--in "src/components/**/*.{astro,ts}"] [--out docs/components] [--overwrite] [--dry-run]
```

Example (in a `.astro` file)

```astro
---
/**
 * Pricing Table
 * @prop plans Plan[] list of plan objects
 * @prop highlight string tier to emphasize
 * @a11y All interactive controls are keyboard reachable
 * @usage Keep headings 1–2 lines; prices use <sup> for currency
 */
---
```

### docs:check

Validate documentation completeness for all components. Reports missing required fields, incomplete docs, and provides a summary.

#### Usage

```bash
npx bejamas docs:check [--cwd <path>] [--json]
```

#### Options

- `--cwd <path>` - Path to UI working directory
- `--json` - Output results as JSON for CI integration

#### Documentation Fields

**Required:**

- `@component` - Component name
- `@title` - Display title
- `@description` - Short description

**Recommended:**

- `@preview` - Primary visual example
- `@usage` - Code usage examples
- `@figmaUrl` - Figma design URL

**Optional:**

- `@examples` - Additional examples
