# Recipes: Next.js → Astro, theming, motion, Tailwind v3 → v4

## Next.js features

| Next.js | Astro | Watch for |
|---|---|---|
| `next/link` | `<a>` or `<Button as="a">`. Point out-of-scope routes at the matching URL on the original | `<Link><Button/></Link>` puts a button inside an anchor; make it one `<Button as="a">`. Pair `target="_blank"` with `rel="noopener"` |
| `next/image` | `<img width height loading="lazy" decoding="async">` for small `public/` assets (`fetchpriority="high"` on the hero); `astro:assets` `<Image>` for large screenshots | Read intrinsic sizes from the live DOM; source `width`/`height` props are often wrong. `<Image>` with both `width` and `height` **crops** when the aspect ratio differs (next/image doesn't). `fill` becomes `absolute inset-0 size-full object-cover`. Vendor remote images into `public/`. next/image re-encodes at q=75, so tiny raster diffs are expected |
| `next/font/google` | `fontProviders.google()` entry in `BEJAMAS_ASTRO_FONTS` + `<Font cssVariable=… preload />` | Always set `weights` (Astro defaults to 400 only). Inter needs its optical-size axis, or headings render about 6% wider (config below). Rendered family names are hashed |
| `next/font/local` | `fontProviders.local()` with files in `src/assets/fonts/` and `options.variants` | No `weight` in next/font/local means a 400 face with synthesized bold. Declare `weight: 400` to reproduce that heavier look |
| Fonts loaded but never mapped to `--font-sans` | `BEJAMAS_ASTRO_FONTS = []`, no `<Font>`, literal system stack in `:root`/`@theme` | Check the demo's computed `font-family` first. Loading the declared font makes the port less faithful |
| `next-themes` | head script (below) | Read the `ThemeProvider` props; see the color-mode table |
| i18n (`[locale]`, next-intl, next-international, `getDictionary`) | copy the default-locale messages JSON; a build-time `t()` with `{var}` interpolation and rich-tag splitting; other locales link to the original | Drop middleware, providers and `setRequestLocale` |
| Server components, auth state | render the signed-out branch statically | `getUser`, `useSWR`, Clerk, better-auth |
| Build-time data (GitHub stars, MDX posts) | top-level `await fetch` in frontmatter with a timeout and a fallback matching the demo's value; MDX/`gray-matter` → static `src/data/*.ts` | Values freeze at build time |
| `metadata` / `generateMetadata` | `<title>`, description, OG/Twitter, `theme-color`, JSON-LD (`<script type="application/ld+json" set:html>`) in the layout; app-dir `icon.svg`/`opengraph-image.png` → `public/` + explicit links | A nested layout's metadata overrides the root title |
| `'use client'` + `useState`/`useEffect` timers | static markup + CSS `animation-delay: calc(var(--step) * 500ms)`; state machines precomputed in frontmatter into per-element keyframes | `isMobile` via matchMedia becomes `max-md:` variants |
| `router.push` on clickable cards | stretched link: `Card relative` + `<a class="after:absolute after:inset-0">`; nested links get `relative z-10` | |
| `scrollToSection` handlers | native anchors + `html { scroll-behavior: smooth }` + `scroll-mt-*` | |
| React SVG components | convert by script (`strokeWidth` → `stroke-width`, `{...props}` → `{...Astro.props}`); copy path data programmatically | Namespace gradient and `useId` ids per instance |
| Icon libraries | `@lucide/astro`; Radix icons and Simple Icons rendered to static SVG strings | `@lucide/astro` 1.x has no brand icons (GitHub, Twitter, LinkedIn…) and fails the build with `MISSING_EXPORT`. Some lucide names changed (`BarChart3` → `ChartColumn`) |

### Font config

```js
// astro.config.mjs
const BEJAMAS_ASTRO_FONTS = [
  {
    provider: fontProviders.google(),
    name: "Inter",
    cssVariable: "--font-sans",
    weights: ["100 900"],
    options: { experimental: { variableAxis: { opsz: ["14..32"] } } }, // matches next/font's Inter
    subsets: ["latin"],
    fallbacks: ["sans-serif"],
  },
];
```

Add one entry per family, then map `--font-heading`, `--font-mono` and others in `@theme inline`. You can alias the source's own variable names, e.g. `--font-sans: var(--font-inter)`.

## Color mode

| Source | Port |
|---|---|
| `defaultTheme="dark"` | `<html class="dark" style="color-scheme:dark">` + head script with default `dark` |
| `defaultTheme="system"` | head script with default `system` + a `matchMedia` listener. The demo "loads dark" only on a dark OS |
| `enableSystem={false}` | light (or the default) regardless of the OS. Verify by seeding `localStorage.theme`, since `--dark` emulation won't switch it |
| no ThemeProvider | light only, and no script. `dark:` classes in the source never apply |

The head script below covers the system default; set the `system` fallback to `dark` or `light` to match the source's `defaultTheme`. Keep the source's storage key (usually `theme`; Vite templates use e.g. `vite-ui-theme`):

```html
<script is:inline>
  (() => {
    const d = document.documentElement;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    let choice = "system";
    try { choice = localStorage.getItem("theme") || "system"; } catch {}
    const apply = () => {
      const dark = choice === "dark" || (choice === "system" && mq.matches);
      d.classList.toggle("dark", dark);
      d.style.colorScheme = dark ? "dark" : "light";
      d.dataset.themeChoice = choice;
    };
    apply();
    mq.addEventListener("change", () => choice === "system" && apply());
    window.__setTheme = (next) => { choice = next; try { localStorage.setItem("theme", next); } catch {} apply(); };
  })();
</script>
```

Drive it from a primitive event. A DropdownMenu with `value="light|dark|system"` items uses `dropdown-menu:select` → `__setTheme(detail.value)`. A Toggle uses `toggle:change` → `__setTheme(pressed ? "dark" : "light")`.

A Toggle's initial pressed state depends on client-only state, so set it before the component script runs: add an inline script right after the element that sets `data-default-pressed`, or dispatch `toggle:set` after init.

The template's `@custom-variant dark (&:is(.dark *))` doesn't match `<html class="dark">` itself. Use `&:where(.dark, .dark *)` when `dark:` must apply to `html` or `body`.

## Motion

Gate every effect behind `@media (prefers-reduced-motion: no-preference)`, and add `@supports (animation-timeline: view())` where needed.

| Source effect | CSS recipe | Limits |
|---|---|---|
| `whileInView` / BlurFade entrance | `animation-timeline: view(); animation-range: entry 0% entry 100%; animation-fill-mode: forwards`. Above the fold, use time-based keyframes. Map `delay` to a shifted `animation-range` | Tied to scroll position, so it doesn't latch "once". Firefox shows the content immediately |
| `useScroll({ target })` (container scroll, timelines, tilt) | `view-timeline-name` on the target + `animation-range: contain 0% contain 100%`; keep framer's transform order (scale before rotate) | No spring smoothing. Never put it under `overflow-hidden`, which captures the timeline; use `overflow-clip` |
| "scrolled" header (shadow, border, blur) | keyframes + `animation-timeline: scroll(root block); animation-range: 0 1px`, or StickySurface effects | |
| scroll-spy nav | `scroll-target-group: auto` + `a:target-current` (Chromium 140+) with an `@supports not` fallback; or `timeline-scope` + per-section `view-timeline` | Keeps the last passed section active |
| marquee (magic ui, embla AutoScroll) | bejamas `Marquee` + keyframes (see known-issues) + the overrides in parity; scale `--duration` to match the source's px/s | Two copies, no drag |
| typewriter / typing terminal | replay the algorithm in frontmatter → per-character keyframes using `step-end` and `font-size: 0 ↔ 1em` (`display` can't animate); one shared cycle | |
| step reveal (setTimeout counter) | `animation-delay: calc(var(--step) * 500ms); animation-fill-mode: both` | |
| animated list / feed | precomputed keyframes growing `grid-template-rows: 0fr → 1fr` with staggered delays | No spring overshoot |
| border beam | `offset-path: rect(0 100% 100% 0 round Npx)` + `offset-distance` keyframes | |
| glow following the pointer, spotlight, tilt, dock magnification | `:hover` approximations (`@property` angle orbit, centered glow, `:has(+ :hover)` neighbour sizing) | No cursor distance |
| AnimatePresence menu | `CollapsibleContent` slide animation + staggered `--delay` | No exit animation |
| NumberFlow / NumberTicker | static final value in a box sized to the measured height | No count-up |
| sonner toast, physics (three.js / rapier), custom cursor | drop it, or use a static composition | Record it |

**Pipeline traps:**

- **Lightning CSS (Astro's minifier)** folds `animation: …` together with `animation-timeline: …` into one shorthand that browsers reject. Write longhands (`animation-name`, `-timing-function`, `-fill-mode`, `-timeline`, `-range`), or set `animation-timeline` through a `var()`.
- **Reveals:** use `animation-fill-mode: forwards`. With `both`, below-the-fold content is blank in full-page screenshots and print.

## Tailwind v3 → v4

| Trap | Fix |
|---|---|
| HSL triplets (`--primary: 222.2 47.4% 11.2%`) | wrap them in `hsl()` in `:root`/`.dark`; the `@theme inline` mapping expects full colors |
| `container` config (`center`, `padding`, `screens: { '2xl': '1400px' }`): a `screens` key *replaces* the breakpoints | `@utility site-container { width: 100%; margin-inline: auto; padding-inline: 2rem; max-width: 1400px }`. Redefining `container` only extends the built-in |
| `space-x/y-*` is now `margin-block-end` on `:not(:last-child)` | Prefer `gap-*`. An inline `<label>` first child ignores the margin. Astro's component `<script>` siblings receive it |
| shadow scale renamed | v3 `shadow-sm` = v4 `shadow-xs`; `shadow-inner` = `inset-shadow-sm` |
| responsive `text-*` used to reset line height | add the matching responsive `leading-*`; tailwind-merge drops a `leading-*` followed by `text-*`, so port the post-merge list |
| gradients interpolate in oklab | `bg-linear-to-r/srgb` for v3 parity; v3 `dark:from-*` dropped the `via` stop |
| `max-w-screen-*`, `bg-gradient-to-*` | `max-w-(--breakpoint-*)`, `bg-linear-to-*` |
| preflight no longer sets `cursor: pointer` on buttons | restore it in `@layer base` |
| classes the source config never generated (`rounded-2.5xl`, `animate-heartbeat`) | omit them; they're no-ops on the demo |
| dynamic class strings (`${side}-2`) and `&amp;` inside raw HTML class attributes | write literal strings and unescape the entity |
| unlayered source or third-party CSS (`[data-slot=button][data-size=lg] { … }`, a vendored preflight `* { border-color }`) beats utilities | grep global and vendor CSS for unlayered rules and port their effect |
| `--radius` inside `@theme inline` (shadcn-studio) | move it to `:root` so the `--radius-*` calcs resolve |
| scaffold radius scale is additive and stops at `xl` | copy the source's radius block (v4 nova is multiplicative, ×1.4, and defines `2xl`–`4xl`) |
| redefining a utility bejamas uses (e.g. `.border-border` at 70% opacity) | create an opt-in utility instead (`@utility border-soft`) |
| theme variable named like a Tailwind key (`--radius-xl` as a palette value) | rename it |

## Detecting drift

| Pattern | How to detect it | Resolution |
|---|---|---|
| Stale demo (repo redesigned since) | demo copy missing from HEAD: `git fetch --unshallow && git log -S "<text>"` | port the matching commit (`git worktree add`) |
| Demo is a newer or pro site | dump the rendered DOM after scrolling, split it by section, diff against `page.tsx` | port the demo and record the drift per section |
| Demo is another build (Vite vs Next) | `<title>`, favicon, storage keys | treat the content as identical |
| Dead CSS (two token blocks, layered palette losing, `@layer base` overrides) | computed styles on the demo | port the effective cascade |
| Upstream visual defects | screenshots + measurement | reproduce and document them; record intentional fixes separately |
