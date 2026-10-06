# Website port brief: Next.js + shadcn/ui → Astro + bejamas/ui

You are porting ONE public demo website (a marketing/landing page built with Next.js and shadcn/ui) to Astro with bejamas/ui. Your assignment (slug, source repo, demo URL, port number) is in your task prompt. Work autonomously; nobody will answer questions mid-task.

## Goal

The port of the demo's landing page (the home route) should look as close to the original as possible: same sections and order, copy, images/assets, colors, fonts, spacing, responsive behavior and dark/light default. Secondary routes (pricing, blog, dashboard, auth) are out of scope. Point their nav links at `#` or at the matching URL on the original demo. If the demo home page itself contains a pricing section, blog cards, etc., port those sections.

## Hard requirements

1. **Location**: `/tmp/bui-ports/<slug>/` is its own git repository (run `git init` yourself, since the scaffold doesn't). Commit your work in logical steps, with plain commit messages and no Co-Authored-By or "Generated with" lines.
2. **Bun only**: use bun for install, add, run and build (`bun install`, `bun add`, `bunx`, `bun run build`). Never use npm, pnpm or yarn.
3. **bejamas 0.5.0**: scaffold with the CLI, then pin the package:
   ```sh
   mkdir -p /tmp/bui-ports/_scaffold-<slug> && cd /tmp/bui-ports/_scaffold-<slug>
   npm_config_user_agent=bun bunx bejamas@0.5.0 init -t astro -b neutral -y -d -f
   mv my-app /tmp/bui-ports/<slug> && cd /tmp/bui-ports && rmdir _scaffold-<slug>
   cd /tmp/bui-ports/<slug> && bun add bejamas@0.5.0
   ```
   (The template pins `bejamas ^0.4.1`, so the `bun add` is required.) Add components with `bunx bejamas add <name...> -y`. Components land in `src/ui/<name>/` and are imported as `@/ui/<name>`. Available components in 0.5.0: accordion alert avatar badge breadcrumb button button-group card carousel checkbox collapsible combobox command date dialog drawer dropdown-menu field hamburger-menu hover-card icon input input-group item kbd label link-group marquee native-select navigation-menu popover radio-group select separator skeleton slider spinner sticky-surface switch table tabs textarea toggle toggle-group tooltip.
4. **Use bejamas/ui components wherever the original uses a shadcn component** (Button, Card, Badge, Accordion, NavigationMenu, Tabs, Avatar, Input, Carousel, Marquee, Dialog/Drawer/HamburgerMenu for mobile nav, etc.). Restyle through props, classes and theme tokens rather than rewriting components. If you must edit a copied `src/ui` component, keep the edit minimal and record it as a finding.
5. **Interactive behavior comes from `@data-slot` primitives** (these are the bejamas components' dependencies). Don't write custom JS controllers for menus, accordions, tabs, carousels, dialogs or toggles. If no primitive fits, use the closest one or a static version and record the gap. A small script that only listens to primitive events to update derived display (e.g. a monthly/yearly price label) is OK. Plain CSS animations and transitions are OK. Approximate framer-motion entrance effects with CSS (`@starting-style`, keyframes, `animation-timeline: view()`) where cheap, or drop them, and record it either way.
6. **Comparison button**: every page gets a floating button fixed to the bottom-right corner (`fixed bottom-4 right-4 z-[9999]`). It links to the original demo URL (`target="_blank" rel="noopener"`), is labelled "View original", and uses a bejamas `Button` (as a link). It must stay visible above everything in both themes.
7. **Assets, fonts and colors match the original**:
   - Clone the source repo to `/tmp/bui-ports/_src/<slug>` with `git clone --depth 1`. The source code is the contract for content and structure. The live demo shows the actual runtime result: check it whenever the two drift (record any drift).
   - Copy images, SVGs, logos and favicons from the source repo's `public/` (or download them from the demo) into the port's `public/`. Don't hotlink to the demo.
   - Fonts: use the same families via Astro's fonts API, by editing `BEJAMAS_ASTRO_FONTS` in `astro.config.mjs` and the `<Font>` tags in the layout. Use `fontProviders.google()` for Google fonts. For Geist or other local fonts, use `fontProviders.local()` or copy the font files. Map `--font-sans`, `--font-heading` and `--font-mono` the way the original does.
   - Colors and radius: translate the original's CSS variables (`globals.css`, `tailwind.config`) into the port's `src/styles/globals.css` `:root` and `.dark` tokens. The bejamas theme defaults (e.g. its blue `--primary`) must not leak through where the original differs. Match the original's default color mode (if the demo loads dark, the port loads dark).
   - Icons: `@lucide/astro` for lucide icons (already installed). Copy brand SVGs inline from the source.
8. **Verification**: build with `bun run build`, then serve with `bun run preview --port <port>` (run it in the background and kill it when you're done). Compare screenshots using the shared tool:
   ```sh
   bun /tmp/bui-ports/_tools/shot.mjs <url> /tmp/bui-ports/<slug>/.compare/original.png 1440 --chunks
   bun /tmp/bui-ports/_tools/shot.mjs http://localhost:<port>/ /tmp/bui-ports/<slug>/.compare/port.png 1440 --chunks
   ```
   Also take 390px-wide (mobile) shots. Add `--dark` to emulate a dark color scheme. View the PNG chunks with the Read tool and iterate until sections, spacing, typography and colors are close. Keep the final screenshots in `.compare/` (git-ignored is fine). Fix console errors and confirm that interactive widgets (mobile menu, accordion, tabs, carousel) work. A quick Playwright script under `.compare/` is fine for click tests.
9. **Reference material (read-only, never modify)**:
   - bejamas/ui source repo: `<bejamas-ui>` (a checkout of this repository). Canonical component source is in `packages/registry/src/ui/<name>/`. Docs are in `apps/web/src/content/docs/` (look for component `.mdx` files), and `@data-slot` READMEs are in the port's `node_modules/@data-slot/*/README.md`.
   - Earlier block-level migration guidance (React blocks → bejamas): `git -C <bejamas-ui> show 72c8b6f:skills/migrate-react-blocks/SKILL.md` and `git -C <bejamas-ui> show 72c8b6f:skills/migrate-react-blocks/references/findings.md`. Read both before you start porting.
   - Don't touch other agents' directories under `/tmp/bui-ports/`.

## Findings (required deliverable)

Write `/tmp/bui-ports/<slug>/MIGRATION_FINDINGS.md`. The findings are as important as the port: they will be aggregated into a migration skill. Be concrete and evidence-based (file names, class names, component names, error messages). Use this structure:

```md
# <slug> migration findings

## Summary
- Source: <repo> @ <commit sha>, Next.js <version>, Tailwind <v3|v4>, shadcn style/base color, UI libs used (framer-motion, magic ui, aceternity, radix, embla, etc.)
- Demo: <url>
- Port: /tmp/bui-ports/<slug> (port <port>)
- Fidelity verdict: faithful | close with documented approximations | partial
- Effort hotspots: <top 3>

## Sections ported
| Section | Source file | bejamas components used | Fidelity | Notes |

## Component mapping (shadcn/React → bejamas/Astro)
| Source | Port | Notes on API differences (props, asChild, variants, sizes, default classes) |

## Gaps in bejamas/ui (missing components, variants, props, primitives)
- What was missing, which section needed it, what you did instead.

## Bugs / issues in bejamas 0.5.0 or its CLI
- Reproduction + observed vs expected.

## Theming, fonts, assets
- How you translated tokens and fonts, Tailwind v3→v4 issues, what didn't map.

## Animation & third-party libraries
- framer-motion / magic ui / etc.: what you replaced them with or dropped.

## Next.js-specific translations
- next/image, next/link, next/font, next-themes, i18n routing, server components, metadata, etc.

## Verification
- Build result, screenshot comparison notes per breakpoint, interactive checks performed, remaining visual differences.

## Lessons for a migration skill
- Reusable rules/recipes you'd want to know before starting the next port. Mark which are general vs. specific to this site.
```

Final message to the orchestrator: a ≤15-line summary covering fidelity verdict, top gaps/bugs, and paths to the port and findings.
