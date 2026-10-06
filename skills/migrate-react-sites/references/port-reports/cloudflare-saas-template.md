# cloudflare-saas-template migration findings

## Summary
- Source: https://github.com/LubomirGeorgiev/cloudflare-workers-nextjs-saas-template @ `bffc5426a6ad5c80b3307f09a44073ccdda50013`. Next.js 16.2.7 App Router running on **vinext** (Vite) for Cloudflare Workers, React 19, Tailwind v4 (`@tailwindcss/vite`, `@tailwindcss/typography`, `tw-animate-css`). shadcn `style: "base-nova"` on **Base UI** (`@base-ui/react`), base color zinc (tokens are actually stone-tinted oklch). Other UI libs: lucide-react, `@icons-pack/react-simple-icons`, next-themes, use-intl (en/es routing), motion (not used on the landing page).
- Demo: https://nextjs-saas-template.lubomirgeorgiev.com/
- Port: /tmp/bui-ports/cloudflare-saas-template (preview port 4409). Astro 7.3.5, bejamas 0.5.0, @data-slot/* 1.1.1.
- Fidelity verdict: **faithful** (full-page heights identical to the pixel at 1440 / 768 / 390: 3586 / 4600 / 5893 px; light and dark both match). Documented approximations: terminal typing done in CSS, sponsor banner raised above the "View original" button, collapse state not persisted.
- Effort hotspots: (1) the client-side typing terminal (`deploy-terminal.tsx`) rebuilt as a CSS timeline; (2) the Base UI `Sheet` → bejamas `Drawer` (fixed 340px width, rounded corners and backdrop color set in unlayered CSS); (3) Button size/radius/svg-sizing drift between shadcn base-nova and bejamas.

## Sections ported
| Section | Source file | bejamas components used | Fidelity | Notes |
|---|---|---|---|---|
| Navigation (desktop + mobile sheet) | `src/components/navigation.tsx`, `navigation-shell.tsx` | Button (Sign In, menu trigger), Drawer (+DrawerContent/Title/Close), DropdownMenu (locale) | Faithful | Signed-out view only (Home + Docs; the demo has no blog posts so Blog is hidden). Docs and Sign In link to the demo. Active-link underline, gradient hairline and amber glow copied as-is. |
| Hero + GitHub stars pill | `landing/hero.tsx`, `github-stars-badge.tsx` | Button ×2 (`as="a"`) | Faithful | Star count fetched at build time (fallback 786). |
| Deploy terminal | `landing/deploy-terminal.tsx` | none | Faithful (CSS) | Same timeline (600 ms start, 320 ms pauses, 32 ms/char); screenshots of both caught it mid-typing at the same character. |
| Stack chips | `landing/stack.tsx` | none | Faithful | Plain `ul/li` like the source. |
| Features grid | `landing/features.tsx` | none | Faithful | Hairline grid (`gap-px bg-border`), hover top rule. |
| CTA with clone command | `landing/cta.tsx` | Button ×2 | Faithful | Copy button uses a small clipboard script (no primitive, see gaps). |
| FAQ | `landing/faq.tsx`, `constants/faq.ts`, `i18n/messages/en.json` | Accordion (single, collapsible, hidden-until-found) | Faithful | Opened-item screenshot identical to the original. |
| Footer | `components/footer.tsx` | DropdownMenu ×2 (locale, theme), Button (triggers) | Faithful | Theme switch works (system/light/dark). |
| Aski.Chat sponsor banner | `components/aski-chat-sticky-banner.tsx` | Toggle, Button | Close, moved | Raised from `bottom-4` to `bottom-16` so it stacks above "View original"; collapse/expand via one Toggle; no localStorage persistence. |

## Component mapping (shadcn/React → bejamas/Astro)
| Source | Port | Notes on API differences (props, asChild, variants, sizes, default classes) |
|---|---|---|
| `buttonVariants({ size: "lg" })` on `<a>` / Next `Link` | `<Button as="a" size="lg">` | Source base-nova `lg` = `h-11 px-8 rounded-md`; bejamas `lg` = `h-10 px-5 rounded-lg` **plus `has-[>svg]:px-4`**. Needed `h-11 rounded-md px-8 has-[>svg]:px-8` (the `has-[>svg]` override is easy to miss: without it buttons with an icon shrink). |
| `buttonVariants()` (default) | `<Button>` | Source `h-10 px-4 py-2 rounded-md`, no shadow; bejamas `h-9 px-3 rounded-lg shadow-xs`. Override `h-10 px-4 rounded-md shadow-none`. |
| `variant="outline"` | `variant="outline"` | Source `border-input bg-background hover:bg-accent`; bejamas adds `shadow-xs dark:bg-input/30 dark:border-input dark:hover:bg-input/50`. Dark mode looks lighter unless you add `bg-background dark:bg-background shadow-none dark:hover:bg-accent`. |
| `size="icon"` (h-10 w-10) | `size="icon"` (size-9) | Override `size-10 rounded-md`. |
| Button svg sizing `[&_svg]:size-4` | `[&_svg:not([class*='size-'])]:size-4` | **Runtime trap**: in the source, `[&_svg]:size-4` (specificity 0,1,1) beats an icon's own `size-5`, so the hero Star and CTA GitHub icon render at 16px even though the JSX says `size-5`. bejamas honors `size-5` (20px). Use `size-4` in the port to match what the demo actually renders. Same for the mobile `Menu` icon (`w-9 h-9` in JSX, 16px at runtime). |
| `Sheet side="right"` + `SheetTrigger render={<Button variant="ghost" size="icon" className="p-6"/>}` | `Drawer side="right"` + `<Button data-slot="drawer-trigger" variant="ghost">` | `DrawerTrigger` is a bare `<button>` with no variants and no `asChild`; passing `data-slot="drawer-trigger"` to `Button` works because Button forwards rest attributes (same trick `DropdownMenuTrigger` uses internally). The Sheet's built-in close X became an explicit `DrawerClose`, placed **after** the body (as Sheet does) or the links' block intercepts clicks on it (caught by the Playwright test). |
| `SheetContent className="w-[240px] sm:w-[300px]"` | `DrawerContent class="nav-sheet …"` + global CSS | Drawer width (340px) and `border-radius: 16px 0 0 16px` come from an unlayered `<style is:global>` attribute selector, so Tailwind utilities can't override them without `!important`. Used a page-level global rule keyed on a custom class. |
| `SheetOverlay` `bg-black/50` | `drawer-backdrop` `bg-foreground/20` | Backdrop class is hard-coded in `DrawerContent.astro`, no prop. In dark mode `foreground/20` is a light veil instead of a dark one. Overrode via `[data-slot="drawer-portal"]:has(.nav-sheet) > [data-slot="drawer-backdrop"]`. |
| `Accordion type="single" collapsible hiddenUntilFound` | `<Accordion data-hidden-until-found>` | Single + collapsible are bejamas defaults. `hiddenUntilFound` isn't an Accordion prop, but `data-hidden-until-found` passes through `...rest` and `@data-slot/accordion` honors it (closed panels get `hidden="until-found"` after init; server HTML has plain `hidden`). |
| `AccordionTrigger` (one ChevronDown rotating 180°) | `AccordionTrigger` + `slot="icon"` ChevronDown with `group-aria-expanded/accordion-trigger:rotate-180` | bejamas default swaps two icons (down/up) instead of rotating; also `items-start`, `rounded-md`, `border-transparent`, `text-sm` defaults → override `items-center rounded-none border-0 text-base font-display`. |
| `AccordionContent` → `prose` div | `AccordionContent` → same `prose` div | bejamas inner div adds `[&_a]:underline [&_p:not(:last-child)]:mb-4`; harmless under `prose`. |
| `DropdownMenu` (Base UI) with `onClick={() => setTheme(x)}` / `changeLocale(x)` | `DropdownMenu` + `DropdownMenuItem value=…` + listener on `dropdown-menu:select` | Items have no `onClick`; read `event.detail.value` / `detail.item`. Trigger: `DropdownMenuTrigger variant="outline" size="icon"` (it renders bejamas Button, so the same size/radius overrides apply). |
| React `useState` collapse + two buttons (X / ChevronLeft) | One `Toggle` (`data-state=on` = collapsed) | CSS `group-has-[[data-slot=toggle][data-state=on]]` slides the panel; the same Toggle restyles from the X badge into the chevron tab with `data-[state=on]:*` utilities. Note Toggle's own `aria-pressed:bg-muted` must be overridden with `aria-pressed:bg-*` (twMerge doesn't dedupe it against `data-[state=on]:bg-*`). |
| `GithubStarsBadge` (async server component in Suspense) | `GithubStarsBadge.astro` with top-level `await` | Fetch moved to build time with timeout + fallback; Suspense skeleton dropped. |
| `SiGithub`, `SiX` (react-simple-icons) | Inline SVG components | Paths copied from the demo HTML. |

## Gaps in bejamas/ui (missing components, variants, props, primitives)
- **No clipboard/copy primitive** (CTA "Copy" button). Shipped a ~15-line script that writes to `navigator.clipboard` and sets `data-copied` for 2 s; styling is pure CSS on `group-data-[copied]`. It owns no focus/ARIA/open state, but it is a hand-written behavior and is flagged here as a candidate for `@data-slot` (e.g. a `copy-button` with copied state + timeout).
- **Toggle has no persistence** (source stores banner collapsed state in localStorage). Not ported; the banner always starts expanded.
- **Theme switching has no primitive** (next-themes equivalent). Port uses an inline `<head>` script (`window.__applyTheme`, default `dark`, key `theme`, follows system when `system`) and a listener on the ThemeSwitch dropdown's `dropdown-menu:select`. Every site port with a theme toggle will need this; a tiny `theme` helper in bejamas would help.
- **Drawer customization**: no props for popup width, corner radius, or backdrop class (see mapping). Side sheets that must match shadcn `Sheet` need global CSS.
- **No Sheet component**: `Drawer side="right"` is the closest; it adds swipe-to-dismiss and a drag handle element (hidden for side drawers) that Sheet doesn't have.
- **HamburgerMenu didn't fit**: it renders its own full-width bar (`h-12`, brand/actions slots) and a top-down panel; the source mobile nav is a right-side sheet triggered from the existing 64px bar. Added via CLI, then removed.
- **Typing/sequenced-reveal animation**: no primitive (fine, it's animation) — done in CSS.

## Bugs / issues in bejamas 0.5.0 or its CLI
- **Drawer scroll lock leaves a gutter beside a right drawer** (minor). `@data-slot/drawer` locks scroll with `html { overflow: hidden; scrollbar-gutter: stable }`. With classic (non-overlay) scrollbars the fixed `drawer-viewport` (inset-0) shrinks to `clientWidth`, so a right-side popup ends 15px before the window edge (measured at a 390px Playwright viewport: viewport 375px wide, popup x=135..375). Base UI's Sheet in the original stays flush right. Invisible on phones with overlay scrollbars; visible on desktop browsers for right-side drawers.
- **`DrawerTrigger` / `AccordionTrigger` don't share Button variants**, so a trigger that should look like a Button needs the `data-slot` pass-through trick; not documented.
- CLI: `bunx bejamas add … -y` prints "Skipped 1 file: src/lib/utils.ts (files might be identical)" for every component — noise, not a bug.
- Scaffold `globals.css` `@theme inline { --font-sans: var(--font-sans); --font-heading: var(--font-heading); }` is self-referential; it works only because Astro's `<Font cssVariable>` defines the variable elsewhere. When a site uses no web fonts you must replace those lines with literal stacks.

## Theming, fonts, assets
- Tokens: copied `:root` / `.dark` blocks verbatim from source `src/app/globals.css` (Tailwind v4 → v4, no conversion needed), including the custom `--edge` / `--edge-foreground` amber accent, mapped to `--color-edge` in `@theme inline`. This replaced bejamas' blue `--primary` (source primary is near-black / near-white). Also copied the `bg-grid` `@utility` and `:root` text-rendering rules, and added `@plugin "@tailwindcss/typography"` for FAQ `prose`.
- Default mode: the demo loads **dark** (`ThemeProvider defaultTheme="dark"`, verified in the HTML payload) regardless of `prefers-color-scheme`. Port ships `<html class="dark" style="color-scheme: dark">` and the head script keeps it unless the user picked light/system.
- Fonts: the source deliberately loads **no web fonts** — `--font-sans` is a system stack, `--font-display` is `"Avenir Next", "Segoe UI", system-ui…`, `--font-mono` is `ui-monospace, SFMono-Regular…`. So `BEJAMAS_ASTRO_FONTS` is an empty array (Astro accepts `fonts: []`) and the `<Font>` tag was removed; stacks are literal in `@theme inline`. `font-display` (source class name) and `font-heading` (bejamas) both map to the display stack. Rendering on macOS matches exactly because both pick Avenir Next / SF.
- Assets: `public/logo.svg`, `public/logo.png` copied; `src/app/icon.svg` and `src/app/favicon.ico` (Next app-dir icon convention) copied to `public/` and linked explicitly. Logo and Aski.Chat marks are inline SVG components (Aski gradient ids made unique per instance; brand logo keeps the source's fixed id on purpose).

## Animation & third-party libraries
- No framer-motion on this page. All hover/transition effects are Tailwind classes and were copied unchanged.
- `DeployTerminal` (React `setTimeout` state machine): replaced by a frontmatter replay of the same algorithm that computes when each row appears, when each character is typed and when the typing cursor lives; CSS plays it with per-element `--at` delays. Lessons:
  - Animating `display` from `none` **does not work**: animations never start on a `display:none` element. Rows use a discrete `visibility` keyframe instead (rows only append, so reserved space is invisible), characters go from `font-size: 0` to `var(--term-fs)` so the cursor follows the typed text and wrapping (`break-all`) stays correct on mobile.
  - The cursor's visibility window is an animation with **fill-mode none** (`both` would back-fill it visible during the delay).
  - `prefers-reduced-motion` shows the final state at once, as the source does.
- Base UI Sheet slide-in → Drawer's transform transition (similar 250 ms vs 500 ms open).

## Next.js-specific translations
- `next-themes` → inline head script + dropdown event listener (see gaps).
- `use-intl` / `[locale]` routing (`/en`, `/es`): only English ported; the locale dropdown is kept and choosing "Español" navigates to the demo's `/es`. The source hides the switcher when one locale is enabled; the demo has two, so it shows.
- `@/i18n/navigation` `Link` → plain `<a>`; out-of-scope routes (`/sign-in`, `/docs`, `/terms`, `/privacy`) point to the demo.
- Async server components + `Suspense` fallbacks (stars badge, CMS-driven nav) → Astro frontmatter `await`; nav "has blog/docs" CMS flags resolved to the demo's runtime state (Docs shown, Blog hidden).
- `generateMetadata` → static `<title>SaaS Template - SaaS Template</title>` and description; JSON-LD (`FAQPage` graph) not ported.
- Next app-dir `icon.svg` / `favicon.ico` file conventions → explicit `<link rel="icon">`.
- vinext-specific streaming (`data-vinext-streamed-icon`) irrelevant to the port.

## Verification
- `bun run build`: succeeds, 1 static page, no warnings. Preview on `bun run preview --port 4409`.
- Screenshots (`.compare/`): `original*.png` vs `port*.png` at 1440 (light-scheme emulation, still dark by default), 1440 `--dark`, 768, and 390 `--dark`; light theme via `light.mjs` (`*-light-full.png`); FAQ open (`*-faq-open.png`); mobile drawer (`*-m-drawer.png`). Full-page heights are identical at every width; section-by-section the chunks are visually indistinguishable apart from the sponsor banner's new position and the extra "View original" button.
- Interaction tests (`.compare/interact.mjs`, Playwright): terminal reaches the final state (all 7 lines + prompt); no console errors (desktop and mobile); accordion single-open + collapsible; theme menu → Light sets `html.light` and persists `theme=light`; locale menu opens with English/Español; sponsor Toggle collapses (`data-state=on`, `aria-pressed=true`) and expands; copy button writes the clone command to the clipboard and shows "Copied"; mobile drawer opens and closes via the X.
- Remaining differences: banner at `bottom-16` instead of `bottom-4`; banner collapse not persisted; drawer gutter with classic scrollbars; star count frozen at build time; `hidden="until-found"` only after JS init.

## Lessons for a migration skill
- (General) **Screenshot first, read the runtime, not the JSX**: shadcn's `[&_svg]:size-4` silently overrides icon `size-5` classes; bejamas Button respects them. Match the rendered size.
- (General) bejamas Button ≠ shadcn base-nova Button: default `h-9 px-3 rounded-lg shadow-xs` vs `h-10 px-4 rounded-md`; `lg` `h-10 px-5` + `has-[>svg]:px-4` vs `h-11 px-8`; `icon` `size-9` vs `h-10 w-10`; outline gets `dark:bg-input/30`. Keep a reusable override string per size.
- (General) To make a primitive trigger look like a Button, render `<Button data-slot="<primitive>-trigger">` inside the primitive root.
- (General) Drawer as Sheet: put the close button last, override width/radius/backdrop with global CSS keyed on a class (unlayered component CSS beats utilities).
- (General) Accordion extra options (`data-hidden-until-found`, etc.) can be passed as raw `data-*` attributes even when the Astro component has no prop — check the `@data-slot` README for the attribute list.
- (General) Theme: if the demo defaults to dark, hard-code `class="dark"` on `<html>` plus a pre-paint script; a ThemeSwitch is a DropdownMenu + `dropdown-menu:select` listener.
- (General) No web fonts in the source → empty `BEJAMAS_ASTRO_FONTS`, delete `<Font>`, put literal stacks in `@theme inline` (the scaffold's `--font-sans: var(--font-sans)` relies on `<Font>`).
- (General) CSS-only sequencing of a JS timeline: precompute delays in frontmatter; never animate from `display:none`; use `visibility` or `font-size:0` and fill-mode carefully.
- (General) Fixed floating UI from the source that sits bottom-right will collide with the required "View original" button; raise it (`bottom-16`) rather than moving the comparison button.
- (Specific) This template's marketing CSS (`--edge`, `bg-grid`, `font-display`) lives in `globals.css`; landing copy lives in `src/i18n/messages/en.json` (`Landing.*`, `Client.Landing.*`), FAQ structure in `src/constants/faq.ts`.
