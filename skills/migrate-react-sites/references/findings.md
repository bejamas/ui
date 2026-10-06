
# Consolidated findings: 15 Next.js + shadcn/ui → Astro + bejamas/ui 0.5.0 ports

Sources: the 15 `/tmp/bui-ports/<slug>/MIGRATION_FINDINGS.md` files, the brief (`/tmp/bui-ports/BRIEF.md`), this repository (HEAD `0cd47c3`), the generated style registry in `apps/web/public/r/styles/bejamas-juno/*.json`, and the installed files in each port (`src/ui`, `node_modules/bejamas`, `node_modules/@data-slot/*` 1.1.1, `dist/`).

**Port abbreviations used in the "Ports" columns:**

| # | slug | # | slug | # | slug |
|---|---|---|---|---|---|
| S1 | nextjs-saas-starter | S6 | shadcnstore-landing | S11 | saascn |
| S2 | ixartz-saas-boilerplate | S7 | launch-ui | S12 | velora-saas |
| S3 | saasfly | S8 | nextbase | S13 | shadcnstudio-zolt |
| S4 | chadnext | S9 | cloudflare-saas-template | S14 | shadcnstudio-bistro |
| S5 | nobruf-shadcn-landing | S10 | gonzalochale-saas-landing | S15 | shadcnstudio-ink |

**Status labels:** VERIFIED means the cause was confirmed in source or build output, with file:line cited. NOT REPRODUCED means the claim does not hold, with the reason given. UNVERIFIED means it was observed only at runtime by a port and not traced in source.

**"0.5.0 vs main", two facts that apply throughout:**
1. Component files are not taken from the npm package. `bejamas add` fetches them from the remote registry, which matches `apps/web/public/r/styles/bejamas-juno/*.json` on main. Every installed component file in all 15 ports matches the main registry JSON, apart from install-time icon inlining (SemanticIcon → inline `<svg>`) and the `cn-menu-target`/`cn-font-heading` token rewrites (checked with a script over every `src/ui` file). **Component bugs listed as VERIFIED are therefore still present on main**, except where a row says otherwise.
2. **Button is the exception.** All 15 ports run the stale `templates/astro/src/ui/button/Button.astro`, last changed in `299d3ae` (2026-01-12), byte-identical in every port. `bejamas add button` reports "Skipped … (files might be identical)" and never replaces it. The registry Button on main (`packages/registry/src/ui/button/Button.astro` + `style-juno.css`) is different: it has `data-slot="button"`/`data-variant`/`data-size`, `border border-transparent bg-clip-padding`, outline `bg-background hover:bg-muted hover:text-foreground`, and `sm` = `h-8 text-xs`. Several Button complaints below are therefore **fixed in the registry but not in the template that ships**.

`node_modules/bejamas` (npm 0.5.0, bumped in `0268b97` on 2026-09-29) is the CLI plus `bejamas/tailwind.css`. Its `src/tailwind.css` is byte-identical to `packages/bejamas/src/tailwind.css` on main.

---

## 1. Overview

| Port | Original demo | Port path (preview port) | Fidelity verdict | Biggest approximations |
|---|---|---|---|---|
| S1 nextjs-saas-starter | https://next-saas-start.vercel.app | /tmp/bui-ports/nextjs-saas-starter (4401) | faithful (every measured box identical at 1440) | copy-to-clipboard is a small script; `active:scale-98` press effect remains |
| S2 ixartz-saas-boilerplate | https://react-saas.com/ | /tmp/bui-ports/ixartz-saas-boilerplate (4402) | faithful (pixel-identical except the comparison button) | desktop nav duplicated as a static copy (no breakpoint-only disclosure); locale switch doesn't navigate; 7.5px header shift while the dropdown is open (headless scroll lock) |
| S3 saasfly | https://show.saasfly.io/en | /tmp/bui-ports/saasfly (4403) | close with documented approximations | GlowingEffect is a hover orbit, not pointer tracking; AnimatedTooltip spring dropped; ColourfulText rotates instead of shuffling; mobile menu has no scroll lock or close-on-link |
| S4 chadnext | https://chadnext.moinulmoin.com/en | /tmp/bui-ports/chadnext (4404) | faithful (page heights identical, light and dark) | Sheet→Drawer needs global CSS; slide-in is 250ms vs 500ms; Drawer close not auto-focused |
| S5 nobruf-shadcn-landing | https://shadcn-landing-page-livid.vercel.app | /tmp/bui-ports/nobruf-shadcn-landing (4405) | faithful | react-hook-form+zod replaced by native validation; embla physics replaced by scroll-snap; nav image shown although the demo's is broken |
| S6 shadcnstore-landing | https://shadcnstore.com/templates/dashboard/shadcn-dashboard-landing-template/landing | /tmp/bui-ports/shadcnstore-landing (4406) | faithful (0–0.7% pixel diff per chunk) | theme customizer omitted; no circular view-transition theme reveal; native form validation |
| S7 launch-ui | https://www.launchuicomponents.com/ | /tmp/bui-ports/launch-ui (4407) | close with documented approximations | demo ≠ repo (pro site recovered from DOM); gallery live previews became screenshots; Shuffle randomises only colour and radius; Marquee duplicates 2× vs 4× |
| S8 nextbase | https://open-source-template.usenextbase.com | /tmp/bui-ports/nextbase (4408) | faithful (0 geometry diffs at 1440/768/390) | none visible; outline/badge border uses `--border` instead of gray-200 |
| S9 cloudflare-saas-template | https://nextjs-saas-template.lubomirgeorgiev.com/ | /tmp/bui-ports/cloudflare-saas-template (4409) | faithful (heights identical at 1440/768/390) | typing terminal rebuilt in CSS; sponsor banner moved to `bottom-16`; collapse state not persisted |
| S10 gonzalochale-saas-landing | https://saas.gonzalochale.com | /tmp/bui-ports/gonzalochale-saas-landing (4410) | close with documented approximations | NumberFlow count-up dropped; `whileInView once` became a scroll-bound `view()`; mobile menu doesn't close on link tap |
| S11 saascn | https://saas-landing.techwithanirudh.com/ | /tmp/bui-ports/saascn (4411) | faithful | Blog mega-menu and mobile menu float instead of pushing the header; search lists results before typing; autoplay via `carousel:set` timer |
| S12 velora-saas | https://velora.colorlib.com/templates/saas | /tmp/bui-ports/velora-saas (4412) | close with documented approximations | ~20 motion components rebuilt in CSS/SMIL; NumberTicker static; spotlight/tilt/dock lose cursor tracking; no ⌘K hotkey |
| S13 shadcnstudio-zolt | https://shadcn-nextjs-zolt-landing-page.vercel.app | /tmp/bui-ports/shadcnstudio-zolt (4413) | close with documented approximations | WebGL lanyard static; calendar is a build-month RadioGroup grid; carousel slides instead of cross-fading; custom cursor dropped |
| S14 shadcnstudio-bistro | https://shadcn-nextjs-bistro-landing-page.vercel.app | /tmp/bui-ports/shadcnstudio-bistro (4414) | faithful (section heights identical at 5 widths) | hero thumbnails start-aligned instead of centered; carousel loop rewinds instead of looping seamlessly; scroll-spy uses Chromium-only `:target-current` |
| S15 shadcnstudio-ink | https://shadcn-nextjs-ink-landing-page.vercel.app | /tmp/bui-ports/shadcnstudio-ink (4415) | faithful (identical section geometry, light and dark) | ScrollArea replaced by native overflow; scroll spy via `:target-current`; DropdownMenu link items need a keyboard listener |

Verdicts: 10 faithful and 5 close with documented approximations. All 15 build with `bun run build` and report no console errors in their Playwright interaction scripts.

---

## 2. Bugs in bejamas 0.5.0 components

Sorted by number of ports that hit each bug.

