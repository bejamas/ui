# shadcnstudio-bistro migration findings

## Summary
- Source: https://github.com/shadcnstudio/shadcn-nextjs-bistro-landing-page-free @ `636d50d2036baf23f0303bc2c98e7bc2d6432bcd`, Next.js 16.2.6 (App Router, React 19.2), Tailwind v4.3 (`@import 'tailwindcss'`, `tw-animate-css`, `shadcn/tailwind.css`), shadcn style `radix-luma`, base color `neutral`, built from shadcn/studio blocks. UI libraries: `radix-ui` (unified package), `embla-carousel-react` + `embla-carousel-autoplay`, `next-themes`, `lucide-react`, plus a custom shadcn-studio `Rating` component. No framer-motion and no magic ui.
- Demo: https://shadcn-nextjs-bistro-landing-page.vercel.app
- Port: /tmp/bui-ports/shadcnstudio-bistro (port 4414), Astro 7.3.5, bejamas 0.5.0, `@data-slot/*` 1.1.1
- Fidelity verdict: **faithful** for layout, copy, assets, colors, fonts and breakpoints. Section heights match the demo to the pixel at 390, 768, 1024, 1280 and 1440 px (for example, 6512 px total at 1440). There are documented approximations in the hero carousels (slide alignment and autoplay) and in the nav active state.
- Effort hotspots: (1) three synced Embla carousels with autoplay in the hero, (2) hidden global CSS in the source that overrides button padding, (3) bejamas component defaults that differ from radix-luma (Card `border-none`, Button padding and border, Avatar ring).

## Sections ported
| Section | Source file | bejamas components used | Fidelity | Notes |
|---|---|---|---|---|
| Header (fixed, nav, theme toggle, CTA, mobile menu) | `components/layout/header.tsx`, `blocks/menu-navigation.tsx`, `blocks/menu-dropdown.tsx`, `layout/mode-toggle.tsx` | NavigationMenu (+List/Item/Link), Button, Tooltip, DropdownMenu (+Trigger/Content/Item) | Faithful | The scrolled header background uses a CSS scroll-driven animation instead of a scroll listener. The active nav link uses CSS `:target-current` (Chromium only) instead of the `useActiveSection` hook. |
| Hero ("Savor the taste of perfection") + dish/thumbnail/comment carousels | `blocks/hero-section/hero-section.tsx` | CarouselRoot/Content/Slide ×3, Button, Separator | Close | The carousels are synced through `carousel:change`/`carousel:set`, and autoplay is a 3 s `carousel:set {action:'next'}`. Thumbnails are start-aligned, not centered (see Gaps). |
| Popular dishes | `blocks/popular-dishes/popular-dishes.tsx` | Badge, Card, CardContent, CardTitle, Separator | Faithful | Pixel-identical in screenshots. |
| About us + stats card | `blocks/about-us-section/about-us-page.tsx` | Badge, Button | Faithful | `lucide` Sparkles, ChefHat, Users and Trophy icons via `@lucide/astro`. |
| Testimonials carousel | `blocks/testimonials-section/testimonials-section.tsx` | CarouselRoot/Content/Slide/Previous/Next, Card, Avatar, Badge | Faithful | Prev/next sit outside the slide column (allowed: the primitive finds the controls anywhere under the root). The disabled state comes from the primitive. Rating is ported as static markup. |
| New items (Fresh menu items) | `blocks/new-items-section/new-items.tsx` | Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, Button | Faithful | |
| Contact us (info cards; the source has no reservation form) | `blocks/contact-us-section/contact-us-page.tsx` | Badge, Card, CardContent, Avatar, AvatarFallback | Faithful | The task note mentions a "reservation form", but neither the source nor the demo has one. The section is image + 4 info cards. |
| Offers gallery | `blocks/offers-section/offers-section.tsx` | Badge, Button | Faithful | Kaushan Script overlay text via a `font-script` theme token. |
| Footer | `components/layout/footer.tsx` | Separator | Faithful | Slanted `clip-path`. Brand SVGs are inlined from `assets/svg/*`. |
| "Download" floating button | `components/layout/Download.tsx` | — | Omitted | It is in the source but **not rendered on the live demo** (no matching anchor in the DOM), and it would collide with the required "View original" button. |
| "View original" button | (brief requirement) | Button `as="a"` | n/a | `fixed right-4 bottom-4 z-[9999]`, with a ring so it stays visible on dark sections. |

