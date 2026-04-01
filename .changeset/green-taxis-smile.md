---
"bejamas": minor
---

Expand Bejamas into a more opinionated create and install CLI for Astro projects.

- `bejamas init` now supports preset-driven setup plus style, theme, icon, font, menu, template, and RTL language options, and it keeps Astro fonts, imports, and Tailwind wiring in sync after project creation.
- `bejamas add` now performs style-aware registry installs, passes through inspection flags such as `--dry-run`, `--diff`, and `--view`, reorganizes multi-file components more reliably, and reconciles follow-up Astro font and CSS changes after installs.
- Add `bejamas docs:build` and `bejamas info`, move Bejamas-managed `shadcn` execution to exact `shadcn@4.1.1`, and export `tailwind.css` from the package for consumers that need the shared base styles directly.
- Make published `bejamas` canary installs self-contained by bundling the internal config, icon, and registry code they need, so `bun x` and `npx bejamas@canary ...` no longer depend on private workspace packages being available on npm.
- Publish a Bejamas-owned `components.json` schema at `https://ui.bejamas.com/schema.json`, add support for Bejamas-specific config keys such as `aliases.docs`, and continue reading legacy upstream-only keys like `rsc` and `tsx` for compatibility without emitting them in newly generated configs.
