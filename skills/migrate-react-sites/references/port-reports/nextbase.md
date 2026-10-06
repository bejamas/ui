# nextbase migration findings

## Summary
- Source: https://github.com/imbhargav5/nextbase-nextjs-supabase-starter. The port follows **`24ae459`** (2025-11-17, the last pre-monorepo commit), because that is what the demo serves. HEAD is `00ad2da` (v2.2.0, Turborepo `apps/web`) and has a different home page (see "Live demo versus source"). At `24ae459`: Next.js `^16.0.1` (the feature copy still says "Next.js 14"), React 19.1, Tailwind v4.1 (`@import 'tailwindcss'`, no tailwind.config), shadcn `new-york` / `neutral`, lucide-react `^0.546`, Radix. framer-motion and @headlessui are dependencies, but the home route uses neither.
- Demo: https://open-source-template.usenextbase.com
- Port: /tmp/bui-ports/nextbase (preview port 4408)
- Fidelity verdict: **faithful**. Every measured box (x, y, w, h, font size/weight, line height, letter spacing, radius) matches the live demo at 1440, 768 and 390px. Page heights are identical: 4581 / 4758 / 5041px.
- Effort hotspots: (1) finding the right source revision, since HEAD no longer matches the demo; (2) resetting bejamas Card defaults (ring, `border-none`, `items-start` header grid) to the shadcn v3-era Card; (3) reproducing tailwind-merge side effects of the original `T.*` typography helpers (surviving `mt-8`, dropped `leading-*`).

## Sections ported
| Section | Source file (@24ae459) | bejamas components used | Fidelity | Notes |
|---|---|---|---|---|
| Top nav (Home / Login) | `src/app/(dynamic-pages)/(main-pages)/page.tsx` (inline `<nav>`) | Button (`as="a"`, ghost + default) | exact | The page renders its own nav. `src/app/Navbar.tsx` (`ExternalNavigation`) is only used by `/about`. There is no mobile menu in the original, so no Drawer or HamburgerMenu was needed. "Login" points to the demo's `/login`. |
| Hero (badge, H1, lorem copy, 2 CTAs, large photo) | same `page.tsx` | Badge (outline, pill, sm), Button (lg default + outline) | exact | Unsplash photo downloaded to `public/images/hero-dashboard-preview.jpg` (1600×2000). The `from-background/80` overlay and blurred `-inset-1` glow are kept as plain divs. |
| Features ("Feature-rich, Developer-first", 6 cards) | same `page.tsx` (`features` array) | Card, CardHeader, CardTitle, CardContent, CardDescription | exact | The inline SVG icons are kept verbatim. Card hover `shadow-lg` is verified in the browser. |
| Developer ("Built for developers, by developers") | same `page.tsx` | Badge (with lucide `Star`), Button | exact | The second Unsplash photo is in `public/images/developer-experience.jpg` (1600×1200). |
| CTA ("Ready to get started?") | same `page.tsx` | Button (secondary + inverted outline) | exact | `bg-primary` section |
| Footer (Acme brand, 3 link columns, socials, copyright) | `src/components/Footer.tsx` | Button (ghost icon), Separator | exact | Acme logos copied from `public/logos/`. Brand icons are inlined (see Gaps). |
| "View original" floating button | n/a | Button (`as="a"`, outline) | n/a | `fixed bottom-4 right-4 z-[9999]`. Uses an outline variant plus `bg-background shadow-lg` so it stays visible over the black CTA section. elementFromPoint confirms it is the topmost element. |

