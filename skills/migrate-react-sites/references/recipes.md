# Recipes: Next.js → Astro, theming, motion, Tailwind v3 → v4, drift, in-repo migration

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
| marquee (magic ui, embla AutoScroll) | bejamas `Marquee` + the overrides in parity; scale `--duration` to match the source's px/s | Two copies, no drag |
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

## In-repo migration

Used by the in-repo workflow, where the Astro app lives next to the legacy Next app. Paths below assume the legacy app at `../web`; adjust them.

### Shared code alias

Import the legacy app's modules instead of copying them, and share its `public/`:

```js
// astro.config.mjs
import { fileURLToPath } from "node:url";
const legacySrc = fileURLToPath(new URL("../web/src/", import.meta.url));

// Legacy modules import each other through their own `@/`. Resolve it against the legacy source
// when the importing file lives there; the Astro app's own `@/` stays untouched.
function legacyAtAlias() {
  return {
    name: "legacy-at-alias",
    enforce: "pre",
    resolveId(source, importer, options) {
      if (!source.startsWith("@/") || !importer?.startsWith(legacySrc)) return null;
      return this.resolve(legacySrc + source.slice(2), importer, { ...options, skipSelf: true });
    },
  };
}

export default defineConfig({
  publicDir: "../web/public",
  vite: {
    plugins: [legacyAtAlias()],
    resolve: { alias: [{ find: /^@legacy\//, replacement: legacySrc }] },
  },
});
```

In `tsconfig.json`, give `@/` a fallback list so type checking resolves the legacy files' imports too: `"paths": { "@/*": ["./src/*", "../web/src/*"], "@legacy/*": ["../web/src/*"] }`.

| Trap | Fix |
|---|---|
| Tailwind only scans the Astro app, so class strings in shared data never generate | `@source "<relative path to the legacy folder>";` in the global CSS |
| A package a shared module imports is missing from the Astro app; workspace hoisting hides it until the legacy app is removed | add it to the Astro app's `dependencies` |
| MDX or Markdown content | a content collection whose `glob()` loader `base` points at the legacy content folder |

### Next stand-ins

Legacy modules that import `next/*` run in Astro when Vite aliases point those imports at small stand-in modules (`vite.resolve.alias: [{ find: /^next\/link$/, replacement: "<path to stand-in>" }, …]`). They are temporary: they go with the islands, or with the legacy removal.

| Import | Stand-in | Needed by |
|---|---|---|
| `next/headers` | `draftMode()` disabled, empty `headers()` and `cookies()` | the legacy data layer at build time |
| `next/cache` | `unstable_cache(fn)` returns `fn`; `revalidateTag`/`revalidatePath` do nothing | the data layer |
| CMS live helpers (e.g. `next-sanity/live`'s `defineLive`) | a plain published fetch through the same client | the data layer |
| `next/server` | `NextRequest`/`NextResponse` over the Fetch API (`nextUrl`, `cookies`, `redirect`, `rewrite`, `next`), `after()` → `waitUntil` | running the legacy middleware unchanged from Astro middleware |
| `next/link` | a plain `<a>` that accepts href objects | islands |
| `next/image` | the same `<img>` attributes next/image renders, with the CMS's own srcset instead of `/_next/image` | islands |
| `next/navigation` | `useRouter`/`usePathname`/`useSearchParams` over `location` and the History API | islands |
| `next/dynamic` | `React.lazy` | islands |

### Legacy islands

Phase 3a renders the legacy page or section renderer inside Astro:

- Import it through `@legacy`, and render it from an `.astro` component as a React island (`@astrojs/react`). Without a `client:*` directive it renders to static HTML and ships no JavaScript.
- Wrap it in one React component that recreates every provider from the ledger: the UI library's provider (with its server-side style collection, e.g. PrimeReact's `PrimeReactStyleSheet` emitted as `<style precedence>`), URL-state adapters (nuqs: `nuqs/adapters/react`), data clients and theme. A missing provider shows up as a build error on the first page that needs it, possibly one you can't check offline.
- Report each use at build time from the `.astro` component, where the route is known: `console.warn("[legacy-island]", Astro.url.pathname, section._type)`. Phase 5 reads this report from the full-content build log.

### Offline content

When the developer can't provide credentials, replay what the legacy app has already fetched:

- A `next dev` run leaves real responses in `.next/dev/cache/fetch-cache` (or `.next/cache/fetch-cache`). Extract them into fixtures (published content only, no tokens).
- Serve them from a small local server that speaks the CMS's query API, and point the legacy client at it behind an env var (e.g. `SANITY_API_HOST` → `apiHost`, `useProjectHostname: false`). Unknown queries return empty results; asset URLs can be rewritten to flat placeholders of the same intrinsic size.
- Only the pages in the cache render. Mark every other route *unverifiable offline*.