| # | Bug | Ports (count) | Repro → observed vs expected | Workaround used | Verification | Suggested fix |
|---|---|---|---|---|---|---|
| 1 | **Card never renders its border.** The class string contains both `border-none` and `border border-border`. | S3 S4 S5 S6 S7 S8 S10 S13 S14 S15 (10) | `<Card class="border border-red-500">` → computed `border-style: none`, width `0`. The visible edge is `ring-1 ring-foreground/10`. After `ring-0`, cards have no edge at all. Expected: a 1px border, or no border classes. | add `border-solid` (plus `ring-0` for shadcn cards). This only works because `.border-solid` is emitted after `.border-none`. | **VERIFIED.** Installed `src/ui/card/Card.astro:100`: `cn("ring-foreground/10 bg-card border-none … shadow-sm ring-1 … border border-border shadow-lg", …)`. The source is `packages/registry/src/styles/style-juno.css:240-242` (`.cn-card` base: `border-none … shadow-sm ring-1`) concatenated with the juno override `:1430-1432` (`rounded-xl border border-border bg-card … shadow-lg`). tailwind-merge keeps `border-none` (border-style) and `border` (border-width). Compiled CSS in `shadcnstudio-ink/dist`: `.border-none{--tw-border-style:none;border-style:none}`, `.border{border-style:var(--tw-border-style);border-width:1px}`, so the style is always none. Present on main. **Sub-claim by S13/S15 that the card shows "ring AND border (double edge)": NOT REPRODUCED.** The border is style `none`, so their `border-0` was a no-op. | Pick one edge model for juno. Either drop `border-none` from the base `.cn-card` and drop `ring-1` in the juno override, or drop `border border-border` from the override. Add a registry test asserting that no merged class list contains both `border-none` and `border`. |
| 2 | **DropdownMenu/Dialog/Drawer scroll lock reserves a scrollbar gutter.** | S2 S4 S5 S6 S9 S10 S14 S15 (8) | Opening a menu, dialog or drawer sets `html{overflow:hidden;scrollbar-gutter:stable}`. In headless Chromium (hidden scrollbars) the layout shrinks by 15px: centered content shifts 7.5px, fixed elements shift 15px, and `w-3/4` drawers measure 281px instead of 292.5px. Radix (`react-remove-scroll`) doesn't shift. | none (accepted). Ports note it so screenshot diffs aren't misread. | **VERIFIED in code**: `@data-slot/core` 1.1.1 `dist/index.js` → `lockScroll(){…e.style.overflow='hidden',e.style.scrollbarGutter='stable'}` with no check for whether a scrollbar exists. Visual impact was measured only in headless runs. **UNVERIFIED** on real classic-scrollbar desktops (expected to show only on pages that are not scrollable). | Measure `innerWidth - documentElement.clientWidth`. Set `scrollbar-gutter: stable` (or `padding-right` equal to the measured width) only when that value is > 0. |
| 3 | **Marquee does not animate after `bejamas add marquee`.** | S3 S5 S6 S7 S11 S12 S13 (7) | Fresh app + `bunx bejamas add marquee -y` → `transform: none`. Expected: scrolling. | copy `@keyframes marquee-x`/`marquee-y` into `src/styles/globals.css` (S5 added a `--marquee-gap` term for a seamless loop with a gap). | **VERIFIED.** `packages/registry/src/ui/marquee/Marquee.astro:101,111` use `[animation:marquee-x_var(--duration,_20s)_linear_infinite]` / `marquee-y`. The keyframes exist only in `packages/ui/src/styles/globals.css:183-198` (the docs app). `packages/bejamas/src/tailwind.css` has none (identical in `node_modules/bejamas`, `grep -c marquee` → 0). `apps/web/public/r/styles/bejamas-juno/marquee.json` has no `css`/`cssVars` keys. `apps/web/registry.json:730-742` has no css either. Present on main. | Add both keyframes to `packages/bejamas/src/tailwind.css` (which ships with `bejamas`), or add a `css` block to the marquee registry item. |
| 4 | **Drawer geometry and backdrop can't be styled with utilities.** | S4 S5 S6 S7 S9 S12 (6) | `<DrawerContent class="w-3/4 sm:max-w-sm rounded-none">` → still 340px with 16px radii. The backdrop is a light veil in dark mode. Expected: classes win, and the overlay is controllable. | `w-3/4! sm:max-w-sm! rounded-none! border-y-0 border-r-0 p-0 gap-0`, or unlayered global rules like `[data-slot="drawer-popup"][data-swipe-direction="right"].sheet-panel{width:75%;border-radius:0}` and `[data-slot="drawer-backdrop"]{background-color:rgb(0 0 0/.8)}` | **VERIFIED.** `packages/registry/src/ui/drawer/DrawerContent.astro:42` `<style is:global>` (unlayered): `:73-74` `width: 340px; border-radius: var(--radius-2xl,16px) 0 0 …`, `:86-87` (left), `:66` `max-width:100vw`. Backdrop `:14-15` `class="fixed inset-0 z-50 bg-foreground/20"` with no prop. Popup `:26-27` also hard-codes `gap-4 … border border-border … p-4`. By contrast, `DialogContent` already has `overlayClass` (`dialog/DialogContent.astro:11`). Present on main. | Wrap the global styles in `@layer components`, or move them to `:where()` selectors. Add `overlayClass`/`backdropClass` (as Dialog has) and a `size` prop (`sm\|default\|full` or a CSS variable `--drawer-size`). |
| 5 | **Card has contradictory shadow classes** (`shadow-sm` … `shadow-lg`). | S3 S8 S13 S15 (4) | The rendered shadow is `shadow-lg`, and `shadow-sm` is dead. shadcn cards are `shadow-sm` (v3) / `shadow-xs` (v4). | `shadow-xs` / `shadow-sm` / `shadow-none` per source | **VERIFIED**: same merge as #1 (`style-juno.css:241` `shadow-sm`, `:1431` `shadow-lg`). | Keep one shadow. |
| 6 | **`asChild` renders a wrapper `<div>`, not composition.** | S3 S10 S13 S15 (4) | `<TooltipTrigger asChild><button/></TooltipTrigger>` → `<div data-slot="tooltip-trigger" data-as-child><button/></div>`. The div becomes the trigger; responsive classes on the child leave an empty wrapper that still takes a flex gap slot (S15). | pass `data-slot="<primitive>-trigger"` straight to `Button` (Button forwards rest props); move `sm:hidden`/`lg:hidden` to the component root; put sizes on the `Tooltip` root (S13). | **VERIFIED**: `packages/registry/src/ui/tooltip/TooltipTrigger.astro:21` `<div data-slot="tooltip-trigger" data-as-child …>`. The same pattern is in Dialog/Accordion triggers (`AccordionTrigger.astro:20-30`). | Document the `data-slot` pass-through as the official "asChild" recipe. Or implement real child-slot hoisting: `Astro.slots.render` + inject attributes into the first element. |
| 7 | **Interactive components emit an in-place `<script type="module">` sibling, which breaks `space-x/y-*` and `:last-child`.** | S10 S15 + same mechanism in S3's own component (3) | `<div class="space-y-16">…<Tabs/></div>` → Tabs root is no longer `:last-child` and gets `margin-block-end:4rem` (blog section 1648 vs 1584px). `space-x-4` with a Toggle shifted the nav 16px; `space-y-3` + Dialog added 12px. | `gap-*` instead of `space-*`; wrap the component in a `<div>`; `<Dialog class="contents">`. | **VERIFIED** in `shadcnstudio-ink/dist/index.html`: `…</div><script type="module" src="/_astro/Tabs.astro_astro_type_script_index_0_lang….js"></script></div>`. This is Astro's script rendering combined with Tailwind v4 `space-*` (`:not(:last-child)`), not a bejamas source line, but every bejamas interactive component triggers it. | Document it prominently ("use `gap-*` around bejamas components"). Consider `<script>` hoisting (an Astro option) or a single shared init script per page. |
| 8 | **Badge default shape is square (`rounded-xs`).** | S5 S8 S15 report it; S2 S6 S7 S13 override it (7 affected) | `<Badge>` → radius 0.125rem, although the base class has `rounded-full`. Expected: pill (shadcn) or no dead `rounded-full`. | `shape="pill"` | **VERIFIED**: `packages/registry/src/ui/badge/Badge.astro:94-96` cva `shape.default: "rounded-xs"`; `:118` `cn("cn-badge", classes)`. The expanded `cn-badge` (juno `style-juno.css:91` `rounded-4xl` + override `:1563` `rounded-full`) comes first, so cva's `rounded-xs` wins. **S6's statement "bejamas Badge is `rounded-full` by default": NOT REPRODUCED.** | Make `shape.default` empty (inherit the style's radius), or make the default `pill`. |
| 9 | **Button `variant="link"` is `text-accent`.** | S6 S15 (2) | In neutral themes `--accent` is near-white `oklch(0.97 0 0)`, so link buttons are nearly invisible. shadcn uses `text-primary`. | `class="text-primary"` | **VERIFIED** in the template Button `templates/astro/src/ui/button/Button.astro:130` (`link: "text-accent …"`) **and still on main**: juno `style-juno.css:169-171` (`text-primary`) + override `:1414-1416` (`text-accent p-0`) → tailwind-merge keeps `text-accent`. | Override with `text-primary` (or use `text-accent` only when the theme's accent is a brand colour). |
| 10 | **Outline Button hover uses `accent` (bg + border + text).** | S13 S15 report it as a bug; S1 S3 S8 S12 override it (6) | Themes that repurpose `--accent` as a brand colour (S13 orange `oklch(0.6837 0.212 40.59)`, S15 blue accent-foreground) turn every outline button orange/blue on hover. | `hover:bg-muted hover:text-foreground hover:border-border` | **VERIFIED** in the template Button `:126` (`hover:bg-accent hover:border-accent hover:text-accent-foreground`, no `bg-background`). **Fixed in the main registry**: juno `.cn-button-variant-outline` `:1402-1404` = `border border-border bg-background hover:bg-muted hover:text-foreground … shadow-none`. Ports still get the old file (see the "0.5.0 vs main" note). | Ship the registry Button in the template (see CLI #4). |
| 11 | **DropdownMenu link items don't follow `href` from the keyboard.** | S4 S11 S14 S15 (4) | `DropdownMenuItem` always renders `div[role=menuitem]` (no `as`/`href`). An `<a data-slot="dropdown-menu-item">` navigates on pointer click, but Enter/Space only emits `dropdown-menu:select` (or nothing without `data-value`). | listener: `dropdown-menu:select` → `if (detail.source==="keyboard") item.click()` / `location.assign(link.href)` | **VERIFIED**: `packages/registry/src/ui/dropdown-menu/DropdownMenuItem.astro:23-25` (`<div … role="menuitem">`). `@data-slot/dropdown-menu` dist: `case 'Enter': case ' ': e.preventDefault() …`, and `valueFor(e)===null` → return. | `href` prop on `DropdownMenuItem` that renders `<a>`. In the primitive, skip `preventDefault` and call `.click()` for `a[href]` items; `data-value` optional. |
| 12 | **Badge `Props` doesn't extend HTML attributes.** | S2 (1) | `<Badge as="a" href="…">` → `astro check` `ts(2322) Property 'href' does not exist on type 'IntrinsicAttributes & Props'` (works at runtime through `...props`). | spread an object `{...twitterLink}` | **VERIFIED**: `Badge.astro:64-70` `interface Props { as?; variant?; class?; shape?; size? }`. | Use the same `ButtonAsButton \| ButtonAsAnchor` union as Button (`Button.astro` Props). |
| 13 | **Badge default `size` overrides its own base size.** | S2 (bug); S5 S6 S7 S8 S13 S14 S15 (override) (8) | `cn-badge` base is `h-5 … text-xs`, but `size.default: "text-sm h-6"` merges after it, so the base sizes are dead. | `size="sm"` or `h-auto … text-xs` | **VERIFIED**: `Badge.astro:98-100`; `style-juno.css:91`. | Make `size.default` empty, or remove the sizes from the base. |
| 14 | **Select install doesn't build.** | S5 (1) | `bunx bejamas add select -y && bun run build` → `Rolldown failed to resolve import "@/lib/select" from ".../src/ui/select/Select.astro"`. `@data-slot/select` is not installed either. | `bun add @data-slot/select`, copy `packages/registry/src/lib/select.ts`, rewrite `@bejamas/registry/lib/` → `@/lib/` | **VERIFIED**: `packages/registry/src/ui/select/Select.astro:297` imports `@bejamas/registry/lib/select`. `apps/web/public/r/styles/bejamas-juno/select.json:52-59` has `dependencies:["class-variance-authority"]` and `registryDependencies:["index","select","utils"]`. The `select` entry refers to the item itself. There is no `registry:lib` item for `lib/select.ts` (compare `toggle-group-controller.json`, which is a `registry:lib` with `@data-slot/toggle-group`). `getHeadlessDependencies` (`packages/registry/src/lib/headless-dependencies.ts`) scans only the item's own files, so `@data-slot/select` (imported from the lib) is missed. `apps/web/registry.json:869` declares `@data-slot/select`, but that doesn't reach the style JSON. Present on main. | Add a `select-controller` (or `select-lib`) `registry:lib` item with `lib/select.ts` + `@data-slot/select`, and reference it from `select`. Add a registry test that every `@/lib/*` / `@bejamas/registry/lib/*` import resolves to a registry dependency. |
| 15 | **ToggleGroup controller re-adds variant classes at runtime, bypassing tailwind-merge.** | S7 (1) | `<ToggleGroupItem class="p-1">` renders 4px 8px padding after init, because the runtime adds `px-2` back (also `h-9 min-w-9 hover:bg-muted aria-pressed:bg-muted`). | `p-1!`, `px-0!`, `p-2!` | **VERIFIED**: `packages/registry/src/lib/toggle-group-controller.ts:69-89` `syncItemAttributes()` → `for (const className of toggleVariants({…}).split(/\s+/)) item.classList.add(className)`. | Set only `data-variant`/`data-size`, or skip classes whose group the server-merged class list already contains. |
| 16 | **ToggleGroup multiple `defaultValue` array never selects.** | S7 (1, by reading; not hit at runtime) | `<ToggleGroup multiple defaultValue={["bold","italic"]}>` → `data-default-value="bold,italic"`, which the primitive splits on whitespace into `["bold,italic"]`, matching nothing. The component's own JSDoc demo (`ToggleGroup.astro:74`) uses exactly this. | n/a | **VERIFIED**: `packages/registry/src/ui/toggle-group/ToggleGroup.astro:206` `defaultValue.join(",")`; `@data-slot/toggle-group` dist `e.split(/\s+/)`. | `join(" ")`. |
| 17 | **CarouselSlide applies 2-up grid tracks outside `variant=multiple`.** | S13 (1) | A vertical single carousel whose slide has its own `grid sm:grid-cols-[323px_1fr]` is split into two 156px rows. | `group-data-[orientation=vertical]/carousel:grid-rows-none` | **VERIFIED**: `packages/registry/src/ui/carousel/CarouselSlide.astro:17`: `group-data-[variant=multiple]/carousel:grid …:gap-4 group-data-[orientation=horizontal]/carousel:grid-cols-2 group-data-[orientation=vertical]/carousel:grid-rows-2`. The track classes aren't scoped to `variant=multiple`. | Prefix the tracks with `group-data-[variant=multiple]/carousel:` too (e.g. `group-data-[variant=multiple]/carousel:group-data-[orientation=…]:…`, or use a `data-variant` attribute on the slide). |
| 18 | **AvatarFallback / AvatarImage (without `src`) render `<div>`, which breaks phrasing content.** | S11 (1) | `<p>By <Avatar>…</Avatar> name</p>` → the parser closes `<p>` at the `<div>`. The `absolute inset-0` fallback then covers the whole testimonial card and shows a large "??". | wrapper `<p>` → `<div>` | **VERIFIED**: `packages/registry/src/ui/avatar/AvatarFallback.astro:15` `<div data-slot="avatar-fallback">`; `AvatarImage.astro:33` `<div data-slot="avatar-image">` branch. | Render `<span>` (Radix does). |
| 19 | **RadioGroupItem renders an empty `id`.** | S13 (1) | `<RadioGroupItem value="x">` → `<span … id data-slot="radio-group-item">` | none | **VERIFIED**: `packages/registry/src/ui/radio-group/RadioGroupItem.astro:15` `id = ""`, `:25` `id={id}`. Rendered output in `shadcnstudio-zolt/dist/index.html`: `… data-duration="20 min" id data-slot="radio-group-item"`. | `id = undefined`. |
| 20 | **StickySurface line colour is `after:bg-black/15`.** | S3 (1) | invisible on dark themes; no colour prop | `after:bg-border` | **VERIFIED**: `packages/registry/src/ui/sticky-surface/StickySurface.astro:82`. | `after:bg-border`. |
| 21 | **Separator has no `data-slot`/`data-orientation`.** | S14 (1) | source classes `data-vertical:self-center` / `data-horizontal:*` never match | rewrite to plain classes | **VERIFIED**: `packages/registry/src/ui/separator/Separator.astro:49-58` renders only `aria-orientation` + `aria-hidden`. | Add `data-slot="separator"` and `data-orientation`, plus `data-horizontal`/`data-vertical` (shadcn v4 parity). |

Design-level defaults that ports called bugs are listed in §4 as style differences. They include Toggle `hover:bg-muted aria-pressed:bg-muted` (S13), DropdownMenuContent `align="start"` (S2, S10), TabsList default `variant="indicator"` (S15) and Textarea `field-sizing-content` ignoring `rows` (S5, VERIFIED `textarea/Textarea.astro:45`).

---

## 3. Bugs in the CLI / template / registry

| # | Issue | Ports (count) | Observed vs expected | Workaround | Verification |
|---|---|---|---|---|---|
| 1 | **Default theme is `bejamas-blue` even with `-b neutral`.** `--primary: oklch(0.4634 0.2647 264.76)` in `:root` and `.dark`, plus sidebar-primary and blue charts. | all 15 (15) | The blue primary leaks into Button default, Badge default, rings and links unless every token is replaced. Expected: `-b neutral` gives a neutral primary, or the theme is chosen explicitly. | replace `:root`/`.dark` wholesale with source tokens | **VERIFIED**: `packages/create-config/src/preset.ts:283-292` `DEFAULT_PRESET_CONFIG = { style: "juno", baseColor: "neutral", theme: "bejamas-blue", … }`; theme in `packages/registry/src/catalog/themes.ts:1085-1103` (`name: "bejamas-blue", title: "Marine"`). `-b` sets only the base colour. |
| 2 | **Template pins `bejamas ^0.4.1`.** | all 15 (15, required step in the brief) | `bun add bejamas@0.5.0` needed | as brief | **VERIFIED**, still on main: `templates/astro/package.json` `"bejamas": "^0.4.1"`. |
| 3 | **`bejamas add` adds `shadcn` to devDependencies.** | reported by S4 S14; present in 14/15 (every port that ran `add`) | `"shadcn": "^4.21.3"` appears in an Astro project | remove by hand | **VERIFIED**: `apps/web/public/r/styles/bejamas-juno/index.json:9-12` `devDependencies: ["shadcn","tw-animate-css"]` (spread from the template item by `buildStyleItem`, `packages/registry/scripts/build-web-style-registry.ts:612-627`). `grep '"shadcn"' */package.json` → 14 ports (all except S1). |
| 4 | **Template Button is stale, and `add button` never updates it.** | all 15 (15; root cause of most Button rows in §4) | Template Button (2026-01-12) lacks `data-slot="button"`/`data-size`, has outline without `bg-background` + accent hover, `sm` `h-8.5 text-sm`, `icon-sm` `size-8.5`. `bejamas add button` prints "Skipped … (files might be identical)". | none (ports override per instance) | **VERIFIED**: `templates/astro/src/ui/button/Button.astro:116-139` vs registry `apps/web/public/r/styles/bejamas-juno/button.json` (built from `packages/registry/src/ui/button/Button.astro:115-190` + `style-juno.css:145-203,1390-1428`). `cmp` shows all 15 ports' `src/ui/button/Button.astro` are identical to the template. Not fixed on main (template unchanged since `299d3ae`). |
| 5 | **Fonts: generated `BEJAMAS_ASTRO_FONTS` has no `weights`.** Astro then loads only 400, and `font-medium/semibold/bold` are synthesized. | reported by S5 S14 S15; S1 S4 S6 S7 S10 S11 S12 S13 also added `weights` (11) | faux-bold headings; S15 h2 wrapped differently | `weights: ["100 900"]` (variable range) | **VERIFIED**: `packages/bejamas/src/utils/astro-fonts.ts:106` emits `provider, name, cssVariable, subsets` only; `node_modules/astro/dist/assets/fonts/constants.js:1-2` `DEFAULTS = { weights: ["400"] }`. |
| 6 | **`@theme inline { --font-sans: var(--font-sans); --font-heading: var(--font-heading) }` is self-referential.** It works only while a `<Font cssVariable>` defines the variable. | S2 S3 S8 S9 (4) | Remove `<Font>` (system-stack site) → the variable is cyclic and invalid, and text falls back to serif. | literal stacks in `@theme inline` / `:root`; `BEJAMAS_ASTRO_FONTS = []` | **VERIFIED**: `packages/bejamas/src/utils/apply-design-system.ts:500-505,524-530` (`${fontVariable}: var(${fontVariable})`, `--font-heading: var(--font-heading)`). |
| 7 | **No colour-mode bootstrap.** `.dark` tokens ship, but the Layout has no class strategy. | reported by S5 S6 S11; 12 ports wrote a head script (S3 S4 S5 S6 S7 S9 S10 S11 S12 S13 S14 S15) | `prefers-color-scheme: dark` users always get light | inline `<head>` script (see §7) | **VERIFIED**: `templates/astro/src/layouts/Layout.astro` (no script). |
| 8 | **Scaffold ships `public/favicon.svg` + `public/bejamas.svg`, and the Layout links `/favicon.svg`.** | S1 S2 S3 S8 S15 (5) | must be deleted/replaced | delete | **VERIFIED**: `templates/astro/public/`, `Layout.astro:14`. |
| 9 | **Every `add` prints "Skipped 1 file: src/lib/utils.ts (files might be identical…)"** and the same message hides the stale Button (#4). | S2 S6 S8 S9 S15 (5) | noise; hides real non-identical skips | ignore | **VERIFIED** (shadcn CLI behaviour surfaced by `bejamas add`). |
| 10 | **Generated Layout `<html  lang="en">` (double space).** | S1 S3 S14 (3) | cosmetic | rewrite | **VERIFIED**: `packages/bejamas/src/utils/apply-design-system.ts:904-910`. The first `replace` leaves `<html >` and the second inserts ` lang=…` after the captured space. |
| 11 | **`astro check` needs `@astrojs/check`, which isn't in the template** (interactive install prompt). | S2 S4 S6 (3) | type checking skipped | `bun add -d @astrojs/check` | **VERIFIED**: `templates/astro/package.json`. |
| 12 | **Radius scale is additive and stops at `xl`.** `--radius-xl: calc(var(--radius) + 4px)`, no `2xl–4xl`. shadcn v4 (nova/vega/luma) is multiplicative (`* 1.4`) and defines `--radius-2xl..4xl`. | S12 (bug); S13 S14 S15 copied 2xl–4xl (4) | `rounded-2xl` cards 16px vs 18px | copy the source's `@theme inline` radius block | **VERIFIED**: `templates/astro/src/styles/globals.css:10-13`. |
| 13 | **Sidebar tokens and `--font-heading: var(--font-sans)` in `:root`.** The latter competes with a real heading `<Font>`, and the obvious edit (`var(--font-heading)`) is self-referential. | S2 S3 S4 S5 (4) | heading font ignored or invalid | delete the line once a heading font exists | **VERIFIED** in the scaffold commit of every port (`chadnext@e2fa84f:src/styles/globals.css:41`). The emitting line in the CLI was not located: UNVERIFIED. |
| 14 | **Viewport meta lacks `initial-scale=1`.** | S1 S12 (2) | cosmetic | rewrite | **VERIFIED**: `templates/astro/src/layouts/Layout.astro:13`. |
| 15 | **`@custom-variant dark (&:is(.dark *))` doesn't match `<html class="dark">` itself.** | S7 (1) | `dark:` on `html`/`body` never applies | `&:where(.dark, .dark *)` | **VERIFIED**: `templates/astro/src/styles/globals.css:5` (same as shadcn's default, so low priority). |
| 16 | **No `bejamas remove`.** Deleting a component leaves its `@data-slot/*` dependency. | S7 (1) | stale deps | `bun remove @data-slot/…` | **VERIFIED**: `packages/bejamas/src/commands/` has add/apply/docs/info/init/preset only. |
| 17 | `bejamas add … --overwrite` reported "Updated" for SelectContent/SelectItem/SelectTrigger on a second run. | S5 (1) | unclear | n/a | **UNVERIFIED** (not investigated by the port; the cmp script shows installed Select files differ from the registry only by icon inlining). |

---

## 4. Default-style differences vs shadcn (critical for the skill)

The "bejamas (installed)" column is what the ports actually ran. Button comes from the template, everything else from the juno registry. "shadcn" covers new-york v3/v4 unless a style (base-nova, radix-luma, radix-vega, radix-nova) is named. The override column lists the classes ports actually used.

### Button (`templates/astro/src/ui/button/Button.astro`)

| Property | bejamas (installed) | shadcn | Override used | Ports |
|---|---|---|---|---|
| radius | `rounded-lg` (= `--radius`) | `rounded-md` | `rounded-md` | S1 S2 S3 S4 S5 S6 S7 S8 S9 S10 S11 S15 (12) |
| press effect | `active:scale-98` | none (luma/vega: `active:translate-y-px`) | `active:scale-100` (+`active:translate-y-px`) | S1 S2 S4 S5 S6 S7 S8 S10 S11 S13 S14 S15 (12) |
| outline background | none (transparent; `dark:bg-input/30`) | `bg-background` | `bg-background dark:bg-background` | S1 S2 S3 S6 S8 S9 S11 S12 S15 (9) |
| default padding | `px-3` | `px-4` | `px-4` | S1 S2 S4 S5 S6 S8 S9 S10 (8) |
| `lg` padding | `px-5` | `px-6` (v3 default: `px-8`; luma `px-4`; vega `px-2.5`) | `px-6` / `px-8` / `px-4` | S1 S2 S4 S6 S8 S9 S11 S14 (8) |
| outline hover | `hover:bg-accent hover:border-accent hover:text-accent-foreground` | `hover:bg-accent hover:text-accent-foreground` (nova/vega: `hover:bg-muted`) | `hover:bg-muted hover:text-foreground hover:border-border` / `hover:border-input` | S1 S3 S8 S12 S13 S15 (6) |
| icon padding | `has-[>svg]:px-2.5` (default), `px-2` (sm), `px-4` (lg) | `has-[>svg]:px-3` / `px-2.5` / `px-4` | add the same variant: `has-[>svg]:px-4`/`px-6`/`px-8`. A plain `px-*` doesn't beat it. | S4 S6 S9 S10 S12 S14 (6) |
| ghost hover | `hover:bg-secondary` | `hover:bg-accent` (`dark:hover:bg-accent/50`) | `hover:bg-accent hover:text-accent-foreground` | S2 S3 S4 S6 S8 S10 (6) |
| default shadow | `shadow-xs` on `default` and `outline` | none (v4) | `shadow-none` | S2 S3 S8 S9 S12 (5) |
| `sm` height | `h-8.5 text-sm` | `h-8` (v4) / `h-9` (v3) | `h-8` / `h-9` | S2 S3 S5 S10 S11 (5) |
| default height | `h-9` | `h-10` (v3 "default" style, base-nova `h-10`) / `h-8` (nova) | `h-10` / `h-8` | S3 S4 S5 S9 S12 (5) |
| `icon` size | `size-9`, no `text-sm` | `h-10 w-10` (v3) / `size-8` (nova) | `size-10` / `size-8`; add `text-sm` (S8: line box 16 vs 14px) | S8 S9 S13 (3) |
| transparent border | none | luma/vega: `border border-transparent bg-clip-padding` (+2px box) | `border border-transparent bg-clip-padding` | S14 S15 (2) |
| svg sizing | `[&_svg:not([class*='size-'])]:size-4` | v3: `[&_svg]:size-4`, which beats an icon's `size-5`/`h-5 w-5` | pass `size-4` to match what actually renders | S3 S9 (S1: no change needed, new-york v4 has the same rule) (3) |
| `shrink-0` | yes | no | `shrink` | S5 (1) |
| link | `text-accent` | `text-primary` | `text-primary` | S6 S15 (2) |
| data attrs | none (`data-slot`, `data-size` absent) | `data-slot="button" data-variant data-size` | inline the effect of source CSS like `[data-slot='button'][data-size='lg']:not(.px-6){px-4}` | S14 S15 (2) |

Registry Button on main (not what ports ran): `sm` = `h-8 text-xs`, outline has `bg-background hover:bg-muted`, and the base has `border border-transparent bg-clip-padding` + `data-slot/variant/size`. These four rows would go away with CLI #4 fixed. `rounded-lg`, `active:scale-98`, `px-3`/`px-5`, ghost `hover:bg-secondary` and link `text-accent` would remain.

**Snippets ports converged on** (S4 `src/lib/shadcn.ts`, S6/S8 `src/lib/site.ts`, S5 `src/lib/landing.ts`, S14 `lumaButton`):
- new-york default: `rounded-md px-4 shadow-none active:scale-100`; lg `rounded-md px-6 has-[>svg]:px-4 active:scale-100`; outline `bg-background hover:bg-accent hover:border-border shadow-none`.
- radix-luma/vega: `border border-transparent bg-clip-padding gap-1.5 shadow-none hover:bg-primary/80 active:scale-100 active:translate-y-px rounded-md`.

### Badge (`src/ui/badge/Badge.astro`)

| Property | bejamas | shadcn | Override | Ports |
|---|---|---|---|---|
| height/text | `h-6 text-sm` (size default) | `h-5`/auto, `text-xs` (v3 `font-semibold px-2.5 py-0.5`) | `size="sm"` or `h-auto px-2.5 py-0.5 text-xs font-semibold` | S2 S5 S6 S7 S8 S13 S14 S15 (8) |
| radius | `rounded-xs` (shape default) | `rounded-full` (v3/vega) / `rounded-md` (new-york v4) | `shape="pill"` / `class="rounded-md"` | S2 S5 S6 S7 S8 S13 S15 (7) |
| gap / icon | `gap-1`, `[&>svg]:size-3!` (important) | no gap; icon free | `gap-0`, `[&>svg]:size-3.5!` | S8 (1) |
| element | `span` | `div` (v3) | n/a | S5 (1) |

### Card (`src/ui/card/*`)

| Part | bejamas | shadcn | Override | Ports |
|---|---|---|---|---|
| Card edge | `ring-1 ring-foreground/10`; border invisible (§2 #1) | `border` (v3/new-york) / `ring-1` only (base-nova, vega, luma) | `ring-0 border border-solid` (border cards) / `ring-1 ring-border border-0` (ring styles) | S3 S4 S5 S6 S7 S8 S10 S13 S14 S15 (10) |
| shadow | `shadow-lg` | `shadow-sm` (v3) / `shadow-xs` (v4) / none (nova) | `shadow-xs` / `shadow-sm` / `shadow-none` | S3 S4 S5 S6 S8 S10 S13 S15 (8) |
| font size | `text-sm` | inherits 16px | `text-base` | S3 S4 S5 S6 S7 S8 S10 (7) |
| spacing | `py-6 gap-6` (parts own `px-6`) | v3: parts own `p-6`/`p-6 pt-0`; nova: `py-4 gap-4`, `px-4` | `gap-0 py-0` + `p-6` / `p-6 pt-0` on parts; or `py-4 gap-4` | S3 S4 S5 S7 S8 S13 (6) |
| CardTitle | `font-heading text-lg md:text-xl font-medium leading-normal text-balance`, `div` | `text-2xl font-semibold leading-none tracking-tight` (v3, `h3`) / `leading-none font-semibold` | `font-sans text-2xl md:text-2xl font-semibold leading-none tracking-tight text-wrap`. **Must repeat `md:`**, because tailwind-merge keeps `md:text-xl`. | S4 S5 S6 S8 S14 (5) |
| radius | `rounded-xl` | `rounded-lg` (v3) / `rounded-xl` (v4) | `rounded-lg` | S3 S4 S5 S8 (4) |
| CardHeader | `@container/card-header grid grid-rows-[auto_auto] items-start gap-1` (juno override `gap-1.5`), `px-6` only | `flex flex-col space-y-1.5 p-6` | `flex flex-col items-stretch gap-0 space-y-1.5 p-6`. Single child: `grid-rows-none` (6px phantom row). Inside `items-center` parent: `w-full` (container inline-size collapses). | S4 S5 S8 (3) |
| overflow | `overflow-clip` (final, after `overflow-hidden`) | visible | `overflow-visible` for hanging badges (`-top-4` pills) | S5 S10 (2) |
| CardContent/Footer | `px-6` only; footer `justify-between` | `p-6 pt-0`; footer `flex items-center p-6 pt-0` | `p-6 pt-0`, `justify-center` | S4 S8 (2) |
| semantics | no `as` prop on Title/Description (`div`) | `h3`, `p` | wrap an `h3` inside | S5 S7 (2) |

**Card reset ports converged on (new-york / v3 default):** `gap-0 py-0 rounded-lg border border-solid ring-0 shadow-xs text-base` (+ `overflow-visible` when needed). **Ring styles (vega/nova/luma):** `border-0 shadow-none ring-1 ring-border py-4 gap-4`.

### Accordion (`src/ui/accordion/*`, juno `style-juno.css:3-17`)

| Property | bejamas | shadcn | Override | Ports |
|---|---|---|---|---|
| chevron | swaps two icons (`chevron-down`/`chevron-up`, `group-aria-expanded:hidden/inline`) | one chevron rotating 180° (`[&[data-state=open]>svg]:rotate-180`) | `<ChevronDown slot="icon" class="… group-aria-expanded/accordion-trigger:rotate-180">` (Plus: `rotate-45`/`rotate-[135deg]`; ChevronRight: `rotate-90`) | S2 S4 S5 S6 S7 S9 S10 S13 (8) |
| trigger border | `border border-transparent` (+2px per row) | none | `border-0` | S2 S4 S5 S9 S10 S13 (6) |
| trigger text | `text-sm` | `text-sm` (v4) / 16px (v3) | `text-base` | S2 S4 S5 S9 (4) |
| alignment | `items-start` | `items-center` (v3) / `items-start` (v4) | `items-center` | S4 S5 S9 S13 (4) |
| icon wrapper | `**:data-[slot=accordion-trigger-icon]:size-4 text-muted-foreground ml-auto` | foreground, sized by the icon | colour the `<svg>` itself; `**:data-[slot=accordion-trigger-icon]:size-auto` | S4 S7 S13 (3) |
| last item border | `border-b` on every item | v4 `last:border-b-0` / nova `not-last:border-b` | `last:border-b-0` | S10 S12 S13 (3) |
| radius/underline | `rounded-md hover:underline` | `hover:underline` (v3) / none | `rounded-none hover:no-underline` | S4 S9 S13 (3) |
| open-state variant | `aria-expanded:` on the trigger | `data-[state=open]:` | `aria-expanded:border-b`, `aria-expanded:[&_svg]:rotate-45` | S6 S7 S11 (3) |
| heading | trigger wrapped in `div.flex` | `h3` (Radix `Header`) | n/a | S5 (1) |
| padding (nova) | `py-4` / content `pb-4` | `py-2.5` / `pb-2.5` | explicit | S12 (1) |
| API | `multiple`, `collapsible` (default true), `defaultValue` | `type="single\|multiple" collapsible` | drop `type`; `value` must be a string (S13) | S2 S4 S10 S12 S13 (5) |

### DropdownMenu, NavigationMenu, Tooltip, Dialog, Drawer, Tabs, Toggle, Input, misc.

| Component.property | bejamas | shadcn / Radix | Override | Ports |
|---|---|---|---|---|
| DropdownMenuContent width | `w-[var(--anchor-width)]` (32–36px for an icon trigger, clamped by `min-w-32`) | content-sized, `min-w-[8rem]` | `w-auto min-w-[8rem]` / `w-56` | S2 S3 S14 S15 (4) |
| DropdownMenuContent surface | `ring-1 ring-foreground/10 rounded-lg` | `border rounded-md shadow-md` | `rounded-md border ring-0 shadow-md` | S2 S3 S4 S10 (4) |
| DropdownMenuContent align | `align="start"` (`DropdownMenuContent.astro:14`) | `center` | pass `align` explicitly (menu shifted ~100px otherwise) | S2 S10 (2) |
| DropdownMenuItem API | no `onClick`; `value` + root `dropdown-menu:select` (`detail.value/item/source`); content is **portalled** (query items globally in tests) | `onClick` | one listener on the root | S3 S4 S7 S9 S14 S15 (6) |
| DropdownMenuRadioItem | check icon on the right, `pr-8 pl-2` | dot `ItemIndicator` on the left, `pl-8` | `*:data-[slot=dropdown-menu-radio-item-indicator]:left-2 … [&_[data-slot=dropdown-menu-radio-item-indicator]_svg]:hidden` | S2 (1) |
| NavigationMenuTrigger | `bg-background px-4 py-2 text-base font-medium`, `h-9`, always renders a chevron | `h-10`/`h-9 text-sm` | `text-sm`, `[&>svg]:hidden` | S5 S6 S11 (3) |
| NavigationMenuLink | `flex p-2 rounded-sm text-sm hover:bg-muted` | `asChild` Link has no own styles; `navigationMenuTriggerStyle()` exported | reset (`hover:bg-transparent`), inline the trigger-style classes; `flex` on the item, or links stack | S5 S11 S14 S15 (4) |
| NavigationMenu list/viewport | list `gap-0`; viewport positioned relative to the **active trigger** | `gap-1`; viewport under the root | `alignOffset={-170} sideOffset={8}` (S6); positioner/popup have no class props | S5 S6 S11 (3) |
| TooltipContent | `bg-foreground text-background`, always renders an arrow (`TooltipContent.astro:42-50`) | v3 `bg-popover border` / v4 `bg-primary text-primary-foreground` | `[&>[data-slot=tooltip-arrow]]:hidden`, `bg-popover border` or `[&_[data-slot=tooltip-arrow]]:bg-primary` | S3 S7 S10 S13 (4) |
| DialogContent | `ring-1 rounded-xl gap-6 sm:max-w-md`; overlay `bg-black/10 backdrop-blur-xs`; title `font-medium` | `border rounded-lg gap-4 sm:max-w-lg shadow-lg`; overlay `bg-black/50`/`/80`; title `text-lg font-semibold`; footer `flex-col-reverse sm:flex-row` | `gap-4 rounded-lg border p-6 shadow-lg ring-0 sm:max-w-lg`, `overlayClass="bg-black/50 supports-backdrop-filter:backdrop-blur-none"` | S10 (1) |
| Drawer (as Sheet) | 340px, 16px inner radius, `border` all sides, `p-4 gap-4`, backdrop `bg-foreground/20`, `DrawerTitle text-xl font-medium`; no built-in close X | `w-3/4 sm:max-w-sm`, square, one-side border, `bg-black/80` overlay, built-in X | see §2 #4; add `DrawerClose` **after** the body or the links block intercepts clicks (S9) | S4 S5 S6 S7 S9 S12 (6) |
| TabsList | `variant="indicator"` (sliding pill) by default (`TabsList.astro:36`) | static active background | `variant="default"` | S15 (1) |
| TabsTrigger line variant | forces `bg-transparent rounded-none` via `group-data-[variant=line]/tabs-list:` | n/a | `bg-…! rounded-full!` | S13 (1) |
| Toggle | `hover:bg-muted aria-pressed:bg-muted` (`style-juno.css:1289`) | themes often repurpose `--muted` | `aria-pressed:bg-transparent` / `aria-pressed:bg-*` (twMerge doesn't dedupe it against `data-[state=on]:`) | S9 S10 S13 S15 (4) |
| ToggleGroupItem | `group-data-[spacing=0]/toggle-group:px-2` | `px-*` | `group-data-[spacing=0]/toggle-group:px-6` | S6 (1) |
| Input / SelectTrigger | `data-[size=default]:h-9 …:px-3`, `rounded-lg`, `shadow-xs`, `dark:bg-input/30` | `h-10 px-3 rounded-md` (v3) / `h-9` | same prefix: `data-[size=default]:h-10` / `data-[size=lg]:px-3`; `rounded-md shadow-none` | S5 S6 S12 S13 S15 (5) |
| Textarea | `field-sizing-content min-h-16` | fixed `rows` | `field-sizing-fixed` | S5 (1) |
| FieldLabel | `leading-snug` | FormLabel `leading-none` | `leading-none` (+5px per field otherwise) | S6 (1) |
| Select root | `inline-block` | block | `block w-full` | S5 (1) |
| Kbd | `bg-muted h-5 text-xs font-medium font-sans`, no border | fumadocs/cmdk `border rounded-md` | `rounded-md border bg-background px-1.5 text-sm font-normal` / `h-auto font-mono text-[10px]` | S11 S12 (2) |
| Carousel content | `gap-4 rounded-lg` + focus ring offset; content element **is** the scroll viewport; nav buttons `variant="outline" size="icon-sm"` | embla `-ml-4` track + `pl-4` items inside an `overflow-hidden` viewport | `gap-0 -ml-4 w-[calc(100%+1rem)]` + root `overflow-x-clip`, or `basis-[calc((100%-2rem)/3)]` with `gap-4`; nav `variant="ghost"` before custom glass | S5 S7 S11 S14 (4) |
| Avatar | no `after:border` ring; `AvatarImage` `relative z-10` | luma/nova `after:border after:border-border after:mix-blend-darken` | `after:z-20 after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten`; `overflow-hidden` + explicit `size-*` | S5 S7 S13 S14 (4) |
| Separator | no `data-orientation`; vertical inside `items-stretch` needs `h-auto` | `data-[orientation=vertical]:h-full` | `h-auto`, `!h-4` | S6 S13 S14 (3) |
| Marquee | 2 copies, each `min-w-full justify-around whitespace-nowrap`; mask stops 10%/90% | magic-ui: `repeat`, `--gap`, `pauseOnHover` | `[&_.marquee-content]:min-w-max justify-start gap-4 pr-4 whitespace-normal`, `hover:[&_.marquee-content]:[animation-play-state:paused]`, `variant="solid"` + the source mask | S3 S5 S7 S11 S12 S13 (6) |
| StickySurface | `sticky top-0 z-50 will-change-transform` | n/a | `z-40`, `after:bg-border` | S3 (1) |
| HamburgerMenu | own `h-12 border-b px-3` bar; panel `absolute inset-x-0 top-full h-[calc(100dvh-3rem)]`; fixed trigger icon (menu/X) | n/a | `static w-auto`, `[&_[data-slot=hamburger-menu-bar]]:…`, `--hamburger-menu-panel-height:auto` (S11) | S11 (1) |
| CommandInput | search icon at `inline-end` inside `InputGroup` (`CommandInput.astro:30`) | icon at start | author `<input data-slot="command-input" autofocus>` | S11 (1) |

**General override rule (S4 S5 S6 S9 S12 S13 S14 S15, 8 ports):** tailwind-merge dedupes only classes with the same variant prefix. Defaults written as `md:text-xl`, `has-[>svg]:px-2.5`, `data-[size=default]:h-9`, `group-data-[spacing=0]/toggle-group:px-2`, `**:data-[slot=…]:text-…`, `aria-pressed:bg-muted` must be overridden **with the same prefix**, or by styling the inner element directly.

---

## 5. Gaps: missing components, variants, props, primitives

| Gap | Needed by (sections) | Ports (count) | Workaround | Suggested API |
|---|---|---|---|---|
| **Theme / colour-mode provider + toggle** (next-themes equivalent) | header/footer theme toggles, dark default | S3 S4 S5 S6 S7 S9 S10 S11 S12 S13 S14 S15 (12) | inline `<head>` script (`localStorage.theme`, `system` default, `matchMedia` listener, sets `.dark` + `color-scheme`), plus a `Toggle` `toggle:change` / `DropdownMenu` `dropdown-menu:select` listener | `ThemeScript` (props `defaultTheme`, `storageKey`, `attribute`, `enableSystem`) + `ThemeToggle` (Toggle- or DropdownMenu-based) + a `data-theme-*` primitive |
| **shadcn-compat preset** (Button/Card/Badge/Accordion parity) | every section | all 15 needed per-instance overrides; S2 S8 proposed it (15) | per-site class constants (`src/lib/shadcn.ts`) | `bejamas init --style shadcn-new-york` / a `shadcn` juno variant, or documented reset strings |
| **Marquee props** `pauseOnHover`, `gap`, `repeat`, fade width | logo clouds, testimonials walls | S3 S5 S6 S7 S11 S12 S13 (7) | arbitrary variants (§4) | `pauseOnHover`, `gap` (CSS var used in keyframes), `repeat={n}`, `fade="5%"` |
| **HamburgerMenu composition is fixed** (own 48px bar, brand-left/trigger-right, overlay panel) | mobile navs with a left trigger, inline push-down panel, or right-side sheet | S2 S3 S6 S9 S10 S11 (6) | Collapsible (S2 S3 S10) or Drawer (S6 S9); S11 restyled internals | `trigger` slot/position, `panel="inline\|overlay"`, class props for bar/panel |
| **Drawer size/radius/backdrop props** | Sheet-style mobile navs | S4 S5 S6 S7 S9 S12 (6) | see §2 #4 | `size`, `backdropClass`/`overlayClass`, `radius` |
| **Close-on-navigate for Collapsible/Drawer**, plus scroll lock for Collapsible | mobile menus with in-page anchors | S3 S5 S6 S10 (4) | `<a data-slot="drawer-close">` (S5, works because the runtime doesn't `preventDefault`); `drawer:close` from link clicks (S6); none for Collapsible | `data-close-on-link-click` on `@data-slot/collapsible`/`drawer`; `data-lock-scroll` on collapsible |
| **DropdownMenuItem as link** | locale switchers, mobile nav menus | S4 S11 S14 S15 (4) | `<a>` inside `DropdownMenuItem class="p-0"` + keyboard listener | `href` prop → `<a role="menuitem">` |
| **Carousel `slides="multiple"` not exposed**; `variant="multiple"` means "2 per slide grid" | testimonial strips, logo strips, thumbnails | S5 S7 S11 S14 (4) | raw `data-slides="multiple"` on `CarouselRoot` (without it, visible neighbours are `inert`) | `slides` prop; rename `variant="multiple"` → `layout="grid-2"` |
| **Toggle initial state from client-only state** (theme) | theme toggles | S11 S12 S13 S15 (4) | inline script right after the element sets `data-default-pressed` before the deferred module, or `toggle:set` after init | read `data-default-pressed` lazily, or a `pressedFrom="theme"` helper |
| **Tooltip arrow/appearance props** | avatar tooltips, stats tooltips | S3 S7 S10 S13 (4) | `[&>[data-slot=tooltip-arrow]]:hidden`, restyle | `arrow={false}`, `variant="popover"` |
| **Form validation messages** (react-hook-form + zod → Field) | contact, newsletter, waitlist, booking | S5 S6 S12 S13 (4) | native `required`/`minlength`/`type=email`; `preventDefault()+reset()` to avoid GET-serialising emails into the URL (S6); `method="dialog"` (S12) | `Field` + `FieldError` wired to constraint validation (`data-slot="field-error"` showing `validationMessage`) |
| **Clipboard copy primitive** | terminal copy, CLI command copy | S1 S3 S9 (3) | ~10–15-line script, `data-copied` for 2s + CSS `group-data-[copied]` icon swap | `@data-slot/clipboard` (`data-copy-text`, `data-copied` timeout, ARIA live) |
| **NavigationMenu viewport root-anchored / inline mode; positioner/popup class props** | mega menus, fumadocs header | S5 S6 S11 (3) | `alignOffset` constant; global CSS for popup border | `anchor="root\|trigger"`, `inline` viewport, `popupClass` |
| **Pointer-tracking effects** (glow angle, spotlight, tilt, dock magnification, parallax, cursor) | bento cards, testimonials, CTA dock | S3 S12 S13 (3) | CSS `:hover` approximations; dropped | out of scope for primitives; document CSS recipes |
| **Scroll spy / active section** | header nav highlight, dock | S13 S14 S15 (3) | CSS `scroll-target-group: auto` + `a:target-current` (Chromium 140+), or `timeline-scope` + `view-timeline` | `@data-slot/scroll-spy` |
| **Carousel autoplay** | hero carousels, testimonials | S11 S14 (2) | interval dispatching `carousel:set {action:"next"}`, paused on hover/hidden/reduced-motion | `data-autoplay="3000"`, `data-autoplay-stop-on-interaction` |
| **CommandDialog can't host a trigger; input not autofocused; no hotkey** | ⌘K search | S11 S12 (2) | compose `Dialog`+`DialogTrigger`+`DialogContent`+`Command`; `autofocus` on `data-slot="command-input"`; `dialog:set {open:true}` for extra triggers | `CommandDialog` with a `trigger` slot, input `autofocus` by default, `hotkey="mod+k"` |
| **Dialog binds a single trigger** | mobile + desktop search buttons | S11 S12 (2) | `dialog:set` from other buttons | `getParts('dialog-trigger')` (VERIFIED single: `@data-slot/dialog` dist `T=c(l,'dialog-trigger')` with `c = getPart`) |
| **ToggleGroup "required" single mode** | pricing monthly/yearly, settings | S6 S7 (2) | re-assert the last value with `toggle-group:set` when `toggle-group:change` reports `[]` | `data-required` / `allowEmpty:false` |
| **In-view-once reveal** (`whileInView once`) | section entrances | S10 S12 (2) | `animation-timeline: view()` (scroll-bound, not latched) | `@data-slot/reveal` or a documented IO-free CSS recipe |
| **Animated number** (NumberFlow, NumberTicker) | stats | S10 S12 (2) | static final values in a box sized like the original | `NumberTicker` (Intl.NumberFormat) |
| **ScrollArea** | tab strips, menus | S13 S15 (2) | `overflow-x-auto no-scrollbar` | `ScrollArea` |
| **`navigationMenuTriggerStyle` export** | link-only navs | S14 S15 (2) | inline classes | export a `navigationMenuTriggerClass` string |
| **Avatar ring** | avatars in luma/nova styles | S13 S14 (2) | `after:border …` | style token |
| **Dismissible surface** (banner close) | announcement / sponsor banners | S4 S9 (2) | Collapsible (S4) or Toggle (S9) | `Alert` `dismissible` + `data-persist-key` |
| **DrawerTrigger / AccordionTrigger have no Button variants / `as`** | ghost icon triggers | S9 S12 (2) | `<Button data-slot="drawer-trigger">` | document the pass-through, or `variant`/`size` on triggers |
| **Breakpoint-only disclosure** (panel collapsible below `lg`, always visible above) | navbar | S2 (1) | Collapsible root `class="contents lg:hidden"` + static desktop copy (`hidden` attribute + preflight `[hidden]:where(:not([hidden='until-found'])){display:none!important}` in `@layer base` beats `lg:flex!`; VERIFIED `tailwindcss/preflight.css:396-398`) | `data-collapsible-until="lg"` (primitive removes `hidden` above the breakpoint) |
| **Calendar / date picker** (`date` is a formatter, which the name suggests otherwise) | booking wizard | S13 (1) | build-month RadioGroup grid | `Calendar` primitive |
| **Stepper / wizard** | booking flow | S13 (1) | Tabs + `tabs:set` + `group-has-[…data-state=active]` CSS | `Stepper` |
| **Toast** (sonner) | booking confirmation | S13 (1) (S8 S11 dropped sonner with no visual impact) | dropped | `Toast` |
| **Pressable card** (Toggle is `<button>` only) | music/folder/flip cards | S13 (1) | absolute Toggle overlay + `group-has-[[aria-pressed=true]]/name:` | `Toggle as="div"` with `role="button"` |
| **Synced carousels, `align:center`, seamless loop, cross-fade** | hero thumbnail strip, profile photos | S13 S14 (2) | bridge `carousel:change`→`carousel:set`; start-aligned; soft-wrap; slide | `data-align="center"`, `data-sync-with="#id"`, `data-effect="fade"` |
| **Breadcrumb Link/Page** | blog breadcrumb | S15 (1) | plain `<a>` / `<span aria-current="page">` | add `BreadcrumbLink`, `BreadcrumbPage` (VERIFIED missing: `packages/registry/src/ui/breadcrumb/` has 4 parts) |
| **Tabs "tab link"** (activate a tab from an external anchor) | category badges | S15 (1) | `tabs:set` on click + `location.hash` check | `data-tabs-target` on any element, hash sync |
| Radio indicator `dot\|check` + position | locale radio menu | S2 (1) | long arbitrary variants | `indicator="dot\|check"` |
| CardTitle/CardDescription `as`; AccordionTrigger heading level | semantics | S5 (1) | n/a | `as` prop / `headingLevel` |
| Button gradient/glass variants; Badge `brand` | launch-ui | S7 (1) | class layering + tailwind-merge extension | custom variants via `cva` extension docs |
| Command "hide list until typed" | search palette | S11 (1) | shows all items | `data-show-empty="false"` |
| Rating | testimonials | S14 (1) | static markup | `Rating` |
| Toggle persistence | sponsor banner | S9 (1) | none | `data-persist-key` |

---

## 6. Tailwind v3→v4 and CSS pipeline traps

| Trap | Ports (count) | Symptom | Fix |
|---|---|---|---|
| **tailwind-merge variant scoping** (see §4) | S4 S5 S6 S9 S12 S13 S14 S15 (8) | overrides silently lose to `md:`/`has-[]`/`data-[]`/`group-data-[]` defaults | override with the same prefix |
| **Lightning CSS folds `animation` + `animation-timeline` into one invalid shorthand** | S3 S10 S14 S15 (+S13 advice) (5) | `animation: name linear both; animation-timeline: scroll(root)` → minified `animation:linear both name scroll(root)`; Chrome drops it, `animation-name: none` | longhands only (`animation-name/-timing-function/-fill-mode/-timeline/-range`, no duration/delay); or `animation-timeline: var(--x)`; or put the timeline in a separate rule with a different selector |
| **v4 `space-y/x` = `margin-block-end` on `:not(:last-child)`** (v3: `margin-top` on `~` siblings) | S3 S5 S10 S12 S15 (5) | inline-script siblings add margin (§2 #7); inline first child (`<label>`) ignores margin, so rows are 8px short (S5); removing a hidden `role=alert <p>` changed spacing by 12px (S12) | prefer `gap-*`; v3 semantics: `[&>:not(:first-child)]:mt-2` |
| **HSL triplets** (`--primary: 222.2 47.4% 11.2%`) | S1 S3 S4 S5 (4) | the `@theme inline { --color-x: var(--x) }` mapping breaks | wrap in `hsl()` in `:root`/`.dark`; opacity modifiers become `color-mix(in oklab, …)`, which looks the same |
| **v3 `container` config** (`center`, `padding`, `screens:{'2xl':'1400px'}`). A `screens` key *replaces* the breakpoints (fluid to 1400). | S3 S4 S5 (+S11 `@utility container`, S8 default was fine) (5) | content 120px narrower at 1440 (S3) | `@utility site-container { width:100%; margin-inline:auto; padding-inline:1.5rem; max-width:1400px }` (redefining `container` only extends the built-in). Check which layer any `.container` override sits in: S3's `@layer base` `max-sm:px-4` was dead in the demo |
| **Two token blocks** (layered HSL + unlayered `hsl()`/oklch from `shadcn init`; or a custom palette in `@layer base` overridden by unlayered stock tokens) | S1 S10 (+S8 compat block) (3) | the "obvious" palette is dead code | read computed `getComputedStyle(documentElement).getPropertyValue('--background')` on the demo |
| **Shadow scale renamed** | S3 S4 S5 (3) | v3 `shadow-sm` = v4 `shadow-xs`; `shadow-inner` = `inset-shadow-sm`; v3 `drop-shadow-xl` is two layers | map; `[filter:drop-shadow(...)_drop-shadow(...)]` |
| **Classes that never existed in the source config are no-ops at runtime** (`rounded-2.5xl`, `border-0.75`, `-tracking-4`, `animate-gradient`, `animate-heartbeat`, `duration-300` without `transition`) | S3 S4 S13 (3) | "fixing" them changes the look | omit; check the demo's compiled CSS |
| **`overflow-hidden` ancestor captures the view timeline** (creates a scroll container) | S3 S13 (2) | progress stuck at 0/100% | `overflow-clip` |
| **leading vs responsive text** | S4 (v3 resp. font-size resets leading), S5 S8 (twMerge drops `leading-*` when a later `text-*` follows) (3) | 6px taller heading; 28px titles | add matching responsive `leading-*` (`sm:leading-9 md:leading-none`); port the *post-merge* class list |
| **Gradients** | S4 S5 (2) | v4 `bg-linear-*` interpolates in oklab (v3 sRGB); v3 `dark:from-*` drops the `via` stop | `bg-linear-to-r/srgb`; scoped CSS with v3 hex stops |
| **Unlayered source CSS beats utilities** (`[data-slot='button'][data-size='lg']:not(.px-6){@apply px-4}` in shadcn-studio; `@devnomic/marquee` ships an unlayered preflight `*{border-color:#e5e7eb}`; nextbase compat `*{border-color:var(--color-gray-200)}`) | S5 S8 S14 S15 (4) | component JSX classes never apply on the demo (buttons 16px too wide when copied verbatim) | grep source/global CSS and third-party CSS for unlayered rules; port the effect |
| **Preflight drops `cursor:pointer` on buttons** | S5 S14 (2) | default cursor | restore in `@layer base` |
| **Dynamic class strings invisible to the scanner** (`${prefix}:left-2`, `${E}-translate-x-16`); `&amp;` in raw HTML partials (`[&amp;_svg]:h-[100%]`) | S2 S7 S13 (3) | classes silently missing (globe card 512 vs 308px) | literal strings; unescape `&amp;` inside `class` |
| **`display:none` can't be animated** (an animation never starts on a `display:none` element) | S9 S12 (2) | typewriter/terminal invisible | animate `visibility` or `font-size: 0 ↔ 1em` with `step-end` |
| **Fill-mode for scroll reveals** | S10 (`forwards` not `both`, or below-fold content is blank in full-page shots/print); S3 (`backwards` for delayed path loops) (2) | blank sections / early dashes | as stated |
| **v3 palette hex vs v4 oklch** | S4 (1) (S1/S2: v4→v4 identical; `lab()` vs `oklch()` serialization is not a diff) | slight hue shift | `bg-[#dbeafe]` where exact |
| `max-w-screen-*` → `max-w-(--breakpoint-*)`; `bg-gradient-to-*` → `bg-linear-to-*` | S3 S5 (2) | missing utilities | rename |
| **tailwind-merge doesn't know custom utilities** (`glass-*`), so core `border-*`/`bg-*` defaults win | S7 (1) | glass borders overridden | extend `extendTailwindMerge` (`classGroups.glass`, `conflictingClassGroups.glass: ["border-color","bg-color","border-style"]`) in `src/lib/utils.ts` |
| **Never redefine a utility bejamas uses** (`.border-border` at 70%) | S11 (1) | changes every component | opt-in `@utility border-soft` |
| **Palette var collides with a Tailwind theme key** (`--radius-xl: 2rem`) | S7 (1) | radius scale broken | rename (`--radius-preset-xl`) |
| **shadcn-studio puts `--radius` inside `@theme inline`** | S15 (1) | bejamas `--radius-*` calcs undefined | move `--radius` to `:root` |
| Lightning CSS warns `'target-current' is not recognized as a valid pseudo-class` but keeps the rule | S14 S15 (2) | build warning only | ignore |

---

## 7. Next.js → Astro translation recipes

| Next.js feature | Recipe | Gotchas | Ports |
|---|---|---|---|
| `next/link` | plain `<a>` / `<Button as="a">`; out-of-scope routes → the matching demo URL | `<Link><Button/></Link>` (button inside anchor) → one `<Button as="a">`; add `rel="noopener"` with `target="_blank"` | all 15 |
| `next/image` | `<img width height loading="lazy" decoding="async">` (+`fetchpriority="high"` on hero) for `public/`; `astro:assets` `<Image>` for big screenshots (992kB PNG → 47kB WebP, S3; 2.5MB → ~120kB, S7) | read intrinsic sizes from the live DOM; `w-full h-auto` sources often have wrong props (S8); `<Image>` with both `width`+`height` of a different aspect **crops** (S7); remote URLs → vendor into `public/` (not in `remotePatterns` = broken on demo, S5); next/image re-encodes (q=75), causing tiny raster diffs; `fill` → `absolute inset-0 size-full object-cover` (S13) | S2 S3 S4 S5 S6 S7 S8 S11 S13 (9) |
| `next/font/google` | `fontProviders.google()` in `BEJAMAS_ASTRO_FONTS`, **`weights: ["100 900"]`** (variable range), `<Font cssVariable="--font-sans" preload />` | names are hashed (`Manrope-<hash>`); Inter needs **optical size**: `options: { experimental: { variableAxis: { opsz: ["14..32"] } } }` (S15: h2 834 vs 778px without it); Google-served Geist wraps one word differently from next/font's build (S11) | S1 S4 S5 S6 S7 S10 S11 S12 S13 S14 S15 (11) |
| `next/font/local` | `fontProviders.local()` with files in `src/assets/fonts/`, `options.variants` | **no `weight` in next/font/local = a 400 face; `font-bold` is synthesized.** Declare `weight: 400` to reproduce the heavier look (S4) | S3 S4 S13 (3) |
| fonts loaded but **not wired** into `--font-sans` | `BEJAMAS_ASTRO_FONTS = []`, remove `<Font>`, literal Tailwind default stack in `:root`/`@theme` | always check the demo's computed `font-family` first; loading the "declared" font makes the port *less* faithful | S2 S3 S8 S9 (4) |
| multiple families | one entry per family; map `--font-heading/-mono/-serif/-script` in `@theme inline`; delete the scaffold's `:root{--font-heading:var(--font-sans)}` | source variable names (`--font-inter`) can be mapped: `--font-sans: var(--font-inter)` | S4 S7 S11 S12 S13 S14 S15 (7) |
| `next-themes` | inline `<script is:inline>` in `<head>` (same storage key, usually `theme`; S6 `vite-ui-theme`), sets `.dark` + `color-scheme` before paint; `<html class="dark" style="color-scheme:dark">` when the default is dark | **check the ThemeProvider props**: `defaultTheme="dark"` (S3 S7 S9 S10: force dark); `system` (S4 S5 S6 S11 S12: "loads dark" only on a dark OS); `enableSystem={false}` (S13 S14 S15: light regardless; `--dark` emulation won't switch, so seed `localStorage.theme`); no provider (S1 S2 S8: light-only, `dark:` classes never apply, add no script). S5: hero reads raw `theme` ("system") → mirrored via `html[data-theme-choice]`. `disableTransitionOnChange` not reproduced (S15) | 15 |
| i18n (`[locale]` segment) | copy the default-locale messages JSON verbatim; build-time `t()` with `{var}` interpolation and single-tag rich splitting (`<important>`); other locales → demo URLs | `next-intl` (S2), `next-international` `getScopedI18n` (S4), `use-intl` (S9), `getDictionary` (S3); drop middleware/`setRequestLocale`/providers | S2 S3 S4 S9 (4) |
| server components / auth | render the signed-out (public) branch statically | `getUser`/`useSWR`/`getCurrentSession`/Clerk/better-auth | S1 S3 S4 S11 (4) |
| build-time data | top-level `await fetch` in frontmatter with timeout + fallback matching the demo (GitHub stars "1.3K", 786); `fs`/`gray-matter` MDX → static `src/data/*.ts`; fumadocs posts/tags; generated `components-meta.json` → trimmed JSON | Suspense skeletons dropped; counts frozen at build time | S4 S9 S11 S12 S13 (5) |
| `metadata` / `generateMetadata` | `<title>`, description, OG/Twitter, `theme-color` in `Layout.astro`; JSON-LD `<script type="application/ld+json" set:html>`; app-dir `icon.svg`/`opengraph-image.png` → explicit `<link rel="icon">` / `og:image` | `export const viewport = { maximumScale: 1 }` → viewport meta (S1); nested layout metadata overrides root title (S8) | 15 (JSON-LD: S13 S14 S15) |
| `'use client'` + `useState`/`useEffect` | static Astro + `@data-slot` primitive; `setTimeout` step counters → CSS `animation-delay: calc(var(--step)*500ms)` (S1); state machines precomputed in frontmatter → per-element keyframes (S9 S12) | `isMobile` matchMedia → `max-md:` variants (S10, removes a hydration flash) | S1 S9 S10 S12 (4) |
| `useRouter().push` on clickable cards | stretched link: `Card relative` + `<Button as="a" class="after:absolute after:inset-0">`, nested links `relative z-10` | — | S13 S15 (2) |
| `scrollToSection` (`preventDefault` + offset) | native anchors + `html scroll-smooth` + `scroll-mt-16` | pushes hash instead of replacing | S6 S14 (2) |
| route groups / layouts | flatten; reproduce wrapper markup (`flex pt-2 flex-col min-h-screen`) in `Layout.astro`/page | `(unauth)` vs `(marketing)` path drift (S2) | S1 S2 S8 S15 (4) |
| `useId()` / React children mapping | random per-instance ids in frontmatter; arrays of icon components as props (Astro slots are opaque) | duplicate SVG gradient ids (`id="a"`, `id="gradient"`) must be namespaced | S4 S9 S10 S12 (4) |

---

## 8. Animation and third-party library replacements

| Source library / effect | Replacement that worked | Limits | Ports |
|---|---|---|---|
| framer `whileInView` (BlurFade, section headers) | `animation-timeline: view(); animation-range: entry 0% entry 100%`, `animation-fill-mode: forwards`, gated by `@supports` + `prefers-reduced-motion: no-preference`; above the fold → time-based keyframes; `delay` → shift `animation-range` | scroll-bound, not latched ("once"); stagger delays dropped; Firefox shows content immediately | S10 S12 S13 (3) |
| framer `useScroll({target})` (ContainerScroll, Timeline, profile tilt) | `view-timeline-name` + `animation-range: contain 0% contain 100%`; transform order matters (framer: scale before rotate); computed matrices matched at 3 scroll positions (S3) | spring smoothing lost; never under `overflow-hidden` | S3 S13 (2) |
| scroll listener → "scrolled" header | `@keyframes` + `animation-timeline: scroll(root block); animation-range: 0 1px` (or StickySurface `effects={["line"]}`) | fallback: permanently transparent header (matches pre-hydration) | S3 S10 S14 S15 (4) |
| IntersectionObserver / scroll-spy nav | `scroll-target-group: auto` + `a:target-current` (Chromium 140+) with `@supports not`; or `timeline-scope` on body + per-section `view-timeline` + `view-timeline-inset` = IO rootMargin | keeps the last passed section active; full-page screenshots can't show it | S13 S14 S15 (3) |
| AnimatePresence mobile menu | `CollapsibleContent animation="slide"` (`--collapsible-panel-height`) + keyframe stagger via `--delay` | no exit animation (content gets `display:none`) | S10 (1) |
| magic-ui / `@devnomic` / Velora Marquee; embla AutoScroll; hand-rolled `logo-scroll` keyframes | bejamas `Marquee` + the keyframes added by hand + arbitrary variants (§4); `time` scaled to match px/s (20.4px/s S3, 77px/s S6); `%` widths don't resolve inside Marquee, so use `@container` + `w-[25cqw]` (S11) | 2 copies only; no drag | S3 S5 S6 S7 S11 S12 S13 (7) |
| embla carousel | `CarouselRoot/Content/Slide/Previous/Next` (composable parts, not the all-in-one `Carousel`), `data-loop`, `data-slides="multiple"`; `carousel:change`/`carousel:set` instead of `setApi` | native scroll-snap (no physics), start alignment only, soft-wrap loop; no autoplay (interval + `carousel:set`), no sync | S5 S7 S11 S13 S14 (5) |
| Typewriter / typing terminal (setTimeout) | frontmatter replays the algorithm → per-char keyframes (`step-end`, `font-size 0↔1em`), cursor with fill-mode `none`, one shared cycle | `display` can't animate | S9 S12 (2) |
| Terminal line reveal / step counters | `animation-delay: calc(var(--step) * 500ms)` + `fill-mode: both`; sample computed opacity on both sites to compare timing | — | S1 (1) |
| Aceternity BackgroundLines (framer `repeatDelay`) | one keyframe set per repeat delay with the motion compressed into `10/(10+rd)` of the cycle; `fill-mode: backwards`; keep non-positioned wrapper (ICB containment) | random delays differ per build | S3 (1) |
| Aceternity ColourfulText | per-letter colour cycle with offsets + blur pulse every 5s | rotation, not random shuffle | S3 (1) |
| Aceternity GlowingEffect | `@property --glow-start` orbit animation on `:hover`/`:focus-within` | no pointer angle | S3 (1) |
| Aceternity AnimatedTooltip | bejamas `Tooltip delay={0}` restyled | spring dropped | S3 (1) |
| Velora/Magic UI AnimatedList | precomputed keyframes growing `grid-template-rows: 0fr→1fr` + scale/opacity at `k × 1.8s` | no spring overshoot, no hover pause | S12 (1) |
| AnimatedBeam (ResizeObserver + motion) | stretched SVG halves (`preserveAspectRatio="none"` + `vector-effect="non-scaling-stroke"`) + SMIL `<animate>` gradient | SMIL ignores reduced motion | S12 (1) |
| BorderBeam | CSS `offset-distance` keyframes with `offset-path: rect(... round Npx)` | — | S12 (1) |
| Particles (canvas) | 50 deterministic CSS dots | — | S12 (1) |
| Dock magnification / spotlight / tilt | `:hover` + `:has(+ :hover)` neighbour sizing; centred hover glow; fixed hover tilt | no cursor distance | S12 S13 (2) |
| NumberFlow / NumberTicker | static final values in a box matching the measured height (`py-[0.27em] leading-none inline-block`) | no count-up (CSS can't format `$48,291`) | S10 S12 (2) |
| sonner / react-hot-toast | dropped | no toast | S8 S11 S13 (3) |
| three.js + rapier lanyard | static composition measured from the demo | no physics | S13 (1) |
| cmdk palette | `Dialog` + `Command` (`command:select` → `location.href` via `data-href`; built-in filter with `keywords`) | ranking differs | S11 S12 (2) |
| View-transition theme reveal (circular) | dropped | instant switch | S6 S11 (2) |
| tw-animate-css enter/exit, accordion height | kept: bejamas `animate-accordion-*` + `--accordion-panel-height`, `data-open:animate-in` | Sheet slide 250ms vs 500ms | S2 S4 S5 S6 S7 |
| `html:not(.mounted) *{animation-play-state:paused}` hydration gate | dropped (no hydration) | — | S7 (1) |

Every port added `prefers-reduced-motion` fallbacks. S12's SMIL beam is the one exception.

---

## 9. Assets, icons, theming

| Topic | Finding | Ports (count) |
|---|---|---|
| **Bejamas blue primary leak** | every token in `:root` and `.dark` must be replaced (primary, sidebar-primary, charts), including bejamas-only tokens (`--destructive-foreground` must be added; sidebar tokens removed) | 15 |
| **Brand icons missing from `@lucide/astro` 1.x** (Github, Twitter, Linkedin, Facebook, Instagram, Dribbble, Youtube). Build error `MISSING_EXPORT` (S6) | inline lucide 0.4xx–0.5xx SVG nodes (`BrandIcon.astro`, `GithubLucide.astro`) or lucide-static paths | S4 S5 S6 S8 S11 (5) |
| other icon sets | `@radix-ui/react-icons` rendered once from npm into static SVG strings (`RadixIcon.astro`, 15×15) (S2 S10); `@icons-pack/react-simple-icons` paths from the demo HTML (S9); Simple Icons paths (S6) | S2 S6 S9 S10 (4) |
| lucide renames | `CircleIcon`→`Circle`, `BarChart3`→`ChartColumn`, `LineChart`/`Building2` aliases; `*Icon` suffix exports exist in `@lucide/astro` 1.52 | S1 S5 S11 S12 S15 (5) |
| **Token translation** | v4 sources: copy `:root`/`.dark` 1:1 (+ `@theme inline` additions like `--brand-*`, `--edge`, `--light`, custom shadow scale, radius 2xl–4xl). v3 sources: wrap triplets in `hsl()` | 15 |
| **Tokens not in the repo** | fumadocs `neutral.css`/`preset.css` (S11), customizer-injected `<style>` (S7, `lab()` values, `--radius: 0.5rem` vs repo 0.625rem), unlayered stock tokens overriding the custom palette (S10). Read with `getComputedStyle(documentElement)` in both schemes | S7 S10 S11 (3) |
| **Radius** | measure `rounded-md`/`rounded-lg` px on the demo (S1: 7.6/9.6px → `--radius: 0.6rem`); shadcn v4 nova multiplicative scale (S12); 2xl–4xl mappings (S13 S14 S15) | S1 S7 S12 S13 S14 S15 (6) |
| **Token semantics** | templates repurpose `--accent` (brand: orange in S13, near-white in S6/S15 neutral) and `--muted` (dark ink in S13). bejamas uses `bg-accent`/`bg-muted` for hover/pressed (outline Button, Toggle, DropdownMenu highlight). Grep `src/ui` for `accent`/`muted` | S6 S13 S15 (3) |
| **Colour-mode defaults** | see §7; verify with `--dark` emulation *and* by seeding `localStorage.theme` | 15 |
| fonts | §7 | — |
| assets | copy `public/` (only what the home page uses); vendor remote images (Unsplash at `w=600/1600`, GitHub avatars at 96px, pravatar, avatar.vercel.sh → PNG, notion avatars, `ui.shadcn.com/placeholder.svg`); app-dir `favicon.ico`/`icon.svg`/`opengraph-image.png` → `public/` + explicit links; dead upstream URLs (404) → render the fallback like the demo (S6); OG references a non-existent `.webp` (S15) | S2 S3 S5 S6 S7 S8 S9 S10 S11 S15 |
| SVG components | React SVG `.tsx` → `.astro` by script (`strokeWidth`→`stroke-width`, `{...props}`→`{...Astro.props}`); copy path data programmatically, never retype; namespace gradient ids | S2 S4 S9 S10 S12 S13 S14 (7) |

---

## 10. Source-vs-demo drift

| Pattern | Ports | How detected | Resolution |
|---|---|---|---|
| **Stale demo**: HEAD redesigned, demo serves an older commit | S8 (HEAD `00ad2da` Turborepo; demo = `24ae459`) | `git fetch --unshallow`; `git log -S "Feature-rich, Developer-first"` found the removal in `550d368`; its parent matches | port the matching commit (`git worktree add`) |
| **Demo is a newer/pro site** than the open-source repo | S7 (13 sections + customizer vs the repo's 9) | dumped the rendered DOM after scrolling, split by sections, diffed against `app/page.tsx`; read the injected `<style>` to find visible hidden variants (`feature-variants > :nth-child(5)`) | port the demo; record per-section drift |
| **Demo is another build of the same repo** | S6 (`vite-version/`, not `nextjs-version/`) | `<title>`, favicon pair, `vite-ui-theme` storage key; `diff` of landing components (only `next/image`/`Link` differences) | treat as identical content |
| **Dead CSS / cascade differences** | S1 (two token blocks), S10 (layered custom palette loses), S3 (`@layer base` container override dead), S8 (compat border block wins), S14 (unlayered `[data-slot=button]` padding beats utilities), S5 (third-party preflight leak) | computed styles on the live demo | port the *effective* cascade |
| **Declared-but-unwired fonts** | S3 (Inter + CalSans, renders system stack), S8 (Inter/Roboto Mono via next/font/local, never mapped) | `getComputedStyle(el).fontFamily` | port the runtime stack |
| **No-op classes** (never generated) | S3 S4 S13 | demo compiled CSS | omit |
| **Upstream defects reproduced** | S4 (fixed banner covers the header), S5 (`theme==="light"` hero quirk, invisible `color="white"` icons), S8 (`-z-10` layers hidden under `bg-white`), S6 (marquee jumps: 144rem ≠ track width) | screenshots + measurement | reproduce and document; don't fix silently |
| **Demo-broken assets** | S5 (image not in `remotePatterns` → 400, shows alt "RadixLogo") | network/DOM | show the intended image, record it |
| **Source components not rendered on the demo** | S14 S15 (floating "Download" button), S4 (`cta.tsx` unused) | DOM check | omit |
| **Brief/task description vs source** | S11 (team/pricing tabs/contact are other routes), S14 ("reservation form" doesn't exist), S15 (team/about/contact are `#` placeholders), S2 (`(unauth)` → `(marketing)`) | compare the task list to `page.tsx` + live home page before starting | trust source + demo |
| **React output vs source text** | S12 (`&nbsp;` inside inline-block word spans vs `" "` → "Landingpagesthat") | live DOM inspection | follow the live build |
| **Runtime-only state** | S11 (demo follows the system scheme), S2 S1 S8 (`dark:` classes that never apply) | `--dark` screenshots, `localStorage` seeding | match the runtime |

---

## 11. Process lessons

### Verification techniques that worked

| Technique | What it caught | Ports |
|---|---|---|
| **Playwright element-box diff** (`getBoundingClientRect` for `main > section`, headings, cards, labels, buttons; joined by selector+text) | 1–24px drifts screenshots hide: accordion transparent border, CardHeader phantom row gap, `space-y` on inline labels, FieldLabel leading, collapsed centered title, 6px line-height drift | S1 S2 S3 S4 S5 S6 S7 S8 S10 S14 S15 (11) |
| **Computed styles / custom properties** (`getComputedStyle(documentElement).getPropertyValue('--background')`, `fontFamily`, `borderTopWidth`) | dead token blocks, unwired fonts, `border-style:none` on Card | S1 S3 S7 S8 S10 S11 (6) |
| **Text line widths via `Range.getClientRects()`** | missing Inter `opsz` axis | S15 (1) |
| **Canvas row pixel diff of full-page shots** (rows with RGB sum > 60) | sub-pixel / raster resampling vs real diffs | S2 S6 (2) |
| **Sampling computed opacity/transform over time** | animation timing parity (terminal, marquee px/s, typewriter) | S1 S3 S12 (3) |
| **Section height comparison at several widths** | fast and robust against autoplaying carousels in screenshots | S6 S9 S14 (3) |
| **Scripted interaction tests** (menu, accordion, carousel, theme persistence across reload, keyboard Enter, clipboard with permissions, no console errors) | `inert` neighbours, focus going to the Command root, `DrawerClose` covered by links, keyboard link items | 15 |
| **Scrolled viewport shots** (not full-page) for scroll-linked state | timeline reveal, active nav, sticky line | S13 S15 (2) |

### Pitfalls

| Pitfall | Ports |
|---|---|
| **Headless `scrollbar-gutter`**: Playwright hides scrollbars, yet `scrollbar-gutter: stable` from the scroll lock still reserves 15px. Expect 7.5–15px shifts and 375px "full-width" drawers while overlays are open. Don't chase it. | S2 S4 S5 S6 S9 S10 S14 S15 (8) |
| **Shared session scratchpad between parallel agents**: another site's screenshots overwrote or contaminated captures. Write straight into `<port>/.compare/`. | S3 (1) |
| **Shot-tool timing**: capture ~2s after `networkidle`; terminal mid-fade, marquee phase, autoplay carousels, a 2170px image still decoding | S1 S6 S14 (3) |
| **Full-page captures and scroll timelines**: view-timeline content may render revealed (S12) or hidden (`fill-mode: both`, S10); active-nav state invisible (S15) | S10 S12 S13 S15 (4) |
| **`--dark` emulation doesn't switch `enableSystem={false}` sites**; seed `localStorage.theme` | S13 S14 S15 (3) |
| **Portalled DropdownMenu content**: items aren't descendants of the root, so query `[data-slot=dropdown-menu-item]` globally | S3 (1) |
| **Required "View original" button collides with source floating UI** (footer theme toggle, Demo badge, sponsor banner, Download button, centered mobile dock): raise the source element (`bottom-16`) rather than move the comparison button. Recommended style: `fixed right-4 bottom-4 z-[9999] rounded-md shadow-lg ring-2 ring-background` | S2 S3 S4 S9 S13 (5) |
| `astro check` not runnable without installing `@astrojs/check` | S2 S4 S6 (3) |

### Effort hotspots (tally of the top-3 lists)

| Hotspot | Ports (count) |
|---|---|
| Undoing bejamas defaults for shadcn parity (Button/Card/Badge/Accordion/Dropdown/Input) | S1 S2 S4 S5 S6 S8 S9 S10 S12 S14 S15 (11) |
| Motion / framer / third-party effects rebuilt in CSS | S1 S3 S9 S10 S12 S13 (6) |
| Mobile nav (Sheet→Drawer, breakpoint disclosure, HamburgerMenu mismatch, NavigationMenu viewport) | S2 S6 S9 S11 (4) |
| Tailwind v3→v4 behaviour and pipeline (container, leading, space-y, Lightning CSS) | S3 S4 S5 S10 (4) |
| Finding the real tokens/fonts/revision (dead blocks, fumadocs, stale demo, pro site) | S1 S7 S8 S11 (4) |
| Registry/CLI bugs (Select, Marquee, missing brand icons) | S5 S6 (2) |
| Carousels (synced, autoplay, multi-visible) | S11 S14 (2) |
| Stateful widgets without primitives (wizard, calendar, card toggles) | S13 (1) |
| Hidden global CSS in source; font fidelity (opsz, weights) | S14 S15 (2) |

---

## 12. Prioritized recommendations for bejamas/ui (impact × frequency)

| Rank | Fix | Impact | Frequency | Where |
|---|---|---|---|---|
| 1 | **Fix Card's edge model**: remove the `border-none` vs `border border-border` contradiction and the `shadow-sm`/`shadow-lg` duplicate. Add a registry test that rejects merged class lists containing both `border-none` and `border-*` width. | every bordered card is silently borderless; custom border colours invisible | 10/15 | `packages/registry/src/styles/style-juno.css:240-242,1430-1432` |
| 2 | **Ship the registry Button in `templates/astro`** (or have `init` run `add button --overwrite`), and make `add` warn when an existing file *differs* rather than claiming it "might be identical". Also fix `link` → `text-primary`. | all 15 ports run a January Button without `data-slot`, with transparent outline and accent hover | 15/15 | `templates/astro/src/ui/button/Button.astro`; `style-juno.css:1414-1416` |
| 3 | **Install Marquee keyframes** (`marquee-x`/`marquee-y`) via `bejamas/tailwind.css` or the registry item's `css` | component does nothing out of the box | 7/15 | `packages/bejamas/src/tailwind.css`; `apps/web/public/r/styles/*/marquee.json` |
| 4 | **Theme kit**: an official head script (`defaultTheme`, `storageKey`, `enableSystem`) in the Astro template, plus a `ThemeToggle` recipe/component (Toggle and DropdownMenu flavours) and a client-derived initial pressed state | every next-themes site re-implements it | 12/15 | template `Layout.astro`; new component |
| 5 | **Init defaults**: `-b neutral` should not pick `bejamas-blue`. Emit `weights: ["100 900"]` for variable fonts (and Inter `opsz`). Stop self-referential `--font-sans: var(--font-sans)` (emit a fallback stack). Drop `shadcn` from `index.json` devDependencies. Fix `<html  lang>`, viewport `initial-scale=1`; add `@astrojs/check`. | faux-bold text, blue leaks, broken fonts when `<Font>` is removed | 15/15 | `packages/create-config/src/preset.ts:286`; `packages/bejamas/src/utils/astro-fonts.ts:106`, `apply-design-system.ts:500-530,904-910`; `apps/web/public/r/styles/bejamas-juno/index.json:9-12` |
| 6 | **Scroll lock**: only reserve a gutter when a scrollbar exists (`innerWidth - clientWidth > 0`) | layout shift on open in headless and on non-scrolling pages | 8/15 | `@data-slot/core` `lockScroll` |
| 7 | **Drawer as Sheet**: layer the global styles (`@layer components` / `:where()`), add `backdropClass`/`overlayClass` and `size`/`width`, an optional built-in close button, and `data-close-on-link-click` (also for Collapsible) | every shadcn Sheet port needs `!important` or global CSS | 6/15 (+4 close-on-nav) | `packages/registry/src/ui/drawer/DrawerContent.astro:12-41,42-90`; `@data-slot/drawer`, `@data-slot/collapsible` |
| 8 | **Fix the Select registry item**: a `registry:lib` item for `lib/select.ts` with `@data-slot/select`, plus a registry test that every `@/lib/*` import resolves | `bejamas add select` produces an app that doesn't build | 1/15 (but blocks the build) | `apps/web/public/r/styles/bejamas-juno/select.json:52-59`; `packages/registry/scripts/build-web-style-registry.ts` |
| 9 | **Publish a "shadcn parity" preset or reset table** in the docs (Button radius/padding/press, Badge `shape`/`size` defaults, Card spacing/text-sm, CardTitle `md:` size, AccordionTrigger border/icon rotation, DropdownMenu `align`/width, Input `data-size`, TabsList variant). Also make Badge `shape.default` stop overriding the style radius. | the #1 effort hotspot | 11/15 hotspot; 15/15 overrides | docs + `Badge.astro:94-100`, `AccordionTrigger.astro:15-17` (rotate one icon), `DropdownMenuContent.astro:14` |
| 10 | **Small correctness fixes, batched**: ToggleGroup `join(" ")` (`ToggleGroup.astro:206`) and no runtime `classList.add` (`toggle-group-controller.ts:69-89`); CarouselSlide track scoping (`CarouselSlide.astro:17`) and expose `slides` (rename `variant="multiple"`); Avatar parts render `<span>`; RadioGroupItem `id` undefined; Separator `data-slot`/`data-orientation`; StickySurface `after:bg-border`; Badge Props extend HTML attributes; DropdownMenuItem `href`; Dialog multiple triggers; CommandDialog trigger slot + input autofocus; Marquee `pauseOnHover`/`gap`/`repeat`. Document "use `gap-*`, not `space-*`, around interactive components (in-place `<script>`)". | each is small; together they remove most per-port scripts and hacks | 1–7 each | files cited in §2 and §5 |

### Verification tally (this report)

- **Component bugs (§2, 21 rows):** 20 VERIFIED in source or build output. Row 2 (scroll lock) was verified in code, but its real-browser impact is UNVERIFIED.
- **CLI/template/registry (§3, 17 rows):** 15 VERIFIED, 2 UNVERIFIED (row 13's emitting line, row 17).
- **NOT REPRODUCED (2 claims):** "Card shows ring AND border / double edge" (S13, S15); "Badge is `rounded-full` by default" (S6).
- **Fixed on main but not in what ports get:** outline-Button `bg-background` + muted hover, `sm` height `h-8`, `data-slot="button"`, and the luma/vega transparent border. These exist in the registry Button, but the template's stale Button is what all 15 ports use. No other verified bug is fixed on main (main = npm 0.5.0 + `87413bf`, a semantic-icons `package.json` change; component files match the remote registry).

