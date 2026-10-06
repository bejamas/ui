# nobruf-shadcn-landing migration findings

## Summary
- Source: https://github.com/nobruf/shadcn-landing-page @ `ec8e18e8ed56ed6636023ced09948515c19258cc`. Next.js 14.2.3 (App Router), Tailwind v3.4 (`tailwind.config.ts` plus `tailwindcss-animate`), shadcn `style: default`, `baseColor: zinc`, overridden by a hand-written "Orange theme" in `app/globals.css`. Libraries: Radix (accordion, avatar, collapsible, dialog/sheet, navigation-menu, select, separator, label, scroll-area), embla-carousel-react, `@devnomic/marquee`, next-themes, react-hook-form with zod, lucide-react 0.383. No framer-motion, Magic UI or Aceternity.
- Demo: https://shadcn-landing-page-livid.vercel.app
- Port: `/tmp/bui-ports/nobruf-shadcn-landing` (preview port 4405). Astro 7 with bejamas 0.5.0 and Tailwind v4.
- Fidelity verdict: **faithful**. Element positions measured by script (`.compare/measure.mjs`, every h1/h2/section/footer/form/label) match the demo to the pixel at 1440px and 390px in dark mode. Light mode matches visually. Navbar dropdown, mobile sheet, accordion, carousel, select, theme toggle and marquee all work through bejamas components and `@data-slot` primitives. Remaining differences are minor and listed under Verification.
- Effort hotspots:
  1. Undoing bejamas Card defaults: `ring-1`, `border-none` merged with `border`, `py-6 gap-6`, `overflow-hidden`, the `@container` header and `grid-rows-[auto_auto]`.
  2. Two registry bugs: Select is missing `lib/select.ts` and `@data-slot/select`, and Marquee ships without its keyframes.
  3. Tailwind v3 to v4 behaviour changes: `container`, `space-y` on inline children, gradient interpolation, `drop-shadow-xl`, `shadow-inner`.

## Sections ported
| Section | Source file | bejamas components used | Fidelity | Notes |
|---|---|---|---|---|
| Navbar (desktop) | `components/layout/navbar.tsx` | NavigationMenu (+Item/Trigger/Content/Link), Button (`as="a"`) | faithful | The Features dropdown image is broken in the demo (see drift). The port shows the intended image. |
| Navbar (mobile sheet) | `navbar.tsx` + `ui/sheet.tsx` | Drawer `side="left"` (Trigger/Content/Header/Title/Footer/Close), Button, Separator | faithful | Links carry `data-slot="drawer-close"` so the primitive closes the drawer when one is followed. Backdrop restyled through CSS. |
| Theme toggle | `toogle-theme.tsx`, `theme-provider.tsx` | Button (ghost, sm) | faithful | next-themes replaced by an inline head script plus a click handler (no primitive exists for this). |
| Hero | `sections/hero.tsx` | Badge (×2), Button (×2) | faithful | Reproduces the `theme === "light"` image quirk. |
| Sponsors | `sections/sponsors.tsx` | Marquee | faithful | Gap, fade, pause-on-hover and 40s duration come from classes. The keyframes had to be added. |
| Benefits | `sections/benefits.tsx` | Card, CardHeader/Title/Content | faithful | |
| Features | `sections/features.tsx` | Card | faithful | `CardHeader` needs an explicit `flex-col`. |
| Services | `sections/services.tsx` | Card, Badge | faithful | `overflow-visible` is needed so the PRO badge is not clipped. |
| Testimonials | `sections/testimonial.tsx` | CarouselRoot/Content/Slide/Previous/Next, Card, Avatar | faithful | Uses `data-slides="multiple"`. Embla's drag physics are replaced by native scroll-snap. |
| Team | `sections/team.tsx` | Card (+Header/Title/Content/Footer) | faithful | Uses the shadcn card spacing model (`gap-0 py-0`). Remote photos are vendored. |
| Community | `sections/community.tsx` | Card, Button | faithful | `CardHeader` needs `w-full grid-rows-none`. |
| Pricing | `sections/pricing.tsx` | Card, Button | faithful | The v3 `drop-shadow-xl` value is reproduced with an arbitrary filter. |
| Contact | `sections/contact.tsx` | Card, Label, Input, Select, Textarea, Button | close | react-hook-form and zod are replaced by native constraint validation, so the error text differs. A submit script builds the same `mailto:` link. |
| FAQ | `sections/faq.tsx` | Accordion (+Item/Trigger/Content), Plus icon in the `icon` slot | faithful | Radix's `h3` header becomes a `div`. |
| Footer | `sections/footer.tsx` | Separator | faithful | |
| "View original" | (brief) | Button `as="a"` | n/a | `fixed right-4 bottom-4 z-[9999]` |