## Component mapping (shadcn/React → bejamas/Astro)
| Source | Port | Notes on API differences |
|---|---|---|
| `<Button asChild><Link/></Button>` | `<Button as="a" href>` | `asChild` maps to `as="a"`. The defaults differ, and the port restores them with classes (see `shadcnButton` in `src/lib/site.ts`): **radius** bejamas `rounded-lg` (10px) vs shadcn `rounded-md` (8px). **Padding** default `px-3` vs `px-4`; lg `px-5` vs `px-6`. **Shadow** bejamas default variant adds `shadow-xs`, which the original lacks. **Outline** bejamas has no `bg-background`, adds `hover:border-accent`, and sets an explicit `border-border` in its base. **Ghost** hover is `bg-secondary` vs `bg-accent`, which are the same color in this theme. bejamas also adds `active:scale-98` and `size=icon` lacks `text-sm`, which changed the `<a>` line box (16px vs 14px) in the footer. |
| `<Badge variant="outline">` (shadcn v3-era: `rounded-full px-2.5 py-0.5 text-xs font-semibold`) | `<Badge variant="outline" shape="pill" size="sm" class="h-auto gap-0 px-2.5 py-0.5 font-semibold">` | **The default `shape` resolves to `rounded-xs`, not pill.** The component's outer `cn()` puts `rounded-full` first and the cva `rounded-xs` after it, so tailwind-merge keeps `rounded-xs`. Fixed heights (`h-5`/`h-6`) need `h-auto`. The base has `gap-1`, but the original has none. Icon size is forced with `[&>svg]:size-3!` (important), so a 14px icon needs `[&>svg]:size-3.5!`. |
| `<Card>` (`rounded-lg border bg-card shadow-sm`) | `<Card class="gap-0 rounded-lg border-solid py-0 text-base shadow-sm ring-0 border-gray-200 …">` | The bejamas Card base contains **both `border-none` and `border border-border`**. tailwind-merge keeps both because they are different groups (style vs width), so the border-style stays `none`, and a `ring-1 ring-foreground/10` draws the edge instead. To get a real 1px border you need `ring-0 border-solid`. You also need to reset `py-6 gap-6` (layout), `text-sm` and `shadow-lg` (the base contains `shadow-sm … shadow-lg`, so the last one wins). |
| `<CardHeader>` (`flex flex-col space-y-1.5 p-6`) | `<CardHeader class="flex flex-col items-stretch gap-0 space-y-1.5 p-6">` | The bejamas header is a `grid … items-start`. After switching it to flex, **`items-start` still applies and shrinks children**: centered icon wrappers and `text-center` titles collapsed to content width (title w=91px vs 313px). You need `items-stretch`. |
| `<CardTitle className="text-center text-xl">` | `<CardTitle class="text-center text-xl font-semibold tracking-tight text-wrap md:text-xl">` | bejamas adds `md:text-xl leading-normal font-medium text-balance`. In the original, tailwind-merge dropped `leading-none` because `text-xl` came later, so the title is 28px tall. The port matches that by not setting a leading. |
| `<CardContent>` `p-6 pt-0` / `<CardDescription>` | same parts + `p-6 pt-0` | bejamas content uses `px-6` only. |
| `<Separator>` | `<Separator>` | Same markup (a `div` with `bg-border h-px`). |
| `T.H1/H2/H3/H4/P/Small` (project typography helpers using `cn`) | plain `<h1>`…`<small>` with the **post-tailwind-merge** class list | Reproduce what `cn()` actually produced, not the literal props. For example, `T.H4 className="text-sm font-semibold uppercase"` keeps `mt-8` from the base, and in the footer this creates a 32px offset. `T.P` loses `leading-7` whenever a `text-*` size follows. `&:not(:first-child):mt-6` in `T.P` is not valid Tailwind and is dropped. |
| `next/image` | `<img width height loading fetchpriority>` | Both images use `w-full h-auto`, so the `width`/`height` props in the source (1600×900, 1200×800) do not match the rendered aspect ratio. The port uses the real file dimensions. |
| lucide `ArrowRight`, `Star` | `@lucide/astro` | 1:1 |
| lucide `Github`, `Twitter`, `Linkedin`, `Facebook`, `Instagram`, `Dribbble` | `src/components/icons/BrandIcon.astro` (inline lucide 0.5xx nodes) | Brand icons were removed from lucide 1.x, so they are missing from `@lucide/astro`. |

## Gaps in bejamas/ui (missing components, variants, props, primitives)
- **No interactive gap on this page.** The original home page has no menus, accordions, tabs, carousels or dialogs, so no `@data-slot` primitive was needed and no custom JS was written. The page ships no client JS.
- **Brand icons**: `@lucide/astro` 1.x has no Github, Twitter, LinkedIn, Facebook, Instagram or Dribbble. The original used them via lucide-react 0.546. The port inlines the exact lucide 0.5xx SVG nodes in `BrandIcon.astro`.
- **No "shadcn-compatible" Button/Card/Badge preset.** Each shadcn site needs the same 4 to 6 override classes per component (see the mapping). A `style: "shadcn"` option or documented reset classes would remove most of the effort in a port like this.

