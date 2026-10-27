---
name: migrate-react-sites
description: Port a React/Next.js website to Astro with bejamas/ui at pixel parity, whatever component library it uses (shadcn/ui is the happy path; PrimeReact, MUI and others work too). Three cases - rebuilding a site from its repo and live demo as a new project, migrating a site inside its own repository, or restyling a site already on Astro (PandaCSS, CSS-in-JS) to Tailwind and bejamas/ui in place. Use when recreating or migrating a site, page or demo to Astro/bejamas.
---

# React site → Astro / bejamas/ui

The target is the **rendered site**, not the code. The code tells you the content, structure and intent. The browser tells you what actually renders: which token block wins, which font is wired, which classes survived the cascade. Port that **effective cascade**, and measure fidelity in pixels instead of judging it by eye.

Effort concentrates in four places. Plan for them from the start:

1. **Source-library parity**: bejamas defaults (Button, Card, Badge, Accordion, menus, inputs) differ from the source library's.
2. **Motion**: framer-motion and third-party effects rebuilt in CSS.
3. **Mobile nav**: Sheet → Drawer or Collapsible.
4. **Effective tokens and fonts**: finding the ones that actually render.

## Choose the workflow

Read one workflow file and follow it step by step:

- **[In-repo](workflows/in-repo.md)**: the result lives **in the site's own repository**, as an Astro app next to the existing React/Next app. This is the case when you're working inside the React/Next repo being migrated and the request doesn't name a separate project. A site **already on Astro** follows the same workflow through its [Astro source](workflows/in-repo.md#astro-source) variant: the styling stack changes, the framework stays.
- **[Rebuild](workflows/rebuild.md)**: the result is a **new project**, built from a site's repo and its live demo (someone else's site, a template, a public demo).

When neither fits clearly, ask before scaffolding.

## Identify the source library

Before porting the first component, check what the source's components are built on (`components.json`, `package.json`, the rendered DOM and stylesheets):

- **shadcn/ui or a kit built the same way** (Tailwind classes merged with tailwind-merge over Radix or Base UI): the happy path. Use [parity](references/parity.md).
- **Anything else** (PrimeReact, MUI, Chakra, Mantine, PandaCSS, an in-house system on one of them): use [other libraries](references/other-libraries.md). parity's reset classes don't apply.

## Shared references

- [parity](references/parity.md): bejamas defaults vs shadcn styles, and the reset classes. Read before porting the first Button, Card, Badge or Accordion of a shadcn source.
- [other libraries](references/other-libraries.md): porting styling and behavior from non-shadcn libraries.
- [recipes](references/recipes.md): Next.js features, color mode, motion, Tailwind v3 → v4, other styling systems → Tailwind, drift, and the in-repo migration mappings.
- [known issues](references/known-issues.md): bejamas setup bugs, component bugs, primitive gaps, Astro gotchas and the accepted workarounds.

## Measuring

The scripts in this skill's `scripts/` folder measure the reference and the port. Each has a usage line at the top. They have no npm dependencies: run them with `node` (22+) or `bun`, straight from the skill folder. They drive an installed Chrome, Chromium, Edge or Brave headlessly; set `CHROME_PATH` if none is found.

- `tokens.mjs <url>` dumps the computed custom properties, color-mode state and rendered fonts of a page.
- `compare-boxes.mjs <reference> <port> <width>` compares element boxes and key computed styles.
  - It reports page height, box diffs in document order (fix the first one and re-run), computed style diffs, and missing or extra elements.
  - Colors are normalized, so `lab()` vs `oklch()` doesn't count as a diff.
  - Fonts are compared by the glyphs that render, not by family name, so `__Inter_f367f3`, `fontSans` (next/font/local) and Astro's `Inter-<hash>` match when they're the same font file.
- `shot.mjs <url> <out.png> <width>` saves viewport-sized slices (`<out>-1.png`, `<out>-2.png` …) taken while scrolled, so sticky headers and scroll-linked effects show as a visitor sees them.
- `run.mjs <script.js> <reference> <port>` runs one behavior script (click, wait, read aria state, scroll offsets, active indices) in both pages and reports whether the results are identical. Prefer it to clicking through in a browser pane: a hidden pane or tab stops `requestAnimationFrame`, which stalls primitives and looks like a port bug.
- Every script takes `--allow-status=404` for pages that are meant to return an error status, and `--ignore-inflight=<regex>` for requests that never finish. EventSource streams (CMS live updates) are already ignored.
- Narrow widths emulate a narrow desktop window, not a phone: `hover` and `pointer: fine` still match. Check hover-only and `pointer: coarse` styles by hand.
- Known artifacts to ignore:
  - The scroll lock's `scrollbar-gutter: stable` shifts content 7.5–15px while overlays are open.
  - Autoplaying carousels and marquees differ by phase.
  - A CMS CDN can allow CORS only for some local origins (`localhost:3000` but not `:4321`). Assets loaded with CORS, such as SVGs used as CSS masks, then disappear on one app only.
- Some sites set `enableSystem={false}`. For those, `--dark` emulation doesn't switch the theme, so seed the storage key instead: every script takes `--storage=theme=dark` (use the source's key).
