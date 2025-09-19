---
title: CLI
description: Astro-first wrapper around shadcn for init/add and docs generation.
sidebar:
  order: 5
---

The `bejamas` CLI is a thin Astro-first wrapper over shadcn. Use it for:

- **`init`**: scaffold Astro (single app or monorepo).
- **`add`**: install from registries with short names.
- **`docs:build`**: generate MDX docs from `.astro` comments.

For advanced registry browsing, use the **shadcn** CLI (`view`, `search`, `list`, `build`).

## Install

Use directly via npx:

```bash
npx bejamas@latest --help
```

## Commands

### init

Create an Astro app or monorepo, wire Tailwind v4, tokens, base styles, and components.json.

#### Usage

```bash
npx bejamas init [--mode astro|monorepo|monorepo+docs] [--dir .] [--pm pnpm|npm|yarn] [-y]
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

### docs:build

Generate MDX docs from comments in .astro files (props/slots/usage).

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
