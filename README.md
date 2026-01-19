<a href="https://ui.bejamas.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://assets.bejamas.com/static/image/bejamas-ui/github-hero-dark.png">
    <img alt="bejamas/ui" src="https://assets.bejamas.com/static/image/bejamas-ui/github-hero-light.png" width="100%">
  </picture>
</a>

<p>
  <a href="https://www.npmjs.com/package/bejamas"><img src="https://img.shields.io/npm/v/bejamas.svg?style=flat&colorA=18181b&colorB=28CF8D" alt="npm version"></a>
  <a href="https://github.com/nicholascostadev/bejamas-ui/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/bejamas.svg?style=flat&colorA=18181b&colorB=28CF8D" alt="License"></a>
</p>

# bejamas/ui

Astro UI components you copy into your project. Zero-JS by default, built on Tailwind CSS v4, following the shadcn/ui approach.

## Features

- **Astro-native** — Pure `.astro` components, no framework runtime
- **Zero-JS by default** — Most components ship no client JavaScript
- **Tailwind CSS v4** — Modern utility-first styling
- **26+ components** — Buttons, cards, dialogs, menus, and more
- **shadcn registry compatible** — Same schema, familiar patterns
- **CLI included** — Scaffold projects and add components in seconds

## Primitives

Interactive components use [@data-slot](https://data-slot.com) — headless behavior primitives we built as the "Radix for vanilla JS". Unlike other Astro shadcn ports that bundle interaction code into copied components, @data-slot keeps behavior as a dependency. When we fix an accessibility bug, you get the fix with a version bump instead of re-copying code.

## Quick Start

```bash
npx bejamas@latest init
```

Then add components:

```bash
npx bejamas@latest add button
```

## Usage

```astro
---
import Button from "@/ui/Button.astro";
---

<Button>Click me</Button>
```

## Documentation

Visit [ui.bejamas.com](https://ui.bejamas.com) to view the full documentation.

## Contributing

Please read the [contributing guide](https://ui.bejamas.com/docs/contributing).

## License

Licensed under the [MIT license](./LICENSE).