## Component mapping (shadcn/React → bejamas/Astro)
| Source | Port | Notes on API differences (props, asChild, variants, sizes, default classes) |
|---|---|---|
| `Button` (`asChild` + `Link`) | `Button as="a" href` | Default size: shadcn `h-10 px-4 rounded-md`, bejamas `h-9 px-3 rounded-lg`. The `sm` size is `h-9` against `h-8.5`. bejamas adds `gap-2`, `has-[>svg]:px-2.5`, `active:scale-98` and **`shrink-0`**. The `shrink-0` made the full-width ThemeToggle push the GitHub button outside the navbar. Fixed with `shrink`. Shared overrides live in `src/lib/landing.ts` (`buttonClass`, `buttonSmClass`). |
| `Badge` | `Badge shape="pill"` | **The default `shape` is `rounded-xs`**: the variant's `rounded-xs` overrides the base `rounded-full`. Pass `shape="pill"` to get shadcn's pill. Default `h-6 text-sm`, where shadcn is auto height with `text-xs font-semibold px-2.5`. Use `h-auto` when padding should set the height. Renders a `span` instead of a `div`. |
| `Card` | `Card` | bejamas: `ring-1 ring-foreground/10 rounded-xl py-6 gap-6 text-sm shadow-lg overflow-hidden` and **`border-none` … `border`**. tailwind-merge keeps both `border-none` (style) and `border` (width), so `border-secondary` stays invisible until `border-solid` is added. Override used: `rounded-lg border border-solid border-secondary shadow-xs ring-0 text-base`. Header/content/footer spacing matches shadcn's `p-6`/`p-6 pt-0` through `py-6 gap-6` when parts are siblings. Several `CardContent`s in a row (Team) need `gap-0 py-0` plus per-part padding. |
| `CardHeader` | `CardHeader` | bejamas is `@container/card-header grid grid-rows-[auto_auto] gap-1.5`. shadcn is `flex flex-col space-y-1.5 p-6`. (1) A header with **one child still gets a 6px phantom row gap**, fixed with `grid-rows-none`; this mattered for Testimonials, Community and the empty Contact header. (2) **`@container` gives the header inline-size containment, so it collapses to its padding inside a shrink-to-fit parent** (`items-center` card in Community) and the title wraps word by word. Fixed with `w-full`. (3) `className="flex items-center"` gives a row in bejamas, so add `flex-col`. |
| `CardTitle` (`h3`, `text-2xl font-semibold leading-none tracking-tight`) | `CardTitle` (`div`, `text-lg md:text-xl font-medium leading-normal text-balance`) | Heading semantics are lost (no `as` prop). The override needs `md:text-2xl` as well, because tailwind-merge keeps the responsive `md:text-xl`, plus `text-wrap` to undo `text-balance`. |
| `CardDescription` (`p`) | `CardDescription` (`div`) | Same styling. |
| `Accordion type="single" collapsible` | `Accordion` (single and collapsible by default) | Trigger: bejamas adds `border border-transparent`, which made each item 2px taller and the FAQ section 10px taller. Use `border-0`. It is also `text-sm items-start` and the icon is muted. A custom icon goes in `slot="icon"` and rotates with `group-aria-expanded/accordion-trigger:rotate-[135deg]` (Radix used `[&[data-state=open]>svg]`). Content `class` applies to the inner div, as in shadcn. The Radix `AccordionPrimitive.Header` (`h3`) becomes a `div.flex`. |
| `NavigationMenu` (Radix) | `NavigationMenu` (`@data-slot/navigation-menu`) | Trigger `h-9`, where shadcn is `h-10`. The `NavigationMenuLink` default styles (`flex p-2 text-sm hover:bg-muted`) are absent in shadcn's `asChild` `Link`, so they were reset. Because the links are `flex`, they stack inside one `<li>` unless the item gets `flex`. `NavigationMenuContent` has a default `p-2 pr-2.5`. The positioner and popup have no class props (see Gaps). |
| `Sheet side="left"` | `Drawer side="left"` | The popup width is fixed by an **unlayered** `<style is:global>` rule (`width: 340px`, `max-width: 100vw`), which beats every Tailwind utility. The shadcn `w-3/4 sm:max-w-sm` needs `w-3/4! sm:max-w-sm!`. The shadcn close X is reproduced with `DrawerClose`. `DrawerTitle` defaults to `text-xl font-medium`. |
| `Carousel` (embla, `opts.align:"start"`, `md:basis-1/2 lg:basis-1/3`, `-ml-4`/`pl-4`) | `CarouselRoot` + `CarouselContent` + `CarouselSlide` + `CarouselPrevious/Next` | Slide widths are `basis-[calc((100%-2rem)/3)]` because the content uses `gap-4` instead of negative margins. Controls are restyled as shadcn's absolute `-left-12/-right-12 size-8`, with `ArrowLeft/Right` in the default slot. `data-slides="multiple"` is passed as a raw attribute: neither the component nor `variant="multiple"` sets it, because `variant` means "2 per slide grid". Without it, visible neighbour cards are `inert`. |
| `Avatar`/`AvatarImage`/`AvatarFallback` | same | `size="lg"` gives shadcn's `h-10 w-10`. `AvatarImage` takes `src`/`alt`. Added `overflow-hidden`. |
| `Input` | `Input` | `data-[size=default]:h-9` has higher specificity than `h-10`, so `data-[size=default]:h-10` is required. It also defaults to `dark:bg-input/30` and `rounded-lg`. |
| `Textarea` | `Textarea` | **`field-sizing-content` ignores `rows={5}`**. Use `field-sizing-fixed`. |
| `Select` (Radix) | `Select`/`SelectTrigger`/`SelectValue`/`SelectContent position="popper"`/`SelectItem` | The root is `inline-block`, so `block w-full` is needed. `name` plus `defaultValue` gives a hidden form value; `FormData` returns the chosen option. The CLI install is broken (see Bugs). |
| `Label` (Radix, inline `label`) | `Label` (`flex items-center`) | See the `space-y` finding under Theming. |
| `Separator` | `Separator` | Same. |
| `@devnomic/marquee` (`fade`, `pauseOnHover`, gap 3rem) | `Marquee` (gradient variant) | No gap, pause or keyframe props. Classes used: `gap-12 [--marquee-gap:3rem] *:gap-12 hover:*:[animation-play-state:paused]`, plus the keyframes in `globals.css`. |
| `next/image` | `<img width height>` | Remote URLs downloaded into `public/team` and `public/avatars`. |
| lucide `Icon` by string name (`icons[name]`) | Named `@lucide/astro` imports stored in data arrays | `Github` no longer exists in lucide 1.x, so the 0.383 SVG was copied (`GithubLucide.astro`). `LineChart` and `Building2` are aliases. |