### Partial migrations

When routes stay on the legacy app after cutover:

- **Domain:** one app owns it and rewrites the other app's paths to its origin. With the Astro app in front, rewrite the legacy routes, `/api/*` and `/_next/*` to `LEGACY_ORIGIN`; the reverse works too.
- **Two deploy jobs**, one per app, and `LEGACY_ORIGIN` set on the host.
- **Migrated pages that call legacy APIs from the browser** (job counts, search suggestions) keep working through the rewrites. Locally, `astro preview` has no rewrites, so those parts differ by design: record them.

### Next platform features

| Next.js | Astro | Watch for |
|---|---|---|
| `redirects()` in `next.config` | the host's redirect config (`vercel.json`, `_redirects`), or Astro `redirects` with an adapter | Without an adapter, Astro's static `redirects` emit meta-refresh pages that answer 200, not 301/308; with the Vercel adapter they become 308 routes. A dynamic redirect to an on-demand route fails to build: handle it in the page or the host config. `astro preview` doesn't apply host redirects |
| `rewrites()` | host rewrites | Proxies to other origins stay in host config |
| `headers()` | host config (`vercel.json` `headers`, `_headers`), or routes appended to `.vercel/output/config.json` in an `astro:build:done` hook (the adapter's hook runs first) | |
| `middleware.ts` / `proxy.ts` | Astro middleware, reusing the legacy logic through the `next/server` stand-in | Middleware only runs on on-demand routes: a fully static build skips it, and ISR cache hits skip it too. Render the routes it must cover on demand (with ISR where the legacy page revalidates). With the Vercel adapter, `middlewareMode: "edge"` failed to bundle once the middleware imported a CMS client; `edgeMiddleware` is deprecated |
| Route handlers and server actions behind forms | Astro actions, or `src/pages/api/*.ts` endpoints with `export const prerender = false`, plus the adapter for the deploy target | Reuse the legacy zod schema through the alias. Keep the endpoint path when third parties post to it |
| `revalidate` / ISR | on-demand rendering with the Vercel adapter's `isr` (`expiration`, `exclude`, `bypassToken`); or prerender + a rebuild hook from the CMS; or `Cache-Control: s-maxage=…, stale-while-revalidate=…` | Ask the developer how fresh the content must be |
| `NEXT_PUBLIC_*` env vars | `PUBLIC_*` via `import.meta.env`, or an `astro:env` schema | Legacy modules imported through the alias still read `process.env.NEXT_PUBLIC_*` at build time. Rename public vars on the host too; server-only names stay |
| `sitemap.ts` | `@astrojs/sitemap` (needs `site`) or a `sitemap.xml.ts` endpoint | Diff the URL set against the legacy sitemap |
| `robots.ts` | `public/robots.txt` or a `robots.txt.ts` endpoint | |
| `opengraph-image.*` (`next/og`) | a prerendered endpoint with satori + `@resvg/resvg-js`, or static images in `public/` | Load the same font files the legacy image used |
| `next/script` | `<script is:inline>` with `defer`/`async` to match the strategy | |
| `@vercel/analytics`, `@vercel/speed-insights` | their Astro components (`@vercel/analytics/astro`, `@vercel/speed-insights/astro`), or the adapter's `webAnalytics` | |
| `basePath`, `trailingSlash` | `base`, `trailingSlash` in `astro.config` | Next's default strips trailing slashes with a redirect; mirror it with `trailingSlash: "never"` and the host config |
| i18n routing | Astro `i18n` with the same locales, default locale and prefix rules | Port every locale; the rebuild recipe's "link other locales to the original" doesn't apply |
| `images.remotePatterns` | `image.remotePatterns` in `astro.config` for `<Image>` | |

### e2e tests against both apps

Make the suite's base URL configurable (Playwright: `use: { baseURL: process.env.BASE_URL ?? "http://localhost:3000" }`, skip its `webServer` when `BASE_URL` is set, and `use.channel: "chrome"` when Playwright's own browser isn't installed). Record a baseline on the legacy build first and compare per test: a suite run against local or offline content fails many tests on both apps, and only the tests whose result differs matter. Selectors tied to Next or React internals (`#__next`, generated class names) need neutral replacements such as roles, text or `data-testid`.

### URL parity

```sh
# urls.txt: one path per line (legacy routes, legacy sitemap, redirect sources)
while read -r p; do
  for base in http://localhost:3000 http://localhost:4321; do
    curl -s -o /dev/null -w "%{http_code} %{redirect_url}  " "$base$p"
  done
  echo "$p"
done < urls.txt
```

Each line shows the legacy and Astro status and redirect target for one path. Redirects, headers and rewrites that live in host config only show on a preview deployment.
