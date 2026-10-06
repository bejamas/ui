# launch-ui migration findings

## Summary
- Source: https://github.com/launch-ui/launch-ui @ `b0d4d5bce91d13523450416ce1797109076b2787`, Next.js 16.3.4 (App Router, Turbopack), React 19.2.8, Tailwind v4.3.3 (`@tailwindcss/postcss`, `@theme inline`, `@utility`), shadcn `new-york` / base color `zinc` (heavily customised tokens), `tw-animate-css`. UI libs in the repo: Radix (accordion, dialog→Sheet, dropdown-menu, navigation-menu, slot), lucide-react, next-themes, class-variance-authority. No framer-motion: all motion is Tailwind keyframes (`animate-appear`, `animate-appear-zoom`, group-hover keyframes). The **live demo** additionally uses Radix Tooltip + ToggleGroup, an embla-style carousel (`data-slot="carousel"`, `translate3d` track) and a magic-ui-style marquee (`animate-marquee`, `--gap`, `--duration`).
- Demo: https://www.launchuicomponents.com/ (the pro marketing site, not the open-source `app/page.tsx`)
- Port: `/tmp/bui-ports/launch-ui` (preview port 4407), Astro 7.3.5 + bejamas 0.5.0, bun.
- Fidelity verdict: **close with documented approximations**. At 1440px and 390px every section lands within 0–3px of the demo's vertical position (total page height 14216 vs 14212 at 1440, 15826 vs 15826 at 390); colours, fonts, copy, assets and all interactive widgets match. Approximations: gallery block previews are screenshots (demo renders live scaled React), Shuffle only randomises theme/radius, the Marquee loop/duplication differs slightly.
- Effort hotspots: (1) repo↔demo drift: the demo home is a different, much larger page (13 sections + customizer) than the repo's 9-section `app/page.tsx`, so most markup had to be recovered from the rendered DOM; (2) launch-ui's `glass-*` custom utilities fighting the default border/background classes baked into bejamas Button/Card/Carousel/ToggleGroup (needed a tailwind-merge extension plus `!` overrides); (3) intricate illustration markup (globe SVG, code editor, radar, pipeline) that has no component equivalent and was carried over as raw HTML partials.