## Gaps in bejamas/ui (missing components, variants, props, primitives)
- **Theme toggle / color-mode provider**: there is no component or primitive. The scaffold layout has no dark-mode bootstrap at all. The port uses an inline head script (next-themes semantics: `localStorage.theme`, `system` default, `matchMedia` listener) and a click handler on a bejamas `Button`.
- **CardTitle/CardDescription have no `as` prop**: `h3` and `p` semantics from shadcn are lost.
- **AccordionTrigger has no heading wrapper option**: Radix renders an `h3`.
- **Drawer backdrop is not stylable**: `DrawerContent` hard-codes `bg-foreground/20`, which is a light veil in dark mode. shadcn uses `bg-black/80`. Restyled with a global `[data-slot="drawer-backdrop"]` rule.
- **Drawer popup size is unlayered CSS**: utilities cannot override it without `!`.
- **Drawer has no close-on-navigate**. `HamburgerMenu` has this built in. The port relies on `<a data-slot="drawer-close">`. This works because the runtime binds `click` on any `[data-slot=drawer-close]` and does not `preventDefault`, but the README says to use `<button>`. Verified: following "Team" closes the drawer and scrolls to `#team`.
- **NavigationMenu positioner/popup/viewport have no class props**: they are rendered internally by `NavigationMenu`. The popup border colour was set with global CSS.
- **Carousel lacks a `slides="multiple"` prop**: only the raw `data-slides` attribute works, and the name collides with `variant="multiple"`.
- **Marquee lacks `gap`, `pauseOnHover` and reverse/fade-width props**.
- **Form validation messages**: there is no `Field`/`FormMessage` wiring equivalent to react-hook-form plus zod in this port. `field` exists but was not used. Native validation messages replace the zod messages.

