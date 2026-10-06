# velora-saas migration findings

## Summary
- Source: https://github.com/ColorlibHQ/velora-ui @ `a07bcc129b45eeed3fc070357a6a74b876d96159`, Next.js 16.3.7, React 19.3, Tailwind v4.3 (`@tailwindcss/postcss`), shadcn `radix-nova` style / `neutral` base color. Other libraries: `motion` 13 (framer-motion), `radix-ui`, `cmdk` (search palette), `next-themes`, `tw-animate-css`. `embla-carousel` is a dependency but this page doesn't use it. The repo is the whole Velora UI library site. Only `src/app/templates/saas/page.tsx` was ported, plus the `SiteHeader`/`SiteFooter` it renders.
- Demo: https://velora.colorlib.com/templates/saas
- Port: /tmp/bui-ports/velora-saas (preview port 4412), Astro 7.3.5, bejamas 0.5.0, @data-slot/* 1.1.1
- Fidelity verdict: **close, with documented approximations**. Layout, copy, colors, fonts, spacing, both themes and both breakpoints match. Page height is the same at 1440px. The differences are in motion: about 20 Velora motion components were rebuilt with CSS or SMIL, and six of them behave differently (listed below).
- Effort hotspots: (1) rebuilding motion components without a client runtime (typewriter, animated list, animated beam, dock, blur-fade); (2) composing the cmdk ⌘K dialog from bejamas Dialog + Command; (3) overriding bejamas size and radius defaults that differ from shadcn v4 "nova".

## Sections ported
| Section | Source file | bejamas components used | Fidelity | Notes |
|---|---|---|---|---|
| Scroll progress bar | velora/scroll-progress.tsx | – | close | CSS `animation-timeline: scroll(root)`, without motion's spring smoothing. Hidden where scroll timelines are unsupported. |
| Header (nav, search, theme toggle, GitHub, mobile nav) | components/site-header.tsx, search.tsx, theme-toggle.tsx, mobile-nav.tsx | Button (`as="a"`), Dialog + Command + Kbd, Toggle, Drawer | faithful | Nav links point to the matching URLs on velora.colorlib.com. Selecting a search result navigates to the original demo. The ⌘K / "/" shortcut is not wired (gap). |
| Hero (aurora, grid, badge, TextReveal h1, typewriter, CTAs, facts, dashboard mockup, stats) | saas/page.tsx, demo/hero-mockup.tsx, velora/* | Button (ghost link), ShimmerButton built on Button | close | The typewriter is CSS-only. NumberTicker values are static. Bars use a CSS scaleY entrance. |
| Logo marquee | saas/page.tsx, template/stack-logos.tsx | Marquee | faithful | Brand SVG paths copied inline. Pause on hover is done with an arbitrary variant. |
| Bento features (orbit, border beam, vertical marquee, meteors) | velora/bento-grid, orbiting-circles, border-beam, marquee, meteors, grid-pattern | Marquee (`direction="top"`) | faithful | All four effects were already CSS-driven or easy to make so. |
| Integrations beam | content/components/animated-beam/examples/default.tsx | – | close | Uses fixed-geometry SVG + SMIL `<animate>` instead of ResizeObserver measurement + motion. |
| Live activity (animated list + retro grid) | demo/activity-list.tsx, velora/animated-list.tsx, retro-grid.tsx | – | close | Precomputed CSS keyframes on one shared cycle. No spring physics and no pause on hover. |
| Spotlight cards | velora/spotlight-card.tsx | – | approximation | The glow fades in centred on hover. It does not follow the cursor. |
| Testimonial wall | saas/page.tsx, velora/tilt-card.tsx, avatar-circles.tsx | – | approximation | The cursor-driven 3D tilt is replaced by a fixed tilt on hover. |
| Pricing (Free / Pro + waitlist) | saas/page.tsx, template/waitlist-form.tsx | Button (outline), Input, ShimmerButton | faithful (UI) | There is no backend. The form uses `method="dialog"`, so validation runs and nothing is sent. |
| FAQ | saas/page.tsx | Accordion (single, collapsible) | faithful | |
| CTA (aurora, particles, shimmer, dock) | saas/page.tsx, velora/particles.tsx, dock.tsx | ShimmerButton on Button | close | Particles are CSS dots (no canvas). The dock uses `:hover`/`:has()` neighbour sizing instead of cursor-distance springs. |
| Footer | components/site-footer.tsx | – | faithful | The "top categories" are computed from the copied `components-meta.json` (`src/data/catalog.json`). |
| "View original" button | – | Button `as="a"` | n/a | `fixed right-4 bottom-4 z-[9999]`. Checked that it stays above the open Drawer and the Dialog overlay. |

## Component mapping (shadcn/React → bejamas/Astro)
| Source | Port | Notes on API differences |
|---|---|---|
| `Button` (radix-nova) | `@/ui/button` `Button` | `asChild` + `<a>` becomes `as="a" href`. The size scales differ. Nova: default h-8, sm h-7, lg h-9, icon size-8. bejamas: h-9, h-8.5, h-10, size-9, with `has-[>svg]:px-*` padding overrides. Each button needed explicit `h-*`/`px-*`, and the px overrides also had to beat `has-[>svg]:px-*`. bejamas `outline` adds `shadow-xs` and `hover:bg-accent hover:border-accent`, while nova uses `bg-background hover:bg-muted`. Override with `shadow-none bg-background hover:bg-muted hover:border-border`. |
| Velora `ShimmerButton` (plain `<button>`) | `ShimmerButton.astro` wrapping bejamas `Button` | bejamas Button classes are overridden via `cn`. `has-[>svg]:px-8` is needed so the icon-padding rule doesn't shrink it. The hero and CTA ShimmerButtons have no handler in the source either (inert `<button>`). The port keeps them inert. |
| `Accordion type="single" collapsible` | `Accordion collapsible` + Item/Trigger/Content | `type="single"` is the default, so drop it. `AccordionItem` always has `border-b`, while nova uses `not-last:border-b`, so `class="last:border-b-0"` is needed. The trigger is `py-4` in bejamas and `py-2.5` in nova. The content is `pb-4` and `pb-2.5` respectively. |
| `Input` | `@/ui/input` | bejamas sets the size through `data-[size=default]:h-9 …:px-3` and adds `shadow-xs`. A plain `h-11` loses to the data-size rule, so you have to add `data-[size=default]:h-11 data-[size=default]:px-2.5 shadow-none`. |
| `Sheet side="right"` (mobile nav) | `Drawer side="right"` + Trigger/Content/Header/Title/Description/Body/Close | `DrawerTrigger` is a plain `<button>` with no `as`/`asChild`, so the ghost icon-button classes were copied in by hand. Popup width (340px) and radius live in unlayered `<style is:global>`, which Tailwind utilities can't override without `!` (`w-72! rounded-none!`). |
| `cmdk` `Command.Dialog` + custom trigger button | `Dialog` + `DialogTrigger` + `DialogContent` + `Command`/`CommandInput`/`CommandList`/`CommandGroup`/`CommandItem`/`CommandEmpty` + `Kbd` | `CommandDialog` can't host a trigger (see Gaps), so the parts were composed by hand with CommandDialog's classes. `onSelect={() => router.push(href)}` becomes a `command:select` listener that looks up `data-href`. `shouldFilter={false}` plus Velora's custom ranking becomes the primitive's built-in filter, with `keywords=[title, category, description]`. |
| `ThemeToggle` (next-themes `setTheme`) | bejamas `Toggle` + listener script | The Toggle primitive owns the pressed state. A small script listens to `toggle:change` and applies `.dark` + `localStorage.theme`. It also dispatches `toggle:set` once so the pressed state matches the theme already applied. `aria-pressed:bg-transparent` hides the pressed styling. |
| `<kbd>` | `Kbd` | Kbd defaults (`h-5 font-sans text-xs font-medium`) needed `h-auto font-mono text-[10px] font-normal`. |
| Velora `Marquee` (`pauseOnHover`, `vertical`, `repeat=4`, `--gap`) | bejamas `Marquee` (`direction="top"`, `time`) | No `pauseOnHover`: use `hover:[&_.marquee-content]:[animation-play-state:paused]`. No gap variable: use margins on the items, or `[&_.marquee-content]:gap-4 pb-4`. Copies are fixed at 2. The content has `whitespace-nowrap`, which vertical cards have to undo (`[&_.marquee-content]:whitespace-normal`). The mask stops are 10% instead of 12%, overridden with an important arbitrary mask. |

## Gaps in bejamas/ui (missing components, variants, props, primitives)
- **CommandDialog has no trigger slot.** `CommandDialog.astro` passes its default slot into `DialogContent`, so a `DialogTrigger` can't sit inside the dialog root. The header search composes `Dialog`/`DialogTrigger`/`DialogContent` by hand.
- **No global keyboard shortcut for opening a dialog/command** (cmdk palettes use ⌘K and "/"). The port shows the `⌘K` hint but doesn't bind it. Writing a block-level keydown handler would go against the "primitives own interaction" rule.
- **Dialog doesn't focus the command input when it opens.** Focus goes to the `[data-slot=command]` root, and typing into it does nothing, so the first Playwright run typed "marquee" into nothing. **Fix: put `autofocus` on `CommandInput`.** `@data-slot/dialog` honours it. A `CommandDialog` default that autofocuses the input would remove this footgun.
- **Toggle has no client-derived initial state.** `defaultPressed` is server-only, but the theme is decided by an inline head script. Worked around with `toggle:set` after init.
- **Missing motion primitives** (the brief accepts CSS approximations; listed here as candidates):
  - in-view-once reveal (`whileInView` + `once`)
  - number count-up
  - pointer-tracking effects (spotlight, tilt, dock magnification)
  - an animated list / feed
  - an animated connector beam between measured elements
- **Marquee:** no `pauseOnHover`, `gap` or `repeat` props (see mapping).

## Bugs / issues in bejamas 0.5.0 or its CLI
- **Marquee keyframes are not installed.** `src/ui/marquee/Marquee.astro` animates with `marquee-x` / `marquee-y`. Neither `bejamas/tailwind.css` (`node_modules/bejamas/src/tailwind.css` defines only accordion/scroll-fade/shimmer keyframes) nor the scaffolded `src/styles/globals.css` defines them. They exist only in the bejamas repo's `packages/ui/src/styles/globals.css`. As installed by `bunx bejamas add marquee -y`, the Marquee renders static. **Fix used:** copy both `@keyframes` into `globals.css`.
  - Expected: `add marquee` injects the keyframes the same way it injects other CSS.
- **Drawer CSS is unlayered.** Width, border-radius and transform for `[data-slot=drawer-popup][data-swipe-direction=…]` are set in a non-layered `<style is:global>`, so a normal `class="w-72"` has no effect. Utilities need `!`.
- **Radius scale differs from current shadcn.** The scaffolded tokens use `--radius-xl: calc(var(--radius) + 4px)` (additive), while shadcn v4 nova uses `calc(var(--radius) * 1.4)` and also defines `--radius-2xl…4xl`. Without copying the source scale, `rounded-2xl` cards (most of this page) come out 16px instead of 18px.
- The scaffold's Layout has `<meta name="viewport" content="width=device-width">` without `initial-scale=1` (minor, changed).

## Theming, fonts, assets
- **Tokens:** `:root` / `.dark` were copied verbatim from `src/app/globals.css`. That includes Velora's extra `--brand`, `--brand-from/via/to`, the `--color-brand-*` theme mappings, and the multiplicative radius scale. The bejamas blue `--primary: oklch(0.4634 0.2647 264.76)` was replaced by Velora's `oklch(0.546 0.245 263)`. Dark mode keeps Velora's near-black `--primary-foreground` (an AA contrast choice).
- **Colour mode:** the source uses `next-themes` with `defaultTheme="system"` and `attribute="class"`. The port adds an inline `<script is:inline>` in `<head>` that reads `localStorage.theme` or `prefers-color-scheme` and sets `.dark` + `color-scheme` before paint. Light, dark and `--dark` screenshots all match the source.
- **Fonts:** `next/font/google` `Geist` (`--font-sans`) and `Geist_Mono` (`--font-geist-mono`) became `fontProviders.google()` entries in `BEJAMAS_ASTRO_FONTS` with `weights: ["100 900"]`, plus `<Font cssVariable=… />` tags. `@theme inline` maps `--font-mono: var(--font-geist-mono)` and `--font-heading: var(--font-sans)` as the source does.
- **Assets:** the only raster asset is `src/app/favicon.ico`, copied to `public/`. The page is pure markup. Brand marks (Next.js, React, TypeScript, Motion, Tailwind, shadcn, Radix, Base UI) were copied as inline SVG paths into `src/data/stack-logos.ts`. All other icons use `@lucide/astro` suffixed aliases (`GaugeIcon`, `CheckCircle2Icon`, … are all exported).
- **Data:** `components-meta.json` / `blocks-meta.json` / category JSON were reduced to `src/data/catalog.json` (100 components, 31 blocks). This keeps the computed counts and the search palette contents identical to the source.

## Animation & third-party libraries
All `motion` usage was removed. There is no client JS except the bejamas primitives plus three tiny listeners: theme (`toggle:change`), search navigation (`command:select`) and the Drawer's own init. Approximations:
- **BlurFade** (motion `whileInView`):
  - Above the fold (`trigger="load"`): a time-based CSS keyframe with the original `delay`.
  - Below the fold (`trigger="view"`): a scroll-driven `animation-timeline: view()` inside `@supports` and `prefers-reduced-motion: no-preference`. The motion `delay` becomes a shift of `animation-range` (`--bf-range-shift`).
  - Difference: the reveal follows scroll position rather than playing once. Firefox without scroll timelines shows content immediately.
  - The shared Playwright full-page screenshot rendered view-timeline content fully revealed, so it did not hide sections.
- **TextReveal** (staggered words): CSS keyframe per word with `--tr-delay`.
  - Live drift: the live demo renders `&nbsp;` inside each `inline-block` word span, while the source has `" "`. A plain space inside an `inline-block` is collapsed, which produced "Landingpagesthat". Putting the space outside changed `text-balance` line breaks on mobile. The port follows the live build (` ` inside the span).
- **Typewriter** (setTimeout state machine): fully CSS.
  - The source timeline (type 70ms/char, hold 1800ms, delete 40ms/char) is precomputed in frontmatter into one `@keyframes` per character, with `step-end` timing, on one shared cycle (8.93s). Hover pauses it; reduced motion shows "alive.".
  - The first attempt toggled `display:none ↔ inline` in the keyframes. Nothing rendered in Chromium, because a base `display:none` element never starts the animation. Animating `font-size: 0 ↔ 1em` works, and the caret follows the last visible glyph.
  - Verified by sampling: alive. → effortle… → effortless. → un….
- **AnimatedList** (AnimatePresence + layout springs): items are rendered newest-first. Each item gets a precomputed keyframe that grows `grid-template-rows: 0fr → 1fr` and `scale`/`opacity` in at `k × 1.8s`, then collapses at the end of the loop. The push-down effect is preserved. There is no spring overshoot and no hover pause.
- **AnimatedBeam** (ResizeObserver path measurement + motion gradient): the geometry is known from the layout (`h-80`, `py-6`, `size-13` nodes, hub at 50%). Each half is an SVG stretched from the node column to the hub with `preserveAspectRatio="none"` and `vector-effect="non-scaling-stroke"`. Horizontal scaling keeps the quadratic curve exact. The gradient sweep is SMIL `<animate>` with `keySplines="0.16 1 0.3 1"`. SMIL ignores `prefers-reduced-motion` (the source shows a still beam under reduced motion).
- **BorderBeam:** motion `offsetDistance` became a CSS `@keyframes` on `offset-distance` with the same `offset-path: rect(... round Npx)`.
- **NumberTicker:** CSS can't format a counter with thousands separators or decimals (`$48,291`, `4.6%`), so final values are rendered statically. The count-up is dropped.
- **Particles** (canvas + rAF): 50 deterministic CSS dots in `currentColor` with twinkle and drift keyframes.
- **SpotlightCard / TiltCard / Dock:** cursor-tracking handlers were dropped. These became a hover-centred glow, a fixed hover tilt, and `:hover` + `:has(+ :hover)` neighbour sizing (40/52/64px, checked in Playwright).
- Already-CSS Velora effects ported as-is: aurora, orbit, meteors, retro grid, gradient text, shimmer. Their keyframes are prefixed `v-` to avoid name clashes with bejamas / tw-animate.

## Next.js-specific translations
- `next/link` became `<a>`. Secondary routes point to `https://velora.colorlib.com/<path>` via `demoUrl()`.
- `next/font/google` became the Astro fonts API (above).
- `next-themes` became an inline head script plus the Toggle listener (above).
- `export const metadata = pageMetadata(...)` became `<title>` / `<meta name="description">` in the Layout.
- `useRouter().push` in the search palette became `window.location.href` on `command:select`.
- `useId()` in GridPattern, DotPattern, AnimatedBeam and Typewriter became random per-instance ids in frontmatter, so several instances on one page don't collide.
- React children mapping (`OrbitingCircles` distributes `children`, Dock maps `DockIcon`s) became arrays of icon components passed as props, because Astro slots are opaque.
- The waitlist `fetch('/api/waitlist')` (a Cloudflare Pages Function) has no static equivalent: the port uses `<form method="dialog">` and sends nothing. A hidden-when-empty `role="alert"` `<p>` was kept: removing it changed the `space-y-3` spacing by 12px, because the note stopped being `:not(:last-child)`.

## Verification
- `bun run build`: success, 1 page, no warnings. dist is 704 KB, including 4 Geist font files. Preview runs with `bun run preview --port 4412`.
- **Screenshots:** stored in `.compare/` (`original*.png`, `port*.png`, side-by-side `sbs-*.png`).
  - **1440 light:** full-page height matches the original; sections line up in a side-by-side overlay.
  - **1440 dark:** matches, including aurora intensity and card colours.
  - **390 mobile:** all sections match. The h1 now breaks "Landing / pages that feel / alive." like the live demo.
- **Interactive checks** (`.compare/interact.mjs`, Playwright, against the built preview):
  - Accordion: single-open, switches items, collapses.
  - Theme toggle: switches `.dark` and `localStorage`, and `aria-pressed` syncs.
  - Search dialog: opens, the input is focused, "marquee" filters to 4 items, Enter navigates to `velora.colorlib.com/components/marquee`.
  - Mobile Drawer: opens from the right at 288px wide and closes.
  - Dock: hover sizes are [40,52,64,52,40,40].
  - Marquee: animates (`marquee-x` transform changes).
  - Typewriter: cycles through the words.
  - Reduced motion: all BlurFades visible, all 6 list items shown, typewriter static on "alive.".
  - No console errors or warnings.
- **Remaining differences:**
  - NumberTicker shows final values with no count-up.
  - BlurFade reveals follow scroll position rather than playing once.
  - No cursor tracking in spotlight, tilt or dock.
  - No ⌘K shortcut.
  - The search uses the primitive's filter order, not Velora's ranking.
  - The drawer backdrop (`bg-foreground/20`) is lighter than Radix Sheet's overlay.

## Lessons for a migration skill
- **(general)** Before porting, grep every keyframe name used by an added bejamas component against `bejamas/tailwind.css` and `globals.css`. The Marquee ships without `marquee-x`/`marquee-y`.
- **(general)** Copy the source's whole `@theme inline` radius scale. shadcn v4 nova uses multiplicative steps and defines `2xl`–`4xl`, while the bejamas scaffold is additive. Also map any extra brand tokens (`--brand-*` here) into `@theme`.
- **(general)** bejamas Button, Input and AccordionTrigger are one size step larger than shadcn v4 nova. Plan explicit `h-*`/`px-*` overrides, and remember the `has-[>svg]:px-*` and `data-[size=default]:*` rules that win over plain utilities.
- **(general)** For a command palette, compose `Dialog` + `DialogTrigger` + `DialogContent` + `Command` yourself (CommandDialog has no trigger) and set `autofocus` on `CommandInput`. Navigate on `command:select` using a `data-href` lookup.
- **(general)** Theme toggle recipe: an inline head script sets `.dark` before paint, a bejamas `Toggle` sends `toggle:change`, and one `toggle:set` call syncs the initial pressed state.
- **(general)** Motion `whileInView` translates well to `animation-timeline: view()` (scroll-linked) for content below the fold and to time-based keyframes for the hero. Gate both behind `prefers-reduced-motion: no-preference` and `@supports`. Playwright full-page screenshots still render view-timeline content revealed.
- **(general)** You can't animate `display` from a `display:none` base in `@keyframes`. To show and hide inline glyphs with CSS (typewriter effects), animate `font-size` 0 ↔ 1em with `step-end`.
- **(general)** JS-state loops with a fixed schedule (typewriter, animated feed) can be precomputed into per-element keyframes on one shared duration in Astro frontmatter, emitted through `<style set:html>`. There is no runtime, and reduced motion is handled with one media query.
- **(general)** Measured SVG connectors whose endpoints are fixed in the layout can be drawn as stretched SVGs (`preserveAspectRatio="none"` + `vector-effect="non-scaling-stroke"`). SMIL `<animate>` handles gradient-attribute animation that CSS can't, but it doesn't respect reduced motion.
- **(general)** When a page is part of a library/docs site, its counts and lists usually come from generated JSON (`components-meta.json`). Copy a trimmed JSON rather than hardcoding numbers.
- **(general)** Compare inline whitespace against the live DOM. React output differed from the source (`&nbsp;` vs `" "` inside `inline-block` words), which changed both word gaps and line balancing.
- **(site-specific)** Velora's ShimmerButtons in the hero and CTA have no action in the source. Keep them inert rather than inventing destinations.