## Sections ported
| Section | Source file | bejamas components used | Fidelity | Notes |
|---|---|---|---|---|
| Announcement bar | demo only (not in repo) | – | faithful | `sm:fixed` bar above navbar, lucide `Dot`/`ArrowRight`. |
| Navbar | demo navbar (repo `sections/navbar/default.tsx` differs) | Badge, Button (`as="a"`, ghost icon), Drawer (`side="left"`) for the Sheet, DropdownMenu (theme) | faithful | Repo navbar has NavigationMenu + Sign in/Get Started; demo has plain links + version badge + GitHub/X + theme dropdown. Ported the demo. |
| Preview toolbar (customizer) | demo only | ToggleGroup ×4, Button | close | Color theme (8 palettes), radius, light/dark, layout lines all work through toggle-group events. Shuffle randomises color + radius only (demo also shuffles section variants, which the port does not ship). |
| Hero | demo `hero-variants > :nth-child(1)` (repo `sections/hero/default.tsx` is the centered variant 2) | Badge, Avatar, Tooltip, Button (via `LinkButton`) | faithful | Left-aligned hero with three skewed mockups and the social-stats tooltip. `animate-appear` delays kept. |
| Logos | `sections/logos/default.tsx` | Badge | faithful | Identical to repo. |
| Bento grid | demo only | Card, CardContent, CardTitle, CardDescription | faithful | 6 cards; the six `card-visual` illustrations are raw HTML partials in `src/components/illustrations/*.html` injected with `set:html`. Hover animations (impulse, hover, ping, spin-slow, code tab slide) work via CSS. |
| Items | `sections/items/default.tsx` | – (repo `Item` is launch-ui's own, not shadcn) | faithful | Demo copy differs from repo ("Made for localisation", "your any headless"), icons `text-brand`. |
| Feature ("You can change anything") | demo `feature-variants > :nth-child(5)` | – | faithful | Rising-planet illustration ported as markup. Heading `h1`→`h2` (demo has two h1s). |
| Testimonials carousel | demo only | CarouselRoot/Content/Slide/Previous/Next, Avatar | faithful | Brand logos are raw SVG partials. Prev/next disabled at ends like embla. |
| What's inside? (gallery) | demo only | Card, CardContent, CardTitle, CardDescription | approximation | 16 block cards use PNG screenshots of the demo's live scaled previews (dark/light, desktop + mobile via `<picture>`). 7 template cards use the real template screenshots. |
| Recently built with Launch UI | demo only | Carousel (`data-slides="multiple"`) | faithful | Native scroll-snap instead of embla transform; visible neighbour stays active/clickable. |
| Stats | demo `stats-variants > :nth-child(1)` (repo stats differs) | – | faithful | Glass cards, 54.4k/23.5k/2701/28.2k. |
| Social proof marquee | demo only | Marquee ×2, Avatar | close | Two rows (second reversed), pause on hover, edge fades. Loop period/duplication differ (see Animation). |
| Pricing | `sections/pricing/default.tsx` + `ui/pricing-column.tsx` | Button (via `LinkButton`) | faithful | Demo title/description changed ("Level-up your design game, today"). PricingColumn is launch-ui's own component, kept as markup. |
| FAQ | `sections/faq/default.tsx` | Accordion, AccordionItem, AccordionTrigger (`icon` slot), AccordionContent | faithful | Demo uses glass triggers + plus icon rotating 45°; questions/answers differ from repo (answers recovered by clicking each item on the demo). |
| CTA | `sections/cta/default.tsx` | Button (via `LinkButton`) | faithful | Hover-lifted glow. |
| Footer | demo footer (repo `sections/footer/default.tsx` differs) | – | faithful | Demo has 4 link columns + description, no mode toggle. |
| Layout lines | `ui/layout-lines.tsx` | – | faithful | Hidden by default (`--line-width: 0`), toggled by the toolbar. |

## Component mapping (shadcn/React → bejamas/Astro)
| Source | Port | Notes on API differences |
|---|---|---|
| `Button` (cva variants `default` gradient, `glow` glass, `ghost`; `asChild` + `<a>`) | `@/ui/button` `Button as="a"` wrapped in `src/components/ui/LinkButton.astro` | bejamas has no `glow`/gradient variant. Classes from `src/lib/launch-button.ts` are layered on top; the bejamas default variant's `bg-primary hover:bg-primary/90` must be neutralised with `bg-transparent hover:bg-transparent`, `rounded-lg`→`rounded-md`, and `active:scale-98` reset (`active:scale-100`). `asChild` → `as="a"`. |
| `Badge` (`variant="outline"`, `brand`, size `sm`, rounded-full, `px-2.5 py-1`) | `@/ui/badge` `shape="pill"` | bejamas Badge has fixed `h-5/h-6`, `text-sm`, `font-medium`; override with `h-auto px-2.5 py-1 text-xs font-semibold`. No `brand` variant → classes. |
| `Card` + `CardContent/Title/Description` (launch-ui `card.tsx`, glass-1) | `@/ui/card` | bejamas Card ships `ring-1 py-6 border-none … border border-border bg-card shadow-lg text-sm`. Needed `ring-0 p-6 bg-transparent text-base` and the glass-aware `cn` (below). CardTitle is a `div` (wrapped an `h3` inside). |
| `Accordion type="single" collapsible` | `Accordion` (single + collapsible are the defaults) | Trigger icon replaced through `slot="icon"`; the icon wrapper is forced to `size-4` by the trigger's `**:data-[slot=accordion-trigger-icon]:size-4`, override with `**:data-[slot=accordion-trigger-icon]:size-auto`. Open state is `aria-expanded`, not `data-state=open` (`[&[data-state=open]_svg]:rotate-45` → `aria-expanded:[&_svg]:rotate-45`). |
| `Sheet` (`side="left"`, Radix Dialog) | `Drawer side="left"` + `DrawerTrigger/Content/Title/Close` | Popup geometry (width 340px, rounded corners) comes from an unlayered `<style is:global>` in DrawerContent, so Tailwind classes need `!` (`w-3/4! rounded-none! px-0!`). Backdrop class is hard-coded (`bg-foreground/20`); restyled via `[data-slot="drawer-backdrop"]` in globals.css to match `bg-black/80`. |
| `DropdownMenu` + `onClick={() => setTheme()}` | `DropdownMenu/Trigger/Content/Item value=…` | Theme applied in a script listening to `dropdown-menu:select` (`detail.value`). Trigger renders a bejamas Button (pass `variant="ghost"`). |
| Radix `Tooltip` (social stats) | `Tooltip/TooltipTrigger/TooltipContent` | Content always renders an arrow and uses inverted colours (`bg-foreground text-background`); hid the arrow with `[&>[data-slot=tooltip-arrow]]:hidden` and restyled to `bg-popover border`. |
| Radix `ToggleGroup type="single"` (customizer) | `ToggleGroup defaultValue spacing={1}` + `ToggleGroupItem value` | See Gaps (no "required" single mode) and Bugs (runtime-added classes). |
| embla `Carousel` (`CarouselContent -ml-4`, items `pl-4 basis-2/3`, `CarouselPrevious/Next` positioned) | `CarouselRoot` + `CarouselContent` + `CarouselSlide` + `CarouselPrevious/Next` (composable parts, not the all-in-one `Carousel`) | Native overflow scrolling instead of transforms. Nav buttons default to `variant="outline"` (adds `dark:border-input`), so pass `variant="ghost"` before adding `glass-4`. Multi-card strips need `data-slides="multiple"` passed as a raw attribute (no prop). |
| magic-ui `Marquee` (`[--duration:20s] [--gap:1rem]`, `reverse`, `pauseOnHover`, `repeat=4`) | `Marquee time={20} direction="left|right" variant="solid"` | No gap/pause/repeat props; used `[&>.marquee-content]:gap-4 pr-4 min-w-max` and `hover:[&>.marquee-content]:[animation-play-state:paused]`. |
| Radix `Avatar` | `Avatar` + `AvatarImage src` | Needs `overflow-hidden` + explicit size classes (`size-10`, `size-12`). |
| `next/image` | `astro:assets` `<Image>` / `getImage()` via `src/lib/images.ts` (`import.meta.glob`) | See Next.js translations. |
| launch-ui `Glow`, `Mockup`, `MockupFrame`, `Section`, `Screenshot`, `LayoutLines`, `PricingColumn`, `Item`, `Logo` | Astro components in `src/components/ui/` or inline markup | Not shadcn; ported 1:1 (cva → small prop maps). |
| `NavigationMenu` (repo navbar) | not used | The demo navbar has no NavigationMenu; repo-only. |

## Gaps in bejamas/ui (missing components, variants, props, primitives)
- **ToggleGroup single mode cannot be "required"**: clicking the pressed item clears the selection (`toggle()` → `t.clear()`). Radix/launch-ui's customizer always keeps one value. The toolbar script restores the last value by dispatching the documented `toggle-group:set` event when `toggle-group:change` reports an empty value. Candidate: a `data-required`/`allowEmpty=false` option in `@data-slot/toggle-group`.
- **Button has no gradient / glass variant** (`default` launch-ui gradient, `glow`); handled with class layering (`src/lib/launch-button.ts`).
- **Badge**: no `brand` variant and no way to drop the fixed `h-5/h-6` height other than `h-auto`.
- **Marquee**: no `gap`, `pauseOnHover`, `repeat` props; content is always duplicated exactly twice. A short row (3 cards) works only because the content is `min-w-full`.
- **Drawer**: no prop/class hook for the backdrop colour or for popup width/radius (unlayered CSS).
- **Tooltip**: no prop to omit the arrow or to use the popover (non-inverted) appearance.
- **CarouselRoot / Carousel**: no `slides` prop for the primitive's `data-slides="multiple"`; the bejamas `variant="single|multiple"` prop means something different (grid of 2 per slide), which is easy to confuse.
- **Live scaled block previews** (gallery cards render full sections at `scale(0.2)`): no component need, but porting them live would mean rendering every block twice; replaced with screenshots.
- Earlier finding "carousel with several visible cards: neighbours are inert" is **resolved** in `@data-slot/carousel` 1.1.1 via `data-slides="multiple"` (verified: 2 active slides, next control scrolls 864px, disabled state synced at ends).

## Bugs / issues in bejamas 0.5.0 or its CLI
1. **`bejamas add marquee` installs a Marquee that never animates.** `src/ui/marquee/Marquee.astro` uses `[animation:marquee-x_…]` / `marquee-y`, but those `@keyframes` live only in the repo's `packages/ui/src/styles/globals.css`; they are not in the registry item (`apps/web/public/r/styles/bejamas-juno/marquee.json` has no css) nor in `bejamas/tailwind.css`. Expected: keyframes shipped with the item (registry `css`/`cssVars`) or in `bejamas/tailwind.css`. Workaround: copied both keyframes into `@theme inline` in `src/styles/globals.css`.
2. **ToggleGroup controller re-adds variant classes at runtime, bypassing tailwind-merge.** `src/lib/toggle-group-controller.ts` → `syncItemAttributes()` does `item.classList.add(...toggleVariants(...).split(/\s+/))`, so `h-9 min-w-9 px-2 hover:bg-muted aria-pressed:bg-muted` come back after `cn()` removed them. Observed: `class="… p-1 …"` rendered with 4px 8px padding (runtime `px-2` wins). Workaround: `p-1!`, `px-0!`, `p-2!`. Expected: the controller should not overwrite server-rendered classes (or only set data attributes).
3. **ToggleGroup `defaultValue` array is joined with `","`** (`ToggleGroup.astro`: `defaultValue.join(",")`) while `@data-slot/toggle-group` splits `data-default-value` on whitespace. Multiple-mode defaults like `["bold","italic"]` would select nothing. (Not hit by this port: single values only.)
4. **Card's own class list is contradictory**: `border-none` (border-style) and later `border border-border` both survive `cn()`, so the Card never shows a border unless `border-solid` (or another border-style class) is added; any custom border utility on Card is silently invisible. Hit with launch-ui's `glass-1` cards.
5. **Removing a component directory leaves its `@data-slot/*` dependency** in package.json (had to `bun remove @data-slot/hover-card @data-slot/collapsible` by hand). Minor CLI ergonomics.
6. Scaffold's `@custom-variant dark (&:is(.dark *))` does not match the `<html class="dark">` element itself; launch-ui uses `&:where(.dark, .dark *)` — replaced (no visible issue, but `dark:` on `html`/`body` would not apply with the scaffold variant).

## Theming, fonts, assets
- **Tokens came from the live demo, not the repo.** The demo injects a customizer `<style>` (`--brand: var(--brand-ember); --background: var(--background-ember); --muted: …; --radius: var(--radius-default); --line-width: 0`) and a palette (`--brand-{ember,fire,ultraviolet,titanium,ice,holo,emerald,electro}[-foreground]`, `--background-*`) in light and dark. Repo `app/globals.css` uses `--radius: 0.625rem` and zinc backgrounds; the demo computes `--radius: 0.5rem` (cards 12px, buttons 6px) and `--background: lab(2.487% …)`. Values were copied from the demo's computed CSS (`lab()` form) into `:root`/`.dark` in `src/styles/globals.css`; the bejamas blue `--primary` was replaced (`--primary: var(--brand)` light, `oklch(0.985 0 0)` dark).
- Palette `--radius-xl: 2rem` collides with Tailwind's `--radius-xl` theme key; renamed to `--radius-preset-xl`. It works in the demo only because `@theme inline` inlines `calc(var(--radius) + 4px)` into utilities.
- Customizer state maps to `<html data-color|data-radius|data-lines>` + `.dark`, with CSS selectors in globals.css (no runtime style injection).
- `@theme inline` additions: `--color-brand*`, `--color-light*`, `--radius-2xl`, `--spacing-container(-lg)` (gives `max-w-container`), shadow tokens using `--shadow`/`--shadow-strong`, `--breakpoint-xs`, animations (`appear`, `appear-zoom`, `hover`, `hover-reverse`, `impulse`, `orbit`, `spin-slow`).
- `styles/utils.css` (`@utility glass-1…5`, `fade-*`, `line-*`) copied verbatim to `src/styles/launch-ui.css`; Tailwind v4 `@utility` + `@apply dark:` works unchanged.
- **glass-* vs bejamas default classes**: tailwind-merge does not know `glass-*`, so `border-border`/`bg-primary`/`bg-card`/`border-none` from bejamas components survived and (being core utilities emitted after the custom utility) overrode the glass borders. Fixed by extending tailwind-merge in `src/lib/utils.ts` (`classGroups.glass`, `conflictingClassGroups.glass: ["border-color","bg-color","border-style"]`). Variant-scoped defaults (e.g. Carousel nav `dark:border-input`) still needed a different base variant.
- Fonts: Inter (variable 100–900) as `--font-sans` and IBM Plex Mono 400 as `--font-mono` via `fontProviders.google()` in `BEJAMAS_ASTRO_FONTS`; `<Font cssVariable="--font-sans" preload />` + `<Font cssVariable="--font-mono" />` in the layout. `--font-heading` = sans. The repo only loads Inter; Plex Mono is demo-only (code-editor illustration).
- Assets: repo `public/` has only `dashboard-*.png`, favicon, og; every other image (app-tasks, examples, mobile, template and site screenshots, 11 avatars) was downloaded from the demo origin. Gallery block thumbnails are Playwright element screenshots (`public/blocks/<slug>-<light|dark>[-m].png`, captured with the fixed toolbar hidden).
- Raw HTML partials: classes copied from the DOM keep `&amp;` (`[&amp;_svg]:h-[100%]`). The browser decodes it, but Tailwind's scanner reads the file literally and never generates `[&_svg]:h-[100%]`; the globe card rendered 512px instead of 308px on mobile until `&amp;` was unescaped inside `class` attributes.
- Default colour mode: `<html class="dark" style="color-scheme: dark">` + an inline script honouring `localStorage.theme` (light/dark/system), matching next-themes `defaultTheme="dark"`.

## Animation & third-party libraries
- No framer-motion in source or demo. Tailwind keyframes (`animate-appear` with `delay-100/300/500/1000/1500/2000`, `animate-appear-zoom`) ported as-is (Tailwind v4 accepts arbitrary `delay-*` numbers).
- Demo-only `html:not(.mounted) * { animation-play-state: paused }` gate (holds animations until hydration) was dropped: Astro has no hydration step, animations start on load.
- Hover keyframes in illustrations (`group-hover:animate-impulse|hover|hover-reverse|ping|spin-slow|orbit`) reproduced via `@theme` `--animate-*` tokens.
- Embla carousel → `@data-slot/carousel` native scroll + snap (no transform track, drag enabled by default in bejamas).
- Marquee: demo track = 4 copies, `translateX(calc(-100% - var(--gap)))`; bejamas = 2 copies `translateX(-100%)`. Gap moved into each copy as `pr-4` so the loop has no 16px jump; visual density is the same at 1440px.
- Theme switching: next-themes → inline head script + two small listeners (dropdown `dropdown-menu:select`, toggle-group `toggle-group:change`) that only set `html` class/attributes and localStorage.

## Next.js-specific translations
- `next/image` → `astro:assets`. Screenshots moved to `src/assets/images`, resolved by name through `import.meta.glob` (`src/lib/images.ts`), rendered with `<Image widths sizes format="webp">` (2.5MB PNG → ~120KB webp). **Gotcha**: giving `<Image>` both `width` and `height` with a different aspect ratio than the source center-crops it (next/image only sets attributes); template/site screenshots lost their top until `height` was removed. Images embedded in raw HTML partials get optimised URLs via `getImage()` + string replace.
- `next/font/google` (Inter, IBM Plex Mono variables on `<body>`) → Astro fonts API (`<Font>`), hashed family names (`Inter-2c9bcd…`).
- `next-themes` `ThemeProvider attribute="class" defaultTheme="dark" enableSystem` → inline script + listeners (see above).
- `next/link` → `<a>`. Secondary routes (`/docs/...`, `/blocks`, `/templates/...`, `/pricing`, `/feedback-program`) point at the same URL on the original demo.
- Metadata API → `<title>`, description, OG/Twitter meta in `Layout.astro`.
- `"use client"` components (Navbar, Navigation, ModeToggle, Sheet, Accordion) → server-rendered Astro with `@data-slot` primitives; no client framework.
- RSC "variants" mechanism (`.hero-variants > *:nth-child(n)` hidden via CSS, Shuffle swaps them) → only the visible variant is rendered.

## Verification
- `bun run build`: passes, 1 page, no warnings; `bun run preview --port 4407`.
- Screenshots (dark, `--chunks`) in `.compare/`: `original*.png` / `port*.png` at 1440 and `original-m*.png` / `port-m*.png` at 390, plus `port-sheet.png`, `port-tooltip.png`, `port-light-top.png`, `port-ultraviolet.png`.
- Section geometry (`.compare/sections.mjs`): every section top/height within 0–3px at 1440 and identical at 390. Remaining 1–3px: hero (+1px, webp rendition rounding), gallery (+3px, template image heights).
- Interactive checks (`.compare/interact.mjs`, Playwright): accordion single/collapsible open/close; testimonials carousel prev disabled at start, next → "Marcus Rodriguez", next disabled at end; built-with carousel scrolls 0→864px with 2 active slides; tooltip opens on hover; theme dropdown Light → `.dark` removed and toolbar Appearance syncs to `light`; toolbar Dark/color/radius/lines/Shuffle update `html` state; re-clicking a pressed color keeps it selected; mobile drawer opens/closes; no console errors or warnings; no horizontal overflow at 390/1024/1280/1440.
- Remaining differences: gallery block previews are static images (no hover-live content, mobile/desktop pair only, md breakpoint uses the desktop image); Shuffle does not swap section variants; at 768px both the demo (789px) and the port (795px) overflow horizontally because the navbar does not fit; drawer close button has no auto-focus ring as Radix shows; marquee duplicates content 2× instead of 4×.

## Lessons for a migration skill
- (General) **Check whether the demo is the repo.** For template products the public site is often the paid/pro marketing page. Dump the rendered DOM (Playwright `page.content()` after scrolling), split it by top-level sections, and diff against `app/page.tsx` before writing code. Record drift per section.
- (General) For hidden variant systems (`.x-variants > *:nth-child(n){display:block}`), read the injected `<style>` to know which child is visible; it is not always the first (`feature-variants` showed #5).
- (General) **Read tokens from computed CSS of the live site**, including injected `<style>` blocks; the repo `globals.css` can differ (radius, background, extra palettes, extra fonts).
- (General) When the source has custom utilities that set border/background (`glass-*`, gradients), extend tailwind-merge in `src/lib/utils.ts` so bejamas default `border-*`/`bg-*` classes are dropped. Without it, core utilities override the custom utility regardless of class order.
- (General) Default classes that bejamas components add **outside** `cn()` (ToggleGroup controller `classList.add`, unlayered `<style is:global>` in Drawer) cannot be overridden by class order; use `!` and record it.
- (General) bejamas Card has `border-none`; add `border-solid` (or a border-style-setting utility) when the source card has a visible border.
- (General) After `bejamas add marquee`, add the `marquee-x`/`marquee-y` keyframes yourself (until the registry ships them).
- (General) Carry intricate illustration markup as raw `.html` partials + `set:html`, but unescape `&amp;` inside `class` attributes or Tailwind will not generate arbitrary-variant classes.
- (General) `next/image` → `astro:assets`: do not pass `height` unless the aspect ratio matches the source, or it crops.
- (General) For multi-card carousels use the composable `CarouselRoot/Content/Slide/Previous/Next` with `data-slides="multiple"`; the all-in-one `Carousel` adds counter/grid layout you usually do not want.
- (General) Radix single ToggleGroup used as a settings switch needs a "keep last value" listener (primitive allows empty selection).
- (Site-specific) Launch UI's customizer maps cleanly to `html[data-*]` attributes + CSS; rename palette vars that collide with Tailwind theme keys (`--radius-xl`).
- (Site-specific) Gallery thumbnails that are live scaled renders are cheaper as element screenshots (capture both themes and a mobile set, hide fixed overlays first).