## Component mapping (shadcn/React → bejamas/Astro)
| Source | Port | Notes on API differences (props, asChild, variants, sizes, default classes) |
|---|---|---|
| `Button asChild><Link>` | `Button as="a" href` | `asChild` → `as="a"`. radix-luma Button has `border border-transparent bg-clip-padding`, `gap-1.5`, `hover:bg-primary/80` and `active:translate-y-px`. bejamas has no border, `gap-2`, `shadow-xs`, `hover:bg-primary/90` and `active:scale-98`. Without the 1px transparent border, every button was 2px narrower (measured 131×40 vs 133×40). Fixed with a shared `lumaButton` class string. bejamas `lg` is `px-5`, radix-luma `lg` is `px-4`. |
| `Badge variant="outline" className="h-auto text-sm font-normal"` | `Badge variant="outline" class="h-auto rounded-3xl px-2 py-0.5 text-sm font-normal"` | bejamas Badge adds `size` (`h-6 text-sm`) and `shape` props. `h-auto` still wins through `cn`. The rendered height is 26 px in both. |
| `Card` (radix-luma: `rounded-4xl shadow-md ring-1`) | `Card` | bejamas Card's base classes contain **both `border-none` and `border`**. twMerge treats `border-none` as border-style and keeps it, so adding `border border-primary/10` still renders **no border**. `border-solid` is required (see Bugs). |
| `CardTitle` (div, `text-base font-medium`) | `CardTitle` | bejamas adds `text-lg md:text-xl leading-normal font-heading text-balance`. Explicit `md:text-*` and `leading-7` were needed to match the height (otherwise the New items section was 2 px taller). |
| `CardHeader`, `CardContent`, `CardDescription` | same | Equivalent px-6 / gap classes. |
| `Avatar size="lg"` + `AvatarImage` + `AvatarFallback` (Radix) | `Avatar size="lg"` + `AvatarImage` + `AvatarFallback` | radix-luma draws the ring with `after:border after:border-border after:mix-blend-darken`. The bejamas Avatar has the `after:` pseudo-element but no border. Its `AvatarImage` is `relative z-10`, so the ring also needs `after:z-20`. The fallback sits underneath the image (no load-state logic). |
| `Separator` (Radix, `data-horizontal`/`data-vertical`) | `Separator` | bejamas Separator renders no `data-slot`/`data-orientation`, so source classes such as `data-vertical:self-center` had to be rewritten to plain `self-center`. |
| `Carousel`/`CarouselContent`/`CarouselItem` (Embla, `opts`, `plugins`, `setApi`) | `CarouselRoot` + `CarouselContent` + `CarouselSlide` | Embla `opts.loop` → `data-loop`. There is no `setApi`; use the `carousel:change` / `carousel:set` events. Embla's default `align: 'center'` has no equivalent. shadcn's `-ml-4`/`pl-4` gutter pattern needs `gap-0 -ml-4 w-[calc(100%+1rem)]` on `CarouselContent` plus `overflow-x-clip` on the root, because the bejamas content element **is** the scroll viewport (shadcn has a separate overflow-hidden viewport around the flex track). |
| `CarouselPrevious`/`CarouselNext variant='default'` | `CarouselPrevious`/`CarouselNext variant="default"` | Same name and similar API. bejamas defaults to `outline icon-sm`. The source's `disabled:*` classes work because the primitive sets `disabled`. |
| `NavigationMenu viewport={false}` / `NavigationMenuLink` + `navigationMenuTriggerStyle()` | `NavigationMenu viewport={false}` / `NavigationMenuLink` | There is no exported `navigationMenuTriggerStyle`. Its classes were inlined. bejamas Link adds `hover:bg-muted focus:bg-muted rounded-sm p-2 text-sm`, which had to be overridden. |
| `DropdownMenu` / `DropdownMenuTrigger asChild><Button>` / `DropdownMenuItem asChild><Link>` | `DropdownMenu` / `DropdownMenuTrigger variant size` / `DropdownMenuItem class="p-0"><a>` | `DropdownMenuTrigger` renders a bejamas Button directly (it takes Button props). `DropdownMenuItem` has no `as`/`asChild`, so a link item is an `<a>` nested in `div[role=menuitem]` (the same pattern bejamas' own docs use in `PageTitle.astro`). The root's `lg:hidden` moves onto `DropdownMenu`. `DropdownMenuContent` defaults to `w-[var(--anchor-width)]` (36 px for an icon trigger), so `w-56` is required. |
| `Tooltip`/`TooltipTrigger asChild`/`TooltipContent` | same names | `asChild` exists here (wrapper div with `data-as-child`). |
| `Collapsible` (in `MenuDropdown` for nested nav groups) | not needed | The nav data has no nested groups, so the code path never renders. |
| `Rating` (shadcn-studio custom, read-only usage) | `src/components/Rating.astro` (static) | Read-only, so no interaction to port. Half stars use the source's absolutely positioned 50%-width overlay. |
| `next-themes` `ModeToggle` | `ModeToggle.astro` + inline head script | See Next.js translations. |

## Gaps in bejamas/ui (missing components, variants, props, primitives)
- **Carousel autoplay**: `@data-slot/carousel` has no autoplay or timer option. The hero uses `embla-carousel-autoplay` (`delay: 3000, stopOnInteraction: false`). The port dispatches `carousel:set {action:"next"}` every 3 s from the hero script (paused when the tab is hidden and disabled under `prefers-reduced-motion`). This is a command through the public event API, not a reimplementation, but it is block-level timing logic that belongs in the primitive.
- **Synced / thumbnail carousels**: there is no API to link carousels (Embla `setApi` + `scrollTo`). Authored `carousel-indicator` buttons must satisfy `indicator.closest('[data-slot=carousel]') === root` (checked in `@data-slot/carousel` dist), so thumbnails that live in a *separate* carousel cannot act as indicators. The port's hero script listens to `carousel:change` on the main and comments carousels, forwards `carousel:set {index}` to the others, maps a thumbnail click to `carousel:set` on the main carousel, and sets `data-current` on thumbnails (derived display).
- **Slide alignment**: reachable positions are always computed from slide *start* edges (`getBoundingClientRect()[edge]` in the dist). There is no `align: 'center'`. The demo's thumbnail strip centers the active thumbnail with neighbors cut off on both sides. The port's strip is start-aligned.
- **Infinite loop**: `data-loop` is a soft-wrap (it jumps from the last slide back to the first). Embla's `loop: true` scrolls seamlessly through cloned slides. In the port, a wrap visibly scrolls back across all slides. In multiple-visible mode, loop also wraps *position* indices (`index % count`), so forwarding a slide index to a loop strip lands on the wrong position. The port turns loop off on the thumbnail strip, so out-of-range indices clamp instead.
- **bejamas Carousel does not expose the primitive's `slides` option**: `variant="multiple"` on the bejamas Carousel/CarouselRoot means "two items per slide in a grid" (`group-data-[variant=multiple]/carousel:grid-cols-2`), not the primitive's `data-slides="multiple"` (keep every visible slide interactive). The port passes `data-slides="multiple"` as a raw attribute through `...rest` for the thumbnail strip and the 2-up testimonials. Otherwise visible neighbors are `inert`.
- **Link items in DropdownMenu**: `DropdownMenuItem` has no `as="a"`. With an `<a>` nested in the item, pointer clicks work, but Enter/Space on the focused item only fires `dropdown-menu:select` (the dist calls `preventDefault` and never follows `href`). The port listens to `dropdown-menu:select` and calls `location.assign(link.href)` only when `source === "keyboard"`. Verified with Playwright (Enter on "Testimonials" → `#testimonials`).
- **No Rating component** (the source's is shadcn-studio custom). A static port is fine for read-only use. An interactive rating would be a primitive gap.
- **Scroll-spy / active nav section**: there is no primitive for it. The port uses CSS `scroll-target-group: auto` + `a:target-current` (works in Chromium 140+, verified in Playwright's Chrome 153). Other browsers show no active state. Small behavior difference: the source clears the active state when no section is within 200 px of the top, but `:target-current` keeps the last passed section active.
- **Header "is scrolled" state**: replaced by a CSS scroll-driven animation (`animation-range: 0 1px`). The fallback (no `animation-timeline` support) is a permanently transparent header, which is what the source renders before hydration.

## Bugs / issues in bejamas 0.5.0 or its CLI
- **Card border cannot be enabled by class**: `Card.astro`'s base string is `"... border-none ... border border-border shadow-lg"`. Because twMerge treats `border-none` (style) and `border` (width) as different groups, a consumer's `class="border border-primary/10"` still renders `border-style: none`. Repro: `<Card class="border border-red-500">` shows no border. Expected: the border is visible. In Tailwind v4, `border` sets `border-style: var(--tw-border-style)` and `border-none` sets `--tw-border-style: none`, so even the default Card's `border border-border` never renders, which is probably unintended. Workaround: add `border-solid`. It works because `border-solid` comes later than `border-none` in the generated CSS, so the fix depends on stylesheet order. Verified in computed styles: `solid/1px` on all 15 cards.
- **`bejamas add` adds `shadcn` to devDependencies**: after `bunx bejamas add badge card carousel ...`, `package.json` gained `"shadcn": "^4.21.3"` in devDependencies, which an Astro app never uses.
- **Scaffold template default font loads only weight 400**: `BEJAMAS_ASTRO_FONTS` sets no `weights`, and Astro's default is `["400"]` (`astro/dist/assets/fonts/constants.js`), so every `font-semibold` heading is faux-bold until you add weights. The port sets `weights: ["100 900"]` for Outfit.
- **Scaffold layout markup**: `<html  lang="en">` (double space), and the `<Font>` tag is not indented. Cosmetic only.
- **DropdownMenu scroll lock reserves a gutter where no scrollbar is shown**: opening the menu sets `overflow:hidden; scrollbar-gutter:stable` on `<html>`. In headless Chromium at 390 px, this left a visible 15 px blank strip and reflowed the page while the menu was open. Radix only sets `overflow:hidden` on `body`. This may be specific to headless (hidden scrollbars), but it is worth checking on Windows/Linux with classic scrollbars.
- **LightningCSS (Astro's minifier) breaks scroll-driven animations**: `animation: header-scrolled linear both; animation-timeline: scroll(root block)` was folded into `animation: linear both header-scrolled scroll(root)`, which browsers reject (`animation-timeline` is reset-only in the shorthand), so the whole declaration was dropped. Workaround: `animation-timeline: var(--header-timeline)`. Not a bejamas bug, but it will hit every port that uses CSS scroll timelines. LightningCSS also warns that `:target-current` is "not recognized as a valid pseudo-class", but keeps the rule.

## Theming, fonts, assets
- Tokens: all of the source's `:root` and `.dark` OKLCH tokens (background, primary `oklch(0.55 0.22 27.03)`, card, muted, border, chart-*, sidebar-*, the near-transparent `--shadow-*` scale) were copied 1:1 into `src/styles/globals.css`. Missing `@theme inline` mappings were added (`--radius-2xl..4xl`, `--shadow-*`, sidebar colors, `--font-serif`, `--font-mono`, `--font-script`). bejamas' blue primary no longer leaks anywhere. The demo's `--shadow-md` is ~1% alpha, so the scrolled header and the cards look flat in both.
- Default mode: `ThemeProvider attribute='class' enableSystem={false}` resolves to **light** regardless of OS preference (the demo's `<html>` gets `class="light"`). The port's inline head script does the same (`localStorage.theme`, default light, also sets the `light` class and `color-scheme`). Verified: `--dark` emulation still loads light, and the toggle persists across reloads.
- Fonts (next/font → Astro fonts API): Outfit → `--font-sans` (weights 100–900, the body/heading font), Merriweather → `--font-serif`, Geist Mono → `--font-mono`, Kaushan Script → `--font-script` (used by the offers overlay text, `font-(family-name:--font-kaushan-script)` → `font-script`). The source maps its own `--font-outfit-sans` etc. variables; the port names the Astro CSS variables directly, following the scaffold's `--font-sans: var(--font-sans)` pattern.
- **Hidden global CSS in the source** (Tailwind v4, *unlayered*): `[data-slot='button'][data-size='lg']:not(.px-6) { @apply px-4 }` and the `default` → `px-3` variant. Unlayered rules beat every utility, so the components' `has-[>svg]:px-6`, `max-lg:px-3` and `max-sm:px-2.5` classes **never apply** on the demo. Copying the component classes verbatim produced buttons 16 px too wide (Order now 147 vs 131 px). The port drops the dead classes and uses `px-4`/`px-3`.
- The source also has unlayered `.input-*` size helpers (unused on this page) and base `cursor: pointer` rules for interactive roles. The cursor rules were ported.
- Assets: the whole of `public/` (favicons, `images/**` webp files, og-image) was copied. The source's `assets/svg/*.tsx` (logo, social icons) were converted to Astro SVG components. No hotlinks.

## Animation & third-party libraries
- `embla-carousel-react` → `@data-slot/carousel` via bejamas Carousel parts (native scroll-snap, drag, keyboard). The transition feel differs: native smooth scroll instead of Embla physics.
- `embla-carousel-autoplay` → 3 s interval dispatching `carousel:set` (see Gaps).
- "Shine" button hover (`before:` gradient + `background-position` transition): pure Tailwind, copied verbatim into a shared `shine` class string.
- `tw-animate-css` is already in the bejamas template, so dropdown and tooltip enter/exit animations come from the bejamas components.
- `animate-heartbeat` keyframes were ported to `@theme` but are unused, because the Download button is omitted.
- No framer-motion.

## Next.js-specific translations
- `next/link` → `<a>`. The source's `onClick={e => {e.preventDefault(); scrollToSection(id)}}` (smooth scroll with an 80 px offset and `history.replaceState`) became native anchors + `html.scroll-smooth` + `main *:scroll-mt-16`. One difference: the hash is now pushed to history instead of replaced, and the offset is 64 px instead of 80 (from `scroll-mt-16`, which the source also declares).
- `next/font/google` → Astro `fonts` config + `<Font cssVariable>` tags (only the sans font is preloaded).
- `next-themes` → inline `<script is:inline>` in `<head>` (FOUC-free) + `ModeToggle.astro` click handler. This is app state, not a UI primitive.
- `metadata` export (title template, description, icons, OG, Twitter) → static `<head>` tags in `Layout.astro`. JSON-LD → `<script type="application/ld+json" set:html>`. The `NEXT_PUBLIC_APP_URL` value maps to `Astro.site` (empty here).
- `'use client'` components (Header, Hero) → server-rendered Astro + small `<script>` blocks. `useState`/`useEffect` scroll hooks → CSS (scroll-driven animation, `:target-current`).
- `TooltipProvider` wrapper: not needed (tooltips are self-contained).

## Verification
- `bun run build`: succeeds. The only output is LightningCSS warnings about `:target-current`.
- Screenshots (`.compare/original-*.png` vs `.compare/port-*.png`, 1440 and 390 px chunks, `port-dark*.png`, `*-dark-toggle.png`, `*-m-menu.png`): every section matches visually. Section heights are identical to the demo at 390 / 768 / 1024 / 1280 / 1440 px (for example, 1440: home 778, popular 878, about 1236, testimonials 550, new items 916, contact 986, offers 913). Button widths and heights, the comment avatar x-position and the testimonial column widths were measured with `getBoundingClientRect` against the demo and match. Dark mode, toggled on both sites, matches.
- Interactive checks (Playwright, `.compare/interact.mjs`, `hero-test.mjs`, `kbd.mjs`):
  - Mobile dropdown: opens with 4 links, a pointer click navigates to `#testimonials` and closes, keyboard Enter navigates too.
  - Testimonials prev/next: scroll 0 → 400 → 800 → 400. The disabled state toggles at the ends, the same as the demo.
  - Hero: autoplay advances main, comments and thumbnail highlight together every 3 s. Clicking a thumbnail and pressing ArrowRight on the comments carousel keeps all three in sync.
  - Theme toggle: switches and persists.
  - Header: transparent at the top, `--background` after scrolling.
  - Nav: `:target-current` highlights the section in view.
  - No console errors or page errors.
- Remaining visual differences:
  - The thumbnail strip is start-aligned instead of centered.
  - Carousel wrap-around rewinds instead of looping seamlessly.
  - The mobile dropdown is shifted by the scroll-lock gutter in headless Chromium.
  - Screenshots catch carousels mid-transition because of autoplay, in both original and port.

## Lessons for a migration skill
- **(general)** Grep the source `globals.css` for *unlayered* rules that target `[data-slot=...]`. In Tailwind v4 they override every utility, so the classes in component JSX are not the real styles. Measure button boxes on the live demo before trusting the class strings.
- **(general, radix-luma / new-york-v4 shadcn styles)** Keep a "luma Button" class string handy: `border border-transparent bg-clip-padding gap-1.5 shadow-none hover:bg-primary/80 active:scale-100 active:translate-y-px`. `lg` padding is `px-4`.
- **(general)** On bejamas `Card`, always add `border-solid` when the source sets a border. Add `md:text-* leading-*` to `CardTitle` when the source overrides its size, because bejamas adds responsive sizes that a plain `text-lg` does not cancel.
- **(general)** For shadcn Avatar rings, add `after:z-20 after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten`.
- **(general)** Embla → `@data-slot/carousel`:
  - Map `loop` to `data-loop`.
  - Add `data-slides="multiple"` whenever more than one slide is visible. Do not use the bejamas `variant="multiple"`, which is a 2-up grid.
  - Recreate the shadcn `-ml-4/pl-4` gutter with `gap-0 -ml-4 w-[calc(100%+1rem)]` on the content and `overflow-x-clip` on the root.
  - Expect start alignment only, soft-wrap loop and no autoplay.
- **(general)** Synced carousels and autoplay: a block script may only bridge `carousel:change` → `carousel:set`. Keep it scoped per root with a double-init guard, and record it as a primitive gap.
- **(general)** For `next-themes` with `enableSystem={false}`, the default is light even under a dark OS. Port it as an inline head script with the same storage key (`theme`), and do not follow `prefers-color-scheme`.
- **(general)** For CSS scroll-driven animations under Astro, put `animation-timeline` behind a `var()`, or LightningCSS folds it into the shorthand and the browser drops it.
- **(general)** The scaffold font config loads only weight 400. Always set `weights` (a variable range like `"100 900"` for variable Google fonts) to match next/font's variable files.
- **(general)** `scrollToSection` helpers with `preventDefault` can become native anchors + `scroll-smooth` + `scroll-mt-*` on sections. Scroll-spy hooks can become `scroll-target-group` / `:target-current` as Chromium-only progressive enhancement.
- **(general)** Compare section heights with `document.querySelectorAll('main > section')` at several widths. It is a fast, objective fidelity check that is not disturbed by autoplaying carousels in screenshots.
- **(site-specific)** shadcn-studio templates ship a floating "Download" (heartbeat) button in `layout.tsx` that may not render on the demo. Check the live DOM before porting it. The task description's "reservation form" did not exist in the source; trust the source and demo over the task summary.