## Bugs / issues in bejamas 0.5.0 or its CLI
- **Badge `shape="default"` renders square-ish (`rounded-xs`)** even though its outer class list ends in `rounded-full`. In `src/ui/badge/Badge.astro`, `cn("… rounded-full", badgeVariants({shape:"default"}))` lets the cva `rounded-xs` win. Expected: either a pill by default (the outer classes suggest that intent) or no dead `rounded-full`. Observed: radius 2px unless you pass `shape="pill"`.
- **Card emits contradictory classes**: `border-none … border border-border` plus `shadow-sm … shadow-lg` in `src/ui/card/Card.astro`. The `border` never renders (border-style stays `none`), and `shadow-sm` is dead. Repro: `<Card class="ring-0">` shows no border at all. Expected: a visible 1px border, or no `border` classes.
- **Template font tokens are self-referential when `<Font>` is removed.** The `globals.css` template has `@theme inline { --font-sans: var(--font-sans); --font-heading: var(--font-heading); }`, which depends on the Astro `<Font cssVariable="--font-sans">` tag defining the variable at runtime. If you drop the Font tag (a site that uses the system stack), `--font-sans` becomes a cyclic reference and is invalid, and text falls back to the browser default serif. The port sets a literal stack in `@theme`.
- `bun add bejamas@0.5.0` after `init` worked as described (the template pins `^0.4.1`). `bunx bejamas add badge card separator -y` logged "Skipped 1 file … src/lib/utils.ts (files might be identical)". That is harmless.

## Theming, fonts, assets
- **Tokens**: the original `:root`/`.dark` oklch values (shadcn neutral) were copied verbatim. This replaces the bejamas defaults, including the blue `--primary: oklch(0.4634 0.2647 264.76)` and the blue chart colors. `--chart-1` (orange) is needed for the Star badge icon. Radius `0.625rem` is the same in both.
- **Border color quirk carried over**: the original's globals.css has a Tailwind v3 to v4 compat block (`*, ::after, … { border-color: var(--color-gray-200) }`) after `* { @apply border-border }`. It wins, so every bare `border` renders gray-200 (`lab(91.6 -0.16 -2.27)`, slightly blue), not `--border`. Confirmed with computed styles on the demo. The port copies the block. bejamas components that hard-code `border-border` (Button, Badge outline) still use `--border`, which is a sub-1% luminance difference.
- **Fonts**: the original loads Inter and Roboto Mono with `next/font/local` into `--font-inter` / `--font-roboto-mono`, but **never maps them to `--font-sans`**. The demo computes `font-family: ui-sans-serif, system-ui, …`. The port matches that runtime result: `BEJAMAS_ASTRO_FONTS = []`, no `<Font>` tags, and `--font-sans` set to Tailwind's default stack. Loading Inter "because the source does" would have changed the rendering.
- **Container**: `container mx-auto px-4 md:px-6`. The original declares `--breakpoint-2xl: 1400px`, but measured content is 1232px wide at both 1440 and 1500px, so the 1400px value never takes effect. Default Tailwind v4 `container` in the port gives identical widths, so no custom container was needed.
- **Color mode**: the demo is light-only. On this route the `ThemeProvider` (in `DynamicLayoutProviders.tsx`) is never mounted, and dark mode is class-based (`@custom-variant dark (&:is(.dark *))`), so `prefers-color-scheme: dark` leaves it light. The port has no theme script, and a `--dark` emulated run confirms the body stays `oklch(1 0 0)`.
- **Assets**: the hero and developer photos are Unsplash hotlinks in the source. They were downloaded at `w=1600` into `public/images/`. Acme logos were copied from `public/logos/`. The demo's favicon `/images/logo-black-main.ico` returns 404, so the port has no favicon, and the scaffold `favicon.svg` and `bejamas.svg` were removed. The title "Nextbase Open source" comes from the `(dynamic-pages)/layout.tsx` metadata, which overrides the root title.
- `-z-10` decorative gradients (the hero radial and the developer glow) are invisible in the original, because the parent wrapper `bg-white` paints over them and there is no stacking context. They were ported as-is, so they are invisible in the port too.

## Animation & third-party libraries
- No entrance animations on the home page. framer-motion is used only in the dashboard (`ClientPage.tsx`). The only motion is CSS `transition-shadow hover:shadow-lg` on the feature cards and color transitions on links, both kept.
- `next-nprogress-bar`, `react-hot-toast`/`sonner` and `@tanstack/react-query` providers are runtime chrome with no visual footprint on the landing page, so they were dropped.

## Next.js-specific translations
- `next/link` became `<a>`. Auth links (`/login`) and footer legal links (`/login`, `/terms`) point to the demo's URLs. "View Documentation" and "Learn More" stay `#`, as in the source.
- `next/image` became `<img>` with real intrinsic dimensions, `fetchpriority="high"` on the hero image and `loading="lazy"` on the developer image. Images live in `public/` as the brief requires, not `src/assets`, so they are not optimized.
- `next/font/local` was not needed (see Fonts).
- `metadata` became the `<title>`/`<meta name="description">` props of `Layout.astro`.
- Route-group layouts: the root `layout.tsx` wraps everything in `<div class="flex pt-2 flex-col min-h-screen bg-white dark:bg-gray-900">` with `<main class="flex-1">` (from ClientLayout) and `<Footer/>`. The `pt-2` produces the 8px gap above the nav, and the port keeps it in `Layout.astro`.