## Bugs / issues in bejamas 0.5.0 or its CLI
1. **`bejamas add select` produces an app that does not build.** `src/ui/select/Select.astro` contains `import { createSelect } from "@/lib/select"`, but the CLI copies neither `lib/select.ts` nor `@data-slot/select`. The registry item `https://ui.bejamas.com/r/styles/bejamas-juno/select.json` lists `dependencies: ["class-variance-authority"]` and `registryDependencies: ["index","select","utils"]`. The `select` entry refers to itself instead of the lib file. Reproduction: `bunx bejamas add select -y && bun run build`. Result: `Rolldown failed to resolve import "@/lib/select" from ".../src/ui/select/Select.astro"`. Workaround: `bun add @data-slot/select`, then copy `packages/registry/src/lib/select.ts` and rewrite `@bejamas/registry/lib/` to `@/lib/`. In the canonical repo, the `select` item in `apps/web/registry.json` declares `@data-slot/select` but still omits `lib/select.ts`.
2. **The Marquee does not animate in a fresh app.** `Marquee.astro` uses `[animation:marquee-x_var(--duration)…]`, but the `marquee-x`/`marquee-y` keyframes only exist in `packages/ui/src/styles/globals.css`. Neither `bejamas/tailwind.css` nor the `marquee` registry item ships them (the item has no `css`/`cssVars`). The port defines them in `src/styles/globals.css`, with a `--marquee-gap` term so the loop is seamless with a gap.
3. **The Badge default shape is effectively square** (`rounded-xs` overrides the base `rounded-full`), although the base classes suggest a pill.
4. **The Card class string contains both `border-none` and `border`.** Any border colour override is invisible until `border-solid` is added.
5. **The scaffold template pins `bejamas ^0.4.1`** (known; `bun add bejamas@0.5.0` is required). `bejamas add … --overwrite` reported "Updated" for SelectContent/SelectItem/SelectTrigger on a second run, so the first multi-component `add` may have resolved different file versions. This was not investigated further.
6. Drawer scroll lock sets `scrollbar-gutter: stable` on `<html>`. In headless Chromium (Playwright hides scrollbars) this shrinks the layout to 375px while the drawer is open, so `w-3/4` measures 281px instead of 292px. This is probably only a test-environment artifact.

