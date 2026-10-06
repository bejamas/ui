# shadcnstudio-ink migration findings

## Summary
- Source: https://github.com/shadcnstudio/shadcn-nextjs-ink-landing-page-free @ `1068a68106bf8108626d9788e38b8800d04186f0`, Next.js 16.2.6 (App Router, React 19.2), Tailwind v4.3 (`@tailwindcss/postcss`, `tw-animate-css`, `shadcn/tailwind.css`), shadcn style `radix-vega`, base color `neutral` (fully overridden by a shadcn/studio "Ink" theme in `globals.css`). UI libs: `radix-ui` 1.4.3 (NavigationMenu, DropdownMenu, Collapsible, Tooltip, Tabs, ScrollArea), `lucide-react`, `next-themes`, `class-variance-authority`. No framer-motion, Magic UI, Aceternity or Embla.
- Demo: https://shadcn-nextjs-ink-landing-page.vercel.app
- Port: /tmp/bui-ports/shadcnstudio-ink (port 4415)
- Fidelity verdict: **faithful** (a few behavior details are approximated; see the gap list). Section geometry matches the demo to the pixel at 1440px and 390px (identical section offsets and heights: hero 0+878, blog 878+1584, CTA 2462+584, footer 3046+185; document height 3231 in both), in light and dark.
- Effort hotspots: (1) font fidelity (the scaffold's Inter config loads only weight 400 and no optical-size axis), (2) bejamas component defaults that differ from shadcn radix-vega (Card border/shadow, Badge radius, Button radius/border, Input size variants, TabsList indicator variant), (3) behavior that has no primitive (scroll spy, header elevation on scroll, link items in DropdownMenu).

Scope note: the task description listed team/about/contact sections. The source home page (`src/app/(pages)/page.tsx`) only renders Hero, Blog and CTA. "Team" and "About Us" are `href='#'` nav placeholders in the source, and "Get in Touch" points to the `/contact-us` route. That route is out of scope, so the port links it to the original demo. The blog-detail routes are out of scope too, and cards link to `<demo>/blog-detail/<slug>`.

## Sections ported
| Section | Source file | bejamas components used | Fidelity | Notes |
|---|---|---|---|---|
| Header (sticky, nav, theme toggle, CTA, mobile menu) | `components/layout/header.tsx`, `blocks/menu-navigation.tsx`, `blocks/menu-dropdown.tsx`, `layout/mode-toggle.tsx` | NavigationMenu (List/Item/Link), Toggle, Button (`as="a"`), Tooltip, DropdownMenu (Trigger/Content) | Faithful | Scroll spy and scroll shadow are now CSS (see Animation). Dropdown items are anchors carrying `data-slot="dropdown-menu-item"` |
| Hero (badge, h1, newsletter form, 2 featured post cards) | `blocks/hero-section/hero-section.tsx` | Badge, Input, Button, Card, CardContent | Faithful | Clickable cards use a stretched link (`after:absolute after:inset-0` on the arrow link) instead of `onClick={router.push}` |
| Blog (Blogs label/breadcrumb, h2, category tabs, search, 6-card grid per tab) | `blocks/blog-component/blog-component.tsx` | Tabs, TabsList (`variant="default"`), TabsTrigger, TabsContent, Breadcrumb, BreadcrumbList/Item/Separator, Input, Badge, Button, Card | Faithful | The breadcrumb swap is derived display from `tabs:change`. Category badges dispatch `tabs:set`. ScrollArea is replaced by native overflow |
| CTA (image + nested muted card with newsletter form) | `blocks/cta-section/cta-section.tsx` | Card (nested), CardContent, Input, Button | Faithful | `container mx-auto max-w-5xl` works unchanged (Tailwind v4 in both) |
| Footer | `components/layout/footer.tsx` | Separator | Faithful | Brand SVGs copied inline from `assets/svg/*-icon.tsx` |
| Floating "Download" button | `components/layout/Download.tsx` | n/a | Not ported (drift) | It is in the source, but the live demo has no "Download" anchor (checked in the DOM). The required "View original" button occupies that corner |

## Component mapping (shadcn/React → bejamas/Astro)
| Source | Port | Notes on API differences (props, asChild, variants, sizes, default classes) |
|---|---|---|
| `Button` (`asChild` + `next/link`) | `Button as="a" href` | No `data-slot="button"`/`data-size` attributes, so the source's global rules `[data-slot='button'][data-size='lg']:not(.px-6){px-4}` and `…[data-size='default']…{px-3}` cannot apply. The padding goes inline (`px-4` / `px-3`). bejamas base is `rounded-lg` (shadcn: `rounded-md`), has no `border border-transparent bg-clip-padding` (1px narrower box than shadcn), and adds `active:scale-98`. `size="lg"` is `px-5 text-sm` (shadcn: `px-2.5`) |
| `Button variant="outline"` | same + `bg-background hover:bg-muted hover:text-foreground hover:border-border` | bejamas outline has no `bg-background`, and on hover it uses `bg-accent text-accent-foreground border-accent`. The Ink theme's accent-foreground is the blue primary, so without overrides the hover state turns the label blue |
| `Badge variant="outline"` / custom category badge | `Badge shape="pill"` + classes | bejamas Badge with `shape="default"` ends up `rounded-xs`: the base string has `rounded-4xl … rounded-full`, but the cva output (`rounded-xs`) is merged after it. shadcn badges are pills, so pass `shape="pill"`. Default `size` is `text-sm h-6` (shadcn: `h-5 text-xs`). `as="a"` works for link badges |
| `Card` / `CardContent` | `Card` / `CardContent` | The bejamas Card class string contains both `ring-1 ring-foreground/10` and `border border-border`, and both `shadow-sm` and `shadow-lg`. The rendered card gets a ring **and** a border plus a large shadow. radix-vega Card is ring-only with `shadow-xs`. Every card needed `border-0`, plus `shadow-none` where the source had it. CardContent is identical (`px-6`) |
| `Input` (+ global `.input-lg {h-10}`) | `Input size="lg"` + `data-[size=lg]:px-3 data-[size=lg]:md:text-sm rounded-md` | Size styling lives in `data-[size=*]:` variants. Their attribute selectors out-specify a plain `h-10`/`px-3`/`md:text-sm` passed in `class`, so overrides must use the same `data-[size=lg]:` prefix |
| `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` (Radix, controlled `value` + `onValueChange`) | Same names, `defaultValue`; `TabsList variant="default"` | The bejamas TabsList defaults to `variant="indicator"` (a sliding pill). shadcn's default is a static active background, so `variant="default"` reproduces it exactly. The React state that switched "Blogs" ↔ breadcrumb became a `tabs:change` listener |
| `ScrollArea` + `ScrollBar orientation="horizontal"` | `div.overflow-x-auto.no-scrollbar` | No ScrollArea component in bejamas (gap) |
| `Breadcrumb*` incl. `BreadcrumbLink`, `BreadcrumbPage` | `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbSeparator` + plain `<a>` / `<span aria-current="page">` | `BreadcrumbLink` and `BreadcrumbPage` don't exist in 0.5.0 (`packages/registry/src/ui/breadcrumb/` has 4 files) |
| `NavigationMenu viewport={false}` + `NavigationMenuLink` styled by `navigationMenuTriggerStyle()` | `NavigationMenu viewport={false}` + `NavigationMenuLink` | No exported `navigationMenuTriggerStyle`, so the trigger-style classes are inlined. A link-only menu (no triggers/content) initialises without console errors. bejamas link base is `rounded-sm p-2` (shadcn: `rounded-md p-2`) |
| `DropdownMenu` + `DropdownMenuItem asChild><Link>` | `DropdownMenu` / `DropdownMenuTrigger variant="outline" size="icon"` / `DropdownMenuContent align="end"` + raw `<a role="menuitem" data-slot="dropdown-menu-item" data-value>` | `DropdownMenuItem` always renders a `div` (no `as`/`asChild`). See the gap list for keyboard behavior. Content width defaults to `w-[var(--anchor-width)]`, overridden with the source's `w-[min(93vw,500px)] md:w-[min(93vw,250px)]` |
| `Tooltip` + `TooltipTrigger asChild` | `Tooltip` + `TooltipTrigger asChild` + `TooltipContent` | `Tooltip` renders a wrapper `div.inline-block` and `asChild` renders another wrapper `div`. A responsive class on the inner button (`sm:hidden`) leaves an empty wrapper that still takes a flex `gap-3` slot, so the class moves to the `Tooltip` root. The same applies to the `DropdownMenu` root (`div.relative.inline-block`): `lg:hidden` goes on the root |
| `ModeToggle` (Button + `next-themes` `setTheme`) | `Toggle variant="outline"` + `toggle:change` listener | There is no theme-toggle component. A pressed toggle means dark mode. Toggle's `aria-pressed:bg-muted` was overridden to keep the Button look |
| `Separator` | `Separator` | Same |
| lucide-react icons | `@lucide/astro` (`MailIcon`, `MenuIcon`, `MoonStarIcon`, `SunIcon`, `CalendarDaysIcon`, `ArrowUpRightIcon`, `ArrowRightIcon`, `SearchIcon`) | 1:1 |

## Gaps in bejamas/ui (missing components, variants, props, primitives)
- **DropdownMenu link items** (mobile nav): no `as="a"`/`asChild` on `DropdownMenuItem`. `@data-slot/dropdown-menu` calls `preventDefault()` on Enter/Space and only activates items that have a `data-value` (`valueFor(e) === null` → ignored). An `<a data-slot="dropdown-menu-item">` therefore navigates on pointer click but does nothing on keyboard Enter. Workaround: a header script listens to the primitive's `dropdown-menu:select` and calls `item.click()` when `detail.source === "keyboard"` and the item is an anchor. A native "link item" (no preventDefault for `a[href]`, `data-value` optional) would remove the script.
- **Breadcrumb**: no `BreadcrumbLink` / `BreadcrumbPage` (Blog section breadcrumb). The port uses plain markup with shadcn's classes.
- **ScrollArea**: missing (category tab strip). The port uses native `overflow-x-auto` + bejamas `no-scrollbar`, so the thin Radix horizontal scrollbar is gone on mobile.
- **Scroll spy / active section** (header nav and mobile menu highlight the section in view): no primitive. CSS `scroll-target-group: auto` + `a:target-current` is used where supported (Chromium 140+). The fallback (`@supports not`) keeps "Home" highlighted, which is what the source shows on first paint.
- **Header elevation on scroll** (`isScrolled` → `shadow-sm`): no primitive. A scroll-driven animation is used instead (see Animation).
- **Theme toggle**: no component or recipe. The port uses `Toggle` + a `toggle:change` listener, an inline head script that applies the persisted theme before paint, and an inline script after the toggle that sets `data-default-pressed` before `@data-slot/toggle` binds. Module scripts run later, so this order matters.
- **No `navigationMenuTriggerStyle` export**: shadcn ports often style plain links with it. The classes have to be inlined.
- **Tabs controlled from outside** (category badge on a card selects the tab): no declarative "tab link". The port uses the documented inbound event `tabs:set`, fired from the badge anchor's click, plus a one-time check of `location.hash` for deep links.

## Bugs / issues in bejamas 0.5.0 or its CLI
- **Scaffold font config is incomplete for Inter**. `bejamas init -t astro` writes `{ provider: fontProviders.google(), name: "Inter", cssVariable: "--font-sans", subsets: ["latin"] }` with no `weights`. Astro's default is `weights: ["400"]`, so `font-medium` and `font-semibold` text renders with synthesized bold. Expected: `weights: ["100 900"]` (variable).
- **In-place component `<script>` breaks sibling-based layout**. Astro renders each component's `<script>` immediately after its root, so `Tabs.astro` output is `<div data-slot="tabs">…</div><script type="module">`. In a Tailwind v4 `space-y-16` parent the Tabs root is no longer `:last-child` and gets `margin-block-end: 4rem`. Repro: put `<Tabs>` as the last child of a `space-y-*` container. Observed: the blog section was 1648px tall (expected 1584). Workaround: wrap `<Tabs>` in a `<div>`. The same applies to Toggle, Tooltip, DropdownMenu and NavigationMenu, and to any `:last-child`, `+` or `space-*` styling.
- **Card class string is self-contradictory** (`border-none … border border-border`, `shadow-sm … shadow-lg`, plus `ring-1`). The default Card has a double edge (ring + border) and a heavy shadow. It probably should be ring-only like radix-vega.
- **Badge `shape="default"` is `rounded-xs`**. The literal `rounded-full` in the outer `cn()` is dead code, because the cva output that contains `rounded-xs` is merged after it.
- **Button `variant="link"` uses `text-accent`**. In themes where accent is a background tint, this makes link buttons nearly invisible. Not used here; noticed while mapping.
- **Scroll lock shift in headless Chromium**: `@data-slot/core` scroll lock sets `overflow:hidden; scrollbar-gutter:stable` on `<html>`. Playwright's Chromium hides scrollbars, so opening the mobile DropdownMenu moved the whole page left by 15px in screenshots. Radix in the original did not. This is likely invisible with real overlay or classic scrollbars; it is recorded so screenshot diffs aren't misread.
- CLI: `bejamas add` printed `Skipped 1 file … src/lib/utils.ts` for every component (harmless). `bejamas add toggle` also installs `src/lib/toggle-shared.ts`. The scaffold ships `public/favicon.svg` and `public/bejamas.svg`, which the port removed.

## Theming, fonts, assets
- Tokens: the `:root` and `.dark` blocks were copied 1:1 from the source `globals.css`, adding `--destructive-foreground`, which the bejamas `@theme` references. All bejamas defaults were replaced, including its blue `--primary: oklch(0.4634 0.2647 264.76)` (the Ink primary is `oklch(0.48 0.2 260.47)`). `--radius: 0.375rem`: the source declares it inside `@theme inline`, so it is only a theme value there. The port puts it in `:root` so the bejamas `--radius-*` calcs work. The source's custom shadow scale (`--shadow-xs` … `--shadow-2xl`) and `--radius-2xl..4xl` are mapped in `@theme inline` the same way the source does.
- Default mode: the source uses `ThemeProvider attribute="class" enableSystem={false}`, so the site is light regardless of OS preference. This was verified on the demo with `--dark` emulation: it stays light. The port also stays light and only switches through the toggle (persisted in `localStorage.theme`).
- Fonts: `next/font/google` Inter (`--font-inter`), Source Serif 4 (`--font-serif`) and IBM Plex Mono (`--font-mono`, weights 300–700) became three `fontProviders.google()` entries in `BEJAMAS_ASTRO_FONTS` with matching `<Font>` tags. `--font-sans: var(--font-inter)` and `--font-heading: var(--font-sans)` (the source never defines a heading font).
  - **Optical size matters**: with only the `wght` axis, the port's h1/h2 ran ~6% wider than the demo (h2 was 834px vs 778px). Adding `options: { experimental: { variableAxis: { opsz: ["14..32"] } } }` to the Inter family made every measured line width identical (h1 564/671px, h2 778px, lead 664/413px).
- Assets: `public/favicon/*`, `public/images/blog-post/*`, `public/images/cta.webp` and `og-image.png` were copied from the repo. Avatars and `contact-us.webp` are unused on the home page. The source metadata points OG to `/images/og-image.webp`, but only a `.png` exists, so the port references the png (source bug).
- Category tab ids: the source uses `id={`category-${category}`}`, which produces `category-Startup Growth` (an id with a space). The port slugs them (`category-startup-growth`) and uses the same slug in badge hrefs.

## Animation & third-party libraries
- No framer-motion. The only motion is CSS (`transition-*`, `group-hover:scale-105` on images, `tw-animate-css` popover enter/exit), and it ports as-is. The source's `animate-heartbeat` keyframes belonged to the Download button, which the port drops.
- Header `shadow-sm` on scroll (a React scroll listener) became `@keyframes header-elevate` + `animation-timeline: scroll(root block); animation-range: 0 1px` under `@supports (animation-timeline: scroll())`.
  - **lightningcss (Vite's CSS minifier) bug**: it folded `animation: header-elevate linear both; animation-timeline: scroll(root block)` from one rule into `animation: linear both header-elevate scroll(root)`. Chromium rejects that shorthand, so `animation-name` computed to `none`. Fix: declare the timeline in a separate rule with a different selector (`header[data-site-header]`) so the minifier can't merge them.
  - lightningcss also warns `'target-current' is not recognized as a valid pseudo-class` but keeps the rule. It works in Chromium 153.
- The scroll spy (a React scroll listener over `section[id]`, `innerHeight/2` probe) became CSS `scroll-target-group`/`:target-current`. Verified: "Home" is active at scrollY 0 and "Categories" at 1200, the same as the demo. Full-page screenshots don't show the active link, because the capture expands the viewport and no section is "current"; viewport-only shots do.
- `next-themes`' `disableTransitionOnChange` was not reproduced. Color transitions on `transition-all` elements may animate briefly when the theme toggles.

## Next.js-specific translations
- `next/link` became `<a>`. `useRouter().push('/blog-detail/…')` on card `onClick` became a stretched-link pattern: `Card relative` + arrow `Button as="a" class="after:absolute after:inset-0"`. Badges and the hero title link use `relative z-10` so they stay clickable above the overlay. This is a semantic improvement over the source's click-anywhere `div`.
- `router.push('/#category-X')` on badges became `<a href="#category-x">` plus `tabs:set`. In the source only grid badges switched the tab and hero badges just scrolled. In the port both switch, a minor behavior difference.
- `next/font/google` became the Astro fonts API (above). `next-themes` became an inline head script, `Toggle` and localStorage. The `metadata` export became `<title>`, meta and OG tags, and favicon links in `Layout.astro`. The JSON-LD `<script dangerouslySetInnerHTML>` became `<script type="application/ld+json" set:html>`. The `(pages)` route-group layout was inlined into `index.astro`. `'use client'` and React state were removed.

## Verification
- `bun run build`: success. 1 page; the only warnings are the 4 lightningcss `:target-current` warnings.
- Served with `bun run preview --port 4415`. Screenshots are in `.compare/` (`original*.png` vs `port*.png`; `-m` = 390px; `*-darkmode-*` = after clicking the theme toggle; `*-tab-design.png`; `*-m-menu.png`; `*-nav-*.png`).
  - 1440px: section offsets and heights are identical. Card boxes match (blog card 389×540 at y=1262/1826), as do the tab list (401×40) and every measured text line width. A 1px Subscribe-button offset was fixed by adding `border border-transparent bg-clip-padding`.
  - 390px: identical page height (6383px). Header icon buttons, stacked form, horizontally scrollable tab strip and the stacked footer all match.
  - Dark (toggle): visually identical to the demo after toggling.
- Interactive checks (Playwright scripts `.compare/interact.mjs` and `.compare/kbd.mjs`):
  - **Theme toggle**: works and persists across reload (`aria-pressed` restored).
  - **Tabs**: click, ArrowRight keyboard and the breadcrumb/label swap all work.
  - **Category badges**: grid and hero badges select the tab and update the hash. The `/#category-design` deep link selects Design on load.
  - **Card links**: point to the original demo's `/blog-detail/<slug>`.
  - **Mobile dropdown**: opens (362.7px wide, the same as the demo). Clicking "Categories" navigates to the section and closes the menu. Keyboard Enter → ArrowDown → Enter on "Home" navigates.
  - **Mobile tooltip**: "Get in Touch" opens on hover.
  - **Layout and errors**: no horizontal overflow at 390px and no console errors.
- Remaining differences:
  - The mobile menu lacks the thin horizontal ScrollArea scrollbar.
  - The menu sits 4px further left in headless screenshots (a scrollbar-gutter artifact).
  - Hero badges also switch the tab.
  - There is no "Download" button (absent on the live demo).

## Lessons for a migration skill
- (General) **Fix the scaffolded font entry first**: add `weights` (variable range), and for Inter add the `opsz` axis via `options.experimental.variableAxis`. next/font's Inter has optical sizing; without it, headings wrap differently. Measure text line widths with `Range.getClientRects()` against the demo. It is the fastest way to catch font drift.
- (General) **Wrap any bejamas component that ships a `<script>`** (Tabs, Toggle, Tooltip, DropdownMenu, NavigationMenu, Accordion, Carousel…) when it sits inside `space-x/y-*` or relies on `:last-child`. Otherwise the in-place `<script>` sibling adds the gap.
- (General) bejamas default classes differ from shadcn radix-vega. Pass these every time:
  - Card: `border-0` (plus `shadow-none` where the source has it)
  - Badge: `shape="pill"`
  - Button: `rounded-md`, and add `border border-transparent bg-clip-padding` for exact box size
  - Outline Button: `bg-background hover:bg-muted hover:text-foreground hover:border-border`
  - TabsList: `variant="default"`
  - Input: size overrides through `data-[size=…]:` variants
- (General) Responsive visibility classes go on the bejamas **root** wrapper (`Tooltip`, `DropdownMenu`), not on the inner trigger, or the empty wrapper keeps its flex gap.
- (General) Source `globals.css` rules keyed on shadcn `data-slot`/`data-size` attributes (e.g. `[data-slot='button'][data-size='lg']`) won't match bejamas markup. Grep for `data-slot=` in the source CSS and inline the effect.
- (General) Replace React scroll listeners with CSS:
  - `animation-timeline: scroll()` for "scrolled" header states. Keep `animation-timeline` in a rule that lightningcss can't merge into the `animation` shorthand.
  - `scroll-target-group` + `:target-current` for nav scroll spy, with an `@supports not` fallback.
- (General) For a theme toggle use `Toggle` + `toggle:change`. Apply the stored theme in an inline `<head>` script and set `data-default-pressed` from an inline script right after the button, because module scripts bind later.
- (General) Clickable cards (`onClick={router.push}`) should become a stretched anchor. Lift nested interactive elements with `relative z-10`.
- (General) Link items in DropdownMenu need a `dropdown-menu:select` listener for keyboard activation, and a `data-value` on each item.
- (General) The "View original" button: `Button as="a" class="fixed right-4 bottom-4 z-[9999] rounded-md shadow-lg ring-2 ring-background"`. The ring keeps it distinct over primary-colored content in both themes.
- (Site-specific) shadcn/studio templates put `--radius` inside `@theme inline` and define a custom `--shadow-*` scale. Move the radius to `:root` and mirror the shadow mapping. Their `Download`/"Buy now" floating buttons may be disabled on live demos; check the DOM before porting.
- (Site-specific) Category ids with spaces in the source need slugging. Keep hrefs and ids in one helper (`src/components/blocks/category.ts`).
