---
title: Registry
description: How the bejamas/ui registry works and how to install from multiple sources.
sidebar:
  order: 7
---

The **bejamas/ui Registry** is a catalog of Astro‑native **blocks** and **primitives** you can install with our CLI. It follows shadcn’s vendor‑the‑code model (files are copied into your repo; no runtime deps).

## Install from the registry

```bash
# From bejamas registry (default)
npx bejamas add hero
npx bejamas add pricing-table

# From a namespaced registry
npx bejamas add @shadcn/button
npx bejamas add @bejamas/docs-sidebar
```

Resolution order is defined in your **components.json → `registries`** (see the _components.json_ page). Use the `@namespace/name` form to target a specific source.

## Entry types

- **`block`** – marketing/docs layouts (Hero, Pricing, Comparison, Docs Sidebar, FAQ, Newsletter, KPI, Cards)
- **`primitive`** – low-level UI (Button, Badge, Input, Alert, Avatar, …)

Each entry describes: **name**, **type**, **files** (`.astro`, `.ts`, `.css`), and optional **notes** (a11y/perf). Files are written under your configured **aliases**.

## Quality & constraints

- **A11y:** visible focus, keyboard order, WCAG AA color pairs
- **Perf:** minimal CSS, zero‑JS by default, CLS‑safe patterns
- **Theming:** tokens (CSS variables) only; dark mode supported

## Versioning

Registry releases are tagged (e.g. `v2025.09`). Items can reference a tag; upgrades are opt‑in via reinstalling the item.

## Multiple registries

Configure any number of registries via `components.json → registries`:

```jsonc
{
  "registries": {
    "@bejamas": "https://ui.bejamas.dev/r/{name}.json",
    "@shadcn": "https://ui.shadcn.com/r/{name}.json",
    "@local": "./registry/{name}.json",
  },
}
```

Use `@namespace/name` to install from a specific source.

## Contributing

Submit PRs with:

- Figma frame (structure), token‑only styling
- A11y checklist pass
- Screenshots (light/dark) and brief notes (states, content limits)

That’s it—use the CLI to add items and keep your copies under version control.
