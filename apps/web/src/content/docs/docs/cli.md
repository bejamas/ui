---
title: CLI
description: Astro-first wrapper around shadcn for init/add, project info, docs lookup, and docs generation.
sidebar:
  order: 7
---

The `bejamas` CLI is a thin Astro-first wrapper over shadcn. Use it for:

- **`init`**: scaffold Astro (single app or monorepo).
- **`add`**: install from registries with short names.
- **`apply`**: switch an existing app to a different preset.
- **`preset`**: decode, share, open, or resolve Bejamas preset codes.
- **`info`**: show the current project and config summary from shadcn.
- **`docs`**: fetch docs, examples, and API links for components.
- **`docs:build`**: generate MDX docs from `.astro` comments.
- **`docs:check`**: validate documentation completeness for components.
- **`bench`**: compare an original site with its ported version.

For advanced registry browsing, use the **shadcn** CLI (`view`, `search`, `list`, `build`).

## Install

Use directly via npx:

```bash
npx bejamas@latest --help
```

## Commands

### init

Create an Astro app or monorepo, wire Tailwind v4, tokens, base styles, and components.json.

You can also switch an existing app to a different preset by rerunning `init --preset`, but new projects should use `apply`. Installed UI components are reconfigured to the new preset automatically when applying the full preset.

Starter templates are English-only by default. Use `--rtl --lang <ar|fa|he>` when you want the CLI to add the template i18n/RTL wiring.

#### Usage

```bash
npx bejamas init [--mode astro|monorepo|monorepo+docs] [--dir .] [--pm pnpm|npm|yarn] [-y]
npx bejamas init --preset <encoded-preset> --yes
```

Sets up Astro project(s) + optional docs workspace (monorepo+docs)

Tailwind v4 + globals

Base tokens & CSS variables

components.json (Bejamas schema)

Compatibility note: Bejamas runs exact `shadcn` v4.6.0 for managed CLI commands. Bejamas still preserves its custom `init` behavior, including preset switching, style support, and `init --base-color`.

### apply <preset>

Apply a Bejamas preset to an existing project.

#### Usage

```bash
npx bejamas apply --preset <encoded-preset>
npx bejamas apply <encoded-preset>
npx bejamas apply <encoded-preset> --only theme
npx bejamas apply <encoded-preset> --only font
npx bejamas apply <encoded-preset> --only theme,font
```

Full apply updates the design system and re-installs detected UI components. Partial apply keeps installed component files in place and updates only the selected theme and/or font wiring.

### add <name>

Install a component or block from configured registries (see `components.json` → `registries`). Components are written under your aliases. Blocks keep a portable folder per block under `src/components/blocks/<id>` (or `components/blocks/<id>` in projects without `src`), and any UI components they depend on are installed alongside.

#### Usage

```bash
npx bejamas add <name>
npx bejamas add button
npx bejamas add navigation-headers-01
npx bejamas add @bejamas/footer-01
npx bejamas add @shadcn/button
```

Run `add` without arguments to pick components and blocks interactively. `--all` installs every UI component; blocks stay opt-in.

**Notes**

Namespaced form `@namespace/name` targets a specific registry. `@bejamas/<name>` always resolves to the Bejamas registry for your configured style.

Available blocks: `navigation-headers-01`, `navigation-headers-02`, and `footer-01`. Browse them at [/blocks](/blocks).

In a monorepo, run `add` from the app (for example `apps/web`). Blocks land in the app while their UI dependencies are installed in the shared UI package, and block imports are rewritten to the app's `aliases.ui`.

--dry-run shows what would be written.

### preset

Manage Bejamas preset codes.

#### Usage

```bash
npx bejamas preset decode <encoded-preset>
npx bejamas preset decode <encoded-preset> --json
npx bejamas preset url <encoded-preset>
npx bejamas preset open <encoded-preset>
npx bejamas preset resolve
npx bejamas preset resolve --json
```

`preset resolve` reads the current `components.json`, design-system CSS, and Astro managed font wiring to produce the nearest Bejamas preset code. In a monorepo, run it with `-c <workspace>`.

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

### bench

Compare an original site with its ported version. Runs [`@bejamas/bench`](https://www.npmjs.com/package/@bejamas/bench) on demand, so Lighthouse and Playwright are only downloaded when you use it. Requires Google Chrome.

It reports:

- **Lighthouse**: median score, FCP, LCP, TBT, CLS and Speed Index over alternating runs.
- **Route assets**: JavaScript, CSS, HTML and fonts loaded by a cold page view, with deterministic gzip estimates.
- **Page quality**: visible text, title and description, heading outline, axe-core violations, browser errors and nested controls.
- **Visual parity**: `data-slot` component sizes, page regions and screenshot pixel differences at each width.

#### Usage

```bash
npx bejamas bench --original http://localhost:3000 --ported http://localhost:4321
npx bejamas bench --original https://example.com --ported https://new.example.com --fail-on "lcp>10%,js>0,pixels>1%"
npx bejamas bench --original localhost:3000 --ported localhost:4321 --only visual,quality --widths 375,768,1440
```

`bejamas bench <original> <ported>` also works, but prints which URL it read as which. Prefer the named flags so the URLs can't be swapped by mistake.

Measure production builds (`astro build && astro preview`, `next build && next start`). Assets and Lighthouse are skipped when a dev server is detected. Lighthouse timings are flagged as not comparable when one URL is local and the other is remote.

#### Options

- `--original <url>` - URL of the original site
- `--ported <url>` - URL of the ported site
- `-o, --out <dir>` - Also write `report.md`, `report.json`, screenshots and Lighthouse reports to this directory. Without it, the summary is only printed to the terminal.
- `-r, --runs <count>` - Lighthouse runs per URL (default: `5`)
- `-w, --widths <list>` - Viewport widths for visual parity (default: `412,1280`)
- `--form-factor <type>` - Lighthouse `mobile` or `desktop` emulation
- `--only <stages>`, `--skip <stages>` - Choose from `assets`, `quality`, `visual` and `lighthouse`
- `--tolerance <px>` - Allowed size difference for matched components (default: `0.5`)
- `--fail-on <budgets>` - Fail when the port exceeds budgets such as `lcp>10%`, `js>0`, `total>20kb`, `score<-5` or `pixels>1%`
- `--report-only` - Exit with 0 even when checks or budgets fail
- `--json` - Print the JSON report to stdout

The command exits with `0` when every check and budget passes, `1` when any fails, and `2` when the run cannot complete.
