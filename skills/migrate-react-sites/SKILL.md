---
name: migrate-react-sites
description: Port a React/Next.js + shadcn/ui website to Astro with bejamas/ui at pixel parity. Two cases - rebuilding a site from its repo and live demo as a new project, or migrating a site inside its own repository. Use when recreating or migrating a site, page or demo to Astro/bejamas.
---

# React/shadcn site → Astro / bejamas/ui

The target is the **rendered site**, not the code. The code tells you the content, structure and intent. The browser tells you what actually renders: which token block wins, which font is wired, which classes survived tailwind-merge. Port that **effective cascade**, and measure fidelity in pixels instead of judging it by eye.

Effort concentrates in four places. Plan for them from the start:

1. **Parity resets**: bejamas defaults (Button, Card, Badge, Accordion, menus, inputs) differ from shadcn's.
2. **Motion**: framer-motion and third-party effects rebuilt in CSS.
3. **Mobile nav**: Sheet → Drawer or Collapsible.
4. **Effective tokens and fonts**: finding the ones that actually render.

## Choose the workflow

Read one workflow file and follow it step by step:

- **[Rebuild](workflows/rebuild.md)**: the result is a **new project**, built from a site's repo and its live demo (someone else's site, a template, a public demo).
- **[In-repo](workflows/in-repo.md)**: the result lives **in the site's own repository**, as an Astro app next to the existing React/Next app, which it replaces at cutover.

When the request doesn't say where the result goes, ask before scaffolding.

## Shared references

- [parity](references/parity.md): bejamas defaults vs shadcn styles, and the reset classes. Read before porting the first Button, Card, Badge or Accordion.
- [recipes](references/recipes.md): Next.js features, color mode, motion, Tailwind v3 → v4, drift, and the in-repo migration mappings.
- [known issues](references/known-issues.md): bejamas setup bugs, component bugs, primitive gaps and the accepted workarounds.

## Measuring

The scripts in this skill's `scripts/` folder measure the reference and the port. Each has a usage line at the top. They have no npm dependencies: run them with `node` (22+) or `bun`, straight from the skill folder. They drive an installed Chrome, Chromium, Edge or Brave headlessly; set `CHROME_PATH` if none is found.

- `tokens.mjs <url>` dumps the computed custom properties, color-mode state and rendered fonts of a page.
- `compare-boxes.mjs <reference> <port> <width>` compares element boxes and key computed styles.
  - It reports page height, box diffs in document order (fix the first one and re-run), computed style diffs, and missing or extra elements.
  - Colors are normalized, so `lab()` vs `oklch()` doesn't count as a diff.
  - Fonts are compared by the glyphs that render, not by family name, so `__Inter_f367f3`, `fontSans` (next/font/local) and Astro's `Inter-<hash>` match when they're the same font file.
- `shot.mjs <url> <out.png> <width>` saves viewport-sized slices (`<out>-1.png`, `<out>-2.png` …) taken while scrolled, so sticky headers and scroll-linked effects show as a visitor sees them.
- Narrow widths emulate a narrow desktop window, not a phone: `hover` and `pointer: fine` still match. Check hover-only and `pointer: coarse` styles by hand.
- Known headless artifacts to ignore:
  - The scroll lock's `scrollbar-gutter: stable` shifts content 7.5–15px while overlays are open.
  - Autoplaying carousels and marquees differ by phase.
- Some sites set `enableSystem={false}`. For those, `--dark` emulation doesn't switch the theme, so seed the storage key instead: every script takes `--storage=theme=dark` (use the source's key).
