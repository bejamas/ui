# bejamas

## 0.4.0

### Minor Changes

- [#121](https://github.com/bejamas/ui/pull/121) [`cab232e`](https://github.com/bejamas/ui/commit/cab232e8ae59a1c2ab8513208e4f948a3c675718) Thanks [@thomkrupa](https://github.com/thomkrupa)! - Add a Bejamas-native `apply` command for preset switching, including partial `--only theme`, `--only font`, and `--only theme,font` support, and bump the managed shadcn runner to 4.6.0.

- [#121](https://github.com/bejamas/ui/pull/121) [`1ad30c7`](https://github.com/bejamas/ui/commit/1ad30c7bd83274769dd099361c538d3506dc52cf) Thanks [@thomkrupa](https://github.com/thomkrupa)! - Add the native `bejamas preset` command for decoding preset codes, creating preset URLs, opening presets, and resolving the active project preset.

## 0.3.3

### Patch Changes

- [#119](https://github.com/bejamas/ui/pull/119) [`6e60f44`](https://github.com/bejamas/ui/commit/6e60f447872639527909dfd7b72c2f0a01a35aba) Thanks [@thomkrupa](https://github.com/thomkrupa)! - Fix Astro starter templates to use an `@lucide/astro` release compatible with Astro 6 so `bejamas init --template astro` no longer fails npm dependency resolution.

## 0.3.2

### Patch Changes

- [#110](https://github.com/bejamas/ui/pull/110) [`381e825`](https://github.com/bejamas/ui/commit/381e82549381f19a8c9714d1ba0d715fd79a63fa) Thanks [@thomkrupa](https://github.com/thomkrupa)! - Fix interactive component installs so internal semantic icon registry items are not installed as user dependencies. Components added through `bejamas add` now rely on the icon library selected during init, and shadcn failure output is surfaced when dependency installation fails.

## 0.3.1

### Patch Changes

- [#106](https://github.com/bejamas/ui/pull/106) [`53d5e40`](https://github.com/bejamas/ui/commit/53d5e403d735556bda18e23bfdd41befb24cf85d) Thanks [@thomkrupa](https://github.com/thomkrupa)! - Fix published `bejamas init` project creation by falling back to starter templates downloaded from the `bejamas/ui` GitHub repo when local bundled templates are unavailable, and make starter projects resolve `bejamas/tailwind.css` correctly by publishing a root CSS entrypoint and updating templates to depend on the current `0.3.x` package line.

## 0.3.0

### Minor Changes

- [#102](https://github.com/bejamas/ui/pull/102) [`25987b8`](https://github.com/bejamas/ui/commit/25987b872d38280dfe47f820019f86c1cb00eb6d) Thanks [@thomkrupa](https://github.com/thomkrupa)! - Expand Bejamas into a more opinionated create and install CLI for Astro projects.
  - `bejamas init` now supports preset-driven setup plus style, theme, icon, font, menu, template, and RTL language options, and it keeps Astro fonts, imports, and Tailwind wiring in sync after project creation.
  - `bejamas add` now performs style-aware registry installs, passes through inspection flags such as `--dry-run`, `--diff`, and `--view`, reorganizes multi-file components more reliably, and reconciles follow-up Astro font and CSS changes after installs.
  - Add `bejamas docs:build` and `bejamas info`, move Bejamas-managed `shadcn` execution to exact `shadcn@4.1.1`, and export `tailwind.css` from the package for consumers that need the shared base styles directly.
  - Make published `bejamas` canary installs self-contained by bundling the internal config, icon, and registry code they need, so `bun x` and `npx bejamas@canary ...` no longer depend on private workspace packages being available on npm.
  - Publish a Bejamas-owned `components.json` schema at `https://ui.bejamas.com/schema.json`, add support for Bejamas-specific config keys such as `aliases.docs`, and continue reading legacy upstream-only keys like `rsc` and `tsx` for compatibility without emitting them in newly generated configs.

## 0.2.12

### Patch Changes

- [#100](https://github.com/bejamas/ui/pull/100) [`a43a019`](https://github.com/bejamas/ui/commit/a43a0196a9ef3b68f86d2efc5a0693970e32f032) Thanks [@thomkrupa](https://github.com/thomkrupa)! - Pin Bejamas-managed `shadcn` calls to exact `shadcn@4.1.1` for deterministic style support while keeping the Bejamas registry/init flow and legacy `init --base-color` behavior.

## 0.2.11

### Patch Changes

- [#98](https://github.com/bejamas/ui/pull/98) [`b608ac1`](https://github.com/bejamas/ui/commit/b608ac19b71b1cce6111118051fc5234f494d3a1) Thanks [@thomkrupa](https://github.com/thomkrupa)! - Fix `bejamas init` against current `shadcn@latest` by removing the obsolete upstream `--base-color` flag, warning on deprecated `bejamas --base-color`, and normalizing generated `components.json` back to Bejamas's default `neutral` base color.

## 0.2.10

### Patch Changes

- [#93](https://github.com/bejamas/ui/pull/93) [`48d08fe`](https://github.com/bejamas/ui/commit/48d08febf9deb9609bb33f7110ec96906c5c1e31) Thanks [@thomkrupa](https://github.com/thomkrupa)! - normlize script examples in JSDoc

## 0.2.9

### Patch Changes

- [#67](https://github.com/bejamas/ui/pull/67) [`20dc7e2`](https://github.com/bejamas/ui/commit/20dc7e29e81b92c569cbd471fa4dd7cb470bd630) Thanks [@thomkrupa](https://github.com/thomkrupa)! - remove preview from usage

## 0.2.8

### Patch Changes

- [#64](https://github.com/bejamas/ui/pull/64) [`42d6867`](https://github.com/bejamas/ui/commit/42d68678c77634983218499026f519733d988dfa) Thanks [@thomkrupa](https://github.com/thomkrupa)! - add nopreview

- [#65](https://github.com/bejamas/ui/pull/65) [`24b51ec`](https://github.com/bejamas/ui/commit/24b51ec6f11c5655295651c7d4885acd5f94cffc) Thanks [@thomkrupa](https://github.com/thomkrupa)! - add console preview

- [#62](https://github.com/bejamas/ui/pull/62) [`2c8b6b2`](https://github.com/bejamas/ui/commit/2c8b6b2b93f620aedc7538c1fc34974cab47cc33) Thanks [@thomkrupa](https://github.com/thomkrupa)! - fixes docs generation for complex JSDoc blocks by supporting sectioned example parsing

## 0.2.7

### Patch Changes

- [#39](https://github.com/bejamas/ui/pull/39) [`8838d07`](https://github.com/bejamas/ui/commit/8838d07743e6fa6b117bfbcd11071e5ed6c8a58d) Thanks [@thomkrupa](https://github.com/thomkrupa)! - remove max-w for input inside preview

## 0.2.6

### Patch Changes

- [#35](https://github.com/bejamas/ui/pull/35) [`140fe4e`](https://github.com/bejamas/ui/commit/140fe4e510a44561831b757042e755e2a811272d) Thanks [@thomkrupa](https://github.com/thomkrupa)! - generate API Reference section

## 0.2.5

### Patch Changes

- [#32](https://github.com/bejamas/ui/pull/32) [`be47c33`](https://github.com/bejamas/ui/commit/be47c33d0e6bf8392427dbe36d9b3db12e12191f) Thanks [@thomkrupa](https://github.com/thomkrupa)! - fix add command select mode

## 0.2.4

### Patch Changes

- [#30](https://github.com/bejamas/ui/pull/30) [`4f2f6d4`](https://github.com/bejamas/ui/commit/4f2f6d41ba455d0dc87ee8db45974f78c7ca4a7d) Thanks [@thomkrupa](https://github.com/thomkrupa)! - decrease inline padding for mobile component preview

## 0.2.3

### Patch Changes

- [#25](https://github.com/bejamas/ui/pull/25) [`001ddca`](https://github.com/bejamas/ui/commit/001ddcae75e510cd5f2afca4e24af6412bf84ed9) Thanks [@thomkrupa](https://github.com/thomkrupa)! - improve source preview

## 0.2.2

### Patch Changes

- [#10](https://github.com/bejamas/ui/pull/10) [`92f2b10`](https://github.com/bejamas/ui/commit/92f2b10522fb4738ca056d2731fb14ced08d8a6f) Thanks [@thomkrupa](https://github.com/thomkrupa)! - Improve bejamas add to organize multi-file components into subfolders

- [#12](https://github.com/bejamas/ui/pull/12) [`0486564`](https://github.com/bejamas/ui/commit/04865641291f255556be1b08e40c5bb308b5ab87) Thanks [@thomkrupa](https://github.com/thomkrupa)! - Fix console output and file handling for component reorganization

## 0.2.1

### Patch Changes

- [#7](https://github.com/bejamas/ui/pull/7) [`a056936`](https://github.com/bejamas/ui/commit/a0569362b095a7348a66f83ae64fd55ac52a37a3) Thanks [@thomkrupa](https://github.com/thomkrupa)! - generate docs from component files in folders

## 0.2.0

### Minor Changes

- [#4](https://github.com/bejamas/ui/pull/4) [`e92149b`](https://github.com/bejamas/ui/commit/e92149b39041acd0e2f023833fcc7189b8610773) Thanks [@thomkrupa](https://github.com/thomkrupa)! - Add `docs:check` command to validate component documentation completeness
  - Scans all `.astro` components and validates JSDoc documentation
  - Reports components as complete, incomplete (missing recommended fields), or missing docs (missing required fields)
  - Required fields: `@component`, `@title`, `@description`
  - Recommended fields: `@preview`, `@usage`, `@figmaUrl`
  - Supports `--json` flag for CI integration
  - Exits with code 1 when components are missing required documentation

## 0.1.1

### Patch Changes

- fix package name in readme