## Theming, fonts, assets
- Tokens: each HSL triplet from the Orange theme in `app/globals.css` was wrapped as `hsl(…)` in `:root`/`.dark`. Opacity modifiers (`bg-primary/50`, `from-background/0`) then work through v4 `color-mix`. `--radius: 0.5rem`. Chart and sidebar tokens were removed. The bejamas blue `--primary` no longer appears anywhere.
- Default color mode: the source uses next-themes `defaultTheme="system"`, so the demo follows `prefers-color-scheme` (it "loads dark" on a dark OS). The port does the same. Screenshots match in both `--dark` and light.
- Fonts: `next/font/google` Inter maps to `fontProviders.google()` Inter with `weights: ["100 900"]`. The default only loads 400, which would have faked the bold and semibold weights. `--font-heading` stays mapped to `--font-sans`. There is no mono font.
- `container` (v3 config `center`, `padding: 1.5rem`, `screens: {2xl: 1400px}`) became a custom `@utility site-container`. v4's `container` caps at every breakpoint and has no centering or padding. Redefining `container` itself would only extend the built-in utility, so a new name was used.
- **v4 `space-y-*` changed from margin-top on later children to margin-bottom on earlier children.** With an inline `<label>` first (shadcn `FormItem space-y-2`), the margin is ignored and each form row was 8px short. Fixed with `[&>:not(:first-child)]:mt-2` (v3 semantics). This is a general v3 to v4 trap for any `space-y` wrapper whose first child is inline.
- **Gradients**: v4 `bg-linear-*` interpolates in oklab and v3 in sRGB. `bg-linear-to-r/srgb` matches the "Shadcn" and "Community?" text gradients and the logo tile.
- Shadows: v3 `shadow-sm` is v4 `shadow-xs`. v3 `shadow-inner` is v4 `inset-shadow-sm`. v3 `drop-shadow-xl` is two layers, reproduced with an arbitrary `[filter:drop-shadow(...)_drop-shadow(...)]`. `max-w-screen-*` became `max-w-(--breakpoint-*)`.
- v4 preflight drops `cursor: pointer` on buttons, so it was restored in `@layer base`.
- tailwind-merge drops `leading-none` when a later font-size class appears. The source had the same behaviour: its `CardTitle className="text-lg"` also lost `leading-none`. Merge order was kept so line heights match.
- Assets: `public/hero-image-{dark,light}.jpeg` and `favicon.ico` were copied. `avatars.githubusercontent.com/u/75042455`, `i.pravatar.cc/250?img=58` and seven Unsplash photos (at `w=600`) were vendored into `public/`. No hotlinks remain except the OG image URL in meta tags.
- The demo shows a light `#e5e7eb` border on the Features dropdown in dark mode. The cause is `@devnomic/marquee/dist/index.css`, which ships an unlayered preflight (`*, ::before, ::after { border-color: #e5e7eb }`, plus placeholder colours) that overrides `border-border` on elements with a bare `border` class. The port reproduces only the visible effect, on the nav popup.

## Animation & third-party libraries
- The page has no framer-motion. Animations are CSS only: accordion height, which comes from bejamas `animate-accordion-*`; hover transitions (team saturate/scale, benefits number fade, arrow nudge), copied as-is; and the marquee.
- `@devnomic/marquee` maps to bejamas `Marquee` with the keyframes added (see Bugs).
- embla-carousel maps to `@data-slot/carousel` (native scroll-snap with smooth `scrollTo`). Previous/next disabled states at the ends match embla. Drag is enabled. Embla's momentum and spring physics are replaced by native snapping.
- react-hook-form plus zod becomes native `required`/`minlength=2`/`maxlength=255`/`type=email`. The submit handler composes the same `mailto:` URL.

## Next.js-specific translations
- `next/image` becomes plain `<img>` with the same `width`/`height` attributes. Remote images are vendored. The Features dropdown image (`avatars.githubusercontent.com`) is **not** in `next.config.mjs` `remotePatterns`, so the demo returns a 400 and shows the alt text "RadixLogo". The port shows the intended image. This is recorded as demo drift.
- `next/link` becomes `<a>`.
- `next/font` becomes the Astro fonts API (see above).
- `next-themes` becomes an inline head script. The hero reads next-themes' raw `theme` (`"system"` by default), so the **dark dashboard screenshot shows even in light mode** until the user explicitly picks light. The port mirrors this with `html[data-theme-choice]` and the `in-data-[theme-choice=light]:` variant.
- The `metadata`/`openGraph`/`twitter` exports become `<meta>` tags in `Layout.astro`. `<html lang="pt-br">` is kept, along with the Portuguese toggle labels "Escuro"/"Claro".
- `"use client"` components became static Astro components plus primitive scripts. No React runtime remains.

