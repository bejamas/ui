# bejamas

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