## Verification
- `bun run build`: 1 page, no errors or warnings. Preview: `bun run preview --port 4408`.
- Screenshots in `.compare/`: `original*.png` / `port*.png` (1440, chunked), `original-mobile*` / `port-mobile*` (390), and `*-dark.png` (1440, dark scheme emulated).
- Geometry diff (`.compare/inspect.mjs`) of about 60 elements (nav, sections, headings, paragraphs, buttons, badges, cards, images, footer). After the fixes there are **0 differences** in x/y/w/h/font-size/weight/line-height/letter-spacing/radius at 1440, 768 and 390px. Colors match: the demo reports lab() and the port reports oklch() for the same tokens. Card inner layout was checked node by node (`.compare/card.mjs`).
- Runtime checks (`.compare/checks.mjs`): no console errors or warnings, no failed or 4xx requests. The "View original" link has `target=_blank rel=noopener`, `position: fixed`, `z-index: 9999` and a 16px inset, and is topmost over the hero and over the black CTA. The card hover shadow changes. All link targets are listed and correct.
- Remaining differences: outline-button and badge border color is `--border` (neutral) rather than gray-200 (slightly blue); the Button press-scale is disabled; and the outline button's hover border stays neutral instead of the bejamas accent border. None are visible at screenshot scale.

## Live demo versus source
- **The repo HEAD does not match the demo.** HEAD (`00ad2da`, v2.2.0) is a Turborepo with `apps/web/src/app/(external-pages)/home-hero.tsx`, `home-features.tsx` and `home-cta.tsx`: a two-column hero with a "Private items" card, a sticky navbar with a mode toggle, and different copy. The demo still serves the pre-monorepo landing page ("Build faster with Nextbase", lorem copy, large photo). `git log -S "Feature-rich, Developer-first"` found the removal in `550d368` ("convert to Turborepo monorepo…"), and its parent `24ae459` matches the demo exactly. The task notes pointed at `apps/web` and `home-hero`/`home-features`/`home-cta`, but those files are the newer design. The port follows the demo and the matching commit.

## Lessons for a migration skill
- **(General) Pin the source revision to the demo first.** If the live copy is not in HEAD, `git fetch --unshallow` and `git log -S "<distinctive demo string>"` find the commit that removed it, and its parent is the demo's source. Use `git worktree add` to read it without disturbing the clone.
- **(General) Measure the demo's computed `font-family` before configuring fonts.** Sites often load fonts with next/font and never wire the variable into `--font-sans`. Port the runtime result, not the import.
- **(General) The bejamas template's `@theme { --font-sans: var(--font-sans) }` only works while a `<Font cssVariable="--font-sans">` tag exists.** If you remove fonts, replace it with a literal stack.
- **(General) Port the output of `cn()`/tailwind-merge, not the literal className props.** Project typography helpers (`T.H1`, `T.P`…) merge base classes, and the surviving or removed utilities (`mt-8`, `leading-*`) visibly change layout. tailwind-merge drops an earlier `leading-*` whenever a later `text-<size>` appears.
- **(General) shadcn to bejamas reset classes worth keeping in a shared helper**:
  - Button: `rounded-md px-4|px-6 active:scale-100`, plus `shadow-none` (default variant) and `bg-background` (outline).
  - Badge: `shape="pill" size="sm" class="h-auto gap-0 px-2.5 py-0.5 font-semibold"`.
  - Card: `gap-0 py-0 rounded-lg border-solid ring-0 shadow-sm text-base`.
  - CardHeader: `flex flex-col items-stretch gap-0 space-y-1.5 p-6`.
  - CardContent: `p-6 pt-0`.
- **(General) A geometry diff beats eyeballing.** A small Playwright script that dumps bounding boxes and computed font metrics for the same selectors on both sites, then joins them by (selector, text), showed every regression here, such as the 10px card height and the collapsed centered title. It also confirmed 0 differences at three breakpoints.
- **(General) Check whether the original already ignores `prefers-color-scheme`** (class-based dark with no ThemeProvider on the route). If it does, the port must not add a theme script.
- **(General) Decorative `-z-10` layers under a parent with a background and no stacking context are invisible in the original.** Port them as-is rather than "fixing" them into view.
- **(Site-specific) Nextbase's shadcn compat CSS** makes bare `border` render gray-200, not `--border`. Copy that block when porting nextbase-derived sites.