## Verification
- `bun run build`: success, with no warnings related to the port. Preview: `bun run preview --port 4405`.
- Screenshots in `.compare/`: `original*.png` and `port*.png` at 1440 and 390, in dark and light. Interaction captures are `orig-i-*.png` and `port-i-*.png` (nav dropdown, FAQ open, carousel after "next", mobile sheet, after following a sheet link).
- Layout diff (`.compare/measure.mjs`, `m-*.txt`): after fixes, every section, heading, form and label has an identical y/h/x/w to the demo at 1440 and 390 in dark mode. The only diff lines are the hidden drawer title and the Select label id.
- Behaviour (`.compare/checks.mjs`, `interact.mjs`), with no console errors on either width:
  - Theme toggle: system dark → light (light hero image appears) → persists across reload → dark.
  - Carousel: the first three slides are `active` and the rest are `inert`. Previous is disabled at the start and Next is disabled after three clicks.
  - Accordion: single-open and collapsible.
  - Select: choosing "REST API" updates `FormData.subject` and the trigger text.
  - Contact form: an empty submit is blocked by native validation.
  - NavigationMenu: opens on click and closes on Escape.
  - Mobile drawer: opens, closes when a link is followed, and scrolls to the hash.
  - "View original": `href` is the demo, `target=_blank`, `z-index:9999`, fixed.
- Remaining differences:
  - The nav dropdown shows the intended image instead of the demo's broken image.
  - Some lucide 1.x glyphs may differ slightly from the 0.383 versions; no visible difference was spotted at screenshot scale.
  - Native validation messages replace zod's.
  - Carousel motion is native smooth scroll rather than embla's.
  - The mobile sheet does not auto-focus or show the focus ring on the theme toggle the way Radix did in the demo capture.
  - The headless-only 375px drawer width (Bugs #6).

## Lessons for a migration skill
- **(General) Run a DOM position diff, not only screenshots.** A 20-line Playwright script that dumps `getBoundingClientRect()` for headings, sections and labels on both sites found every 2 to 24px drift (accordion border, phantom grid gap, `space-y` on inline labels) that screenshots hid.
- **(General) Neutralise the bejamas Card for shadcn-default ports with one shared class string**: `rounded-lg border border-solid border-secondary shadow-xs ring-0 text-base`. Add `overflow-visible` for badges that hang outside the card, `grid-rows-none` for single-child headers, `w-full` for headers inside `items-center` cards, and `flex-col` when the source passes `flex` to `CardHeader`.
- **(General) Specificity traps**: `data-[size=default]:h-9` on Input/SelectTrigger beats `h-10`, so override the data-variant form too. The Drawer's unlayered `<style is:global>` beats all utilities, so use `!`.
- **(General) After `bejamas add`, grep `src/ui` for `@/lib/*` and `@data-slot/*` imports that do not resolve**, and for animation names without keyframes (`marquee-x`). Build immediately after adding components.
- **(General) Pass `data-slides="multiple"` on `CarouselRoot` whenever several cards are visible.** This avoids the "visible neighbours are inert" gap noted in earlier findings. For embla `basis-1/3` with `-ml-4/pl-4`, use `basis-[calc((100%-2rem)/3)]` with the content's `gap-4`.
- **(General) Mobile Sheet with nav links**: use `Drawer` with `<Button as="a" data-slot="drawer-close">` to close on navigation without custom JS.
- **(General) Tailwind v3 to v4 checklist**:
  - `container` becomes a custom utility.
  - `space-y` with an inline first child needs `mt` on the following siblings.
  - Gradients need `/srgb`.
  - `shadow-sm` becomes `shadow-xs`, `shadow-inner` becomes `inset-shadow-sm`, and `drop-shadow-xl` must be written out.
  - `max-w-screen-*` becomes `max-w-(--breakpoint-*)`.
  - Restore the button cursor.
  - Wrap HSL triplets in `hsl()`.
- **(General) Load the Google variable font weight range** (`weights: ["100 900"]`). Astro's default (400 only) silently fakes bold weights.
- **(General) Check third-party CSS for leaked global preflights** (e.g. `@devnomic/marquee`). They change the demo's runtime colours in ways the source classes don't show.
- **(Site-specific) This template's `theme === "light"` hero check and its `color="white"` sponsor icons** (invisible in light mode) are source quirks. Reproduce them for fidelity and document them; do not "fix" them silently.
