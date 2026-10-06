# shadcnstudio-zolt migration findings

## Summary
- Source: https://github.com/shadcnstudio/shadcn-nextjs-zolt-landing-page-free @ `b4a6e43fac0f034bc7d3445af6c0a35095bed7db`, Next.js 16.1.1 (App Router, RSC), Tailwind v4.1.18 (`@tailwindcss/postcss`, `tw-animate-css`, `shadcn/tailwind.css`), shadcn style `base-nova`, base color `neutral`, primitives from `@base-ui/react` 1.6.0. Other libs: `motion` 12 (framer-motion successor), `three` + `@react-three/fiber` + `@react-three/drei` + `@react-three/rapier` (physics lanyard ID card), `react-day-picker` 9 (Calendar), `sonner` (toast), `date-fns`, `next-themes`, `gray-matter` (MDX frontmatter via `fs`). `react-hook-form`/`zod` are dependencies but the home page does not use them.
- Demo: https://shadcn-nextjs-zolt-landing-page.vercel.app
- Port: /tmp/bui-ports/shadcnstudio-zolt (preview port 4413), Astro 7.3.5 + bejamas 0.5.0, bun only.
- Fidelity verdict: **close, with documented approximations**. All 8 home sections and the layout chrome (dock, scroll toast, edge blur, footer, Download button) are present with source copy, assets, fonts and tokens. Full-page height is within 16px of the original at 1440px (8879 vs 8863) and 22px at 390px (10619 vs 10597). The approximations are motion and physics: the WebGL lanyard is static, pointer-following effects are gone, and some motion springs are now CSS.
- Effort hotspots: (1) the 3-step booking wizard (Tabs + 3 RadioGroups, no Calendar component, gating Next); (2) motion scroll-linked effects (timeline reveal, profile-card tilt, scroll toast, active dock item), converted to CSS scroll-driven animations; (3) clickable "cards that toggle state" (music player, trip folder, flip card): the bejamas `Toggle` is a `<button>`, so it cannot wrap block content.

## Sections ported
| Section | Source file | bejamas components used | Fidelity | Notes |
|---|---|---|---|---|
| Nav dock (fixed, left on lg / bottom on mobile) + mode toggle | `layout/nav-dock.tsx`, `mode-toggle.tsx`, `hooks/use-active-section.ts` | Separator, Toggle | close | Active-section highlight uses CSS `view-timeline` + `timeline-scope` instead of IntersectionObserver. The theme toggle is a bejamas Toggle; a script mirrors `toggle:change` onto `<html class="dark">` and `localStorage.theme`. Below lg the dock is raised from `bottom-4` to `bottom-16` so it doesn't collide with "View original". |
| Scroll profile toast | `layout/scroll-profile-toast.tsx`, `profile-availability-card.tsx` | Avatar | close | motion `AnimatePresence` on `scrollY > 300` becomes `animation-timeline: scroll(root)` with `animation-range: 300px 340px`. Hidden where unsupported. |
| Edge blur | `layout/edge-blur.tsx` | – | faithful | |
| Download floating button | `layout/Download.tsx` | Button (`as="a"`) | faithful (moved) | See "Download vs View original" below. |
| Hero | `home/hero/hero.tsx`, `greeting-word.tsx`, `ui/id-card.tsx` | Badge, Button | close | Greeting rotation uses CSS keyframes (8.8s cycle, 4 words, negative delays). The 3D physics lanyard is a static image composition (rope gradient, `pin.webp`, card with `#ff5c00` stripe), positioned from measurements taken on the demo. |
| About (carousel, music card, folder card, surprise note) | `home/about/*.tsx` | Carousel (Root/Content/Slide/Previous/Next + authored `carousel-indicator`s), Card, CardContent, Toggle, Badge | close | The carousel slides instead of cross-fading. The music and folder cards use a Toggle overlay. The music clock ticks (plain text), but the per-digit roll animation was dropped. The surprise note is static (first note only). |
| Featured works (bento: hero/grid/grid, hero) | `shared/featured-works/*.tsx`, `lib/case-studies.ts`, `content/case-studies/*.mdx` | Card, Badge, Button | faithful | Data was moved to `src/data/case-studies.ts`. The arrow Button is the link (stretched `after:inset-0`) to the demo's `/case-study/<slug>`. |
| Experience (contribution graph, logo marquees, timeline) | `home/experience/*.tsx`, `ui/timeline.tsx` | Card, CardContent, Tooltip (234 instances), Marquee, Badge | close | The graph uses a seeded PRNG at build time (the source uses `Math.random()`). Timeline reveal and segment fill use `animation-timeline: view()`. |
| Services accordion | `shared/services/services.tsx` | Accordion, AccordionItem, AccordionTrigger (icon slot), AccordionContent | close | Plus/minus icons are driven by `group-aria-expanded/accordion-trigger`. The thumbnail that followed the pointer is now a CSS-hover thumbnail at a fixed spot with the ±8° tilt. |
| Testimonials | `shared/testimonials/testimonials.tsx` | Carousel (vertical, loop, drag off), CarouselPrevious/Next | close | The tile wall is static. The avatar and quote slide vertically together. motion's side-column shuffle and quote fade are replaced by native scroll. |
| Hire me / pricing | `home/hire-me/*.tsx` | Card, CardContent, Avatar, Badge, Separator, Toggle | faithful | The card flip uses a Toggle overlay and `has-[[aria-pressed=true]]:rotateY(180deg)`. The scroll tilt (−4°→0→4°) is CSS `view()`. |
| Booking wizard (Select service → Choose time → Details → Confirmed) | `home/select-service/*.tsx` | Tabs (+ hidden "done" trigger), RadioGroup ×3, Button, Input, Textarea, Label, Badge | close | Calendar is a RadioGroup month grid built at build time, with no month paging. There is no toast. Native validation. Back/Next/submit send `tabs:set`. |
| Footer | `layout/footer.tsx` | Button, Separator | faithful | |
| Custom cursor | `layout/custom-cursor.tsx` | – | dropped | Pointer-follow images. No primitive; out of scope for "no custom controllers". |

## Component mapping (shadcn/React → bejamas/Astro)
| Source | Port | Notes on API differences (props, asChild, variants, sizes, default classes) |
|---|---|---|
| `Button render={<Link/>} nativeButton={false}` | `Button as="a" href` | No `render` prop. bejamas default size is `h-9 px-3` vs base-nova `h-8 px-2.5`, and `icon` is `size-9` vs `size-8`, so pass explicit sizes. The `outline` variant hovers with `hover:bg-accent hover:text-accent-foreground hover:border-accent`, so on this site (accent = orange) every outline button would turn orange on hover. base-nova uses `hover:bg-muted`. Every outline button needed explicit `hover:bg-* hover:border-border hover:text-*`. bejamas adds `active:scale-98` (base-nova uses `translate-y-px`); I added `active:scale-100` where the source has no press effect. Add `group/button` yourself if children use `group-hover/button:` (base-nova puts it on every button). |
| `Badge variant="outline"` (base-nova `h-5 text-xs`) | `Badge variant="outline" size="sm"` | bejamas `size="default"` resolves to `h-6 text-sm`. Use `size="sm"` to match base-nova. `shape="pill"` = `rounded-full`. |
| `Card` (base-nova: `ring-1 ring-foreground/10`, `gap/py = --card-spacing (4)`, no border, no shadow) | `Card` + `border-0 shadow-none py-4 gap-4 ring-1 ring-border` | bejamas Card class list is `border-none … shadow-sm ring-1 … border border-border shadow-lg`. After twMerge it has **both** a border and a ring, plus `shadow-lg`, `gap-6`, `py-6`. `CardContent` is `px-6` vs base-nova `px-(--card-spacing)` = `px-4`. |
| `Accordion` / `AccordionItem value={index}` / `AccordionTrigger` / `AccordionPanel` | `Accordion` / `AccordionItem value={String(i)}` / `AccordionTrigger` + `slot="icon"` / `AccordionContent` | `value` must be a string. Trigger adds `border border-transparent` (+2px height), `hover:underline` and `items-start`; override with `border-0 hover:no-underline items-center`. Without an `icon` slot it renders its own chevrons. The icon-slot wrapper gets `size-4 text-muted-foreground` through `**:data-[slot=accordion-trigger-icon]:` utilities, which must be overridden the same way. `AccordionContent`'s `class` goes to the inner div; the outer element is not customisable. Item has `border-b` but no `last:border-b-0` (base-nova has it). Open-state variant: base-ui `group-data-panel-open:` → `group-aria-expanded/accordion-trigger:`. |
| `Avatar size="lg"` / `AvatarImage` / `AvatarFallback` | same names | bejamas Avatar has no `after:border after:mix-blend-darken` ring (base-nova does); added via class. |
| `Separator orientation` | `Separator orientation` | Vertical separator needs `h-auto` inside `items-stretch` flex. |
| `Tooltip` / `TooltipTrigger render={<span/>}` / `TooltipContent` | `Tooltip` / `TooltipTrigger asChild` / `TooltipContent` | `asChild` wraps the child in a `div[data-slot=tooltip-trigger]`. To keep the source's flex-shrinking 20px cells, the size had to move to the Tooltip root (`w-3.5 sm:w-5 min-w-0`) and the child became `w-full`. Hide the arrow with `[&>[data-slot=tooltip-arrow]]:hidden`. `delay` prop maps to TooltipProvider `delay=0`. |
| Hand-rolled `useState` image carousel | `CarouselRoot` + `CarouselContent` + `CarouselSlide` + `CarouselPrevious/Next` + authored `button[data-slot=carousel-indicator][data-index]` | `data-loop={true}` gives the source's modulo wrap. Prev/Next are bejamas Buttons (outline, icon-sm, rounded-full): restyled into the source's full-height 25%-wide gradient hit zones by overriding size, border, bg and `disabled:opacity-100`. |
| motion `AnimatePresence` testimonial switcher | `CarouselRoot orientation="vertical" data-loop drag={false}` | See bug about `CarouselSlide` `grid-rows-2`. Vertical carousel needs a fixed content height (`h-78` sm / `h-[600px]` mobile). |
| `onClick` card toggles (`useState`) | `Toggle` as an absolutely positioned overlay inside the Card + `group-has-[[aria-pressed=true]]/name:` styles | `Toggle` renders `<button>` with `hover:bg-muted aria-pressed:bg-muted`. This theme's `--muted` is dark gray (oklch 0.36), so these must be neutralised. A button cannot validly contain a `Card` (div), hence the overlay pattern. Hover effects that targeted an inner element (`group-hover/folder`) moved to the card group, because the overlay receives the pointer. |
| next-themes `ModeToggle` | `Toggle id="mode-toggle"` + inline head script + `toggle:change` listener | The initial pressed state is set by an inline script that adds `data-default-pressed` before the deferred Toggle module runs. |
| `ServiceStepCard` `useState(step)` | `Tabs defaultValue="1" data-activation-mode="manual"` with `TabsList variant="line"` triggers styled as the 3 header dots, plus a hidden `done` trigger | Step title, "Step N of 3", Back visibility and footer swap are pure CSS: `group-has-[[data-slot=tabs-content][data-value='2'][data-state=active]]/booking:`. TabsTrigger `line` variant forces `bg-transparent`/`rounded-none` through `group-data-[variant=line]/tabs-list:` selectors, so `bg-primary-foreground!`/`rounded-full!` were needed. |
| service `Button`s with selected state | `RadioGroup` + `label > RadioGroupItem` | The radio item is the dot itself (`size-2.5 bg-muted-foreground data-checked:bg-accent`, inner indicator hidden). Card state uses `has-[[aria-checked=true]]:`. Label clicks select (the runtime mirrors wrapping labels). |
| `Calendar` (react-day-picker) + slot `Button`s | `RadioGroup` of day labels (hidden radio stretched over each label) + `RadioGroup` of time pills | The time group is revealed with `group-has-[[data-booking-date][data-value]]` (the radio root mirrors `data-value`). |
| `Input` / `Textarea` / `Label` | same | Input `data-[size=default]:h-9 px-3` beats a plain `h-14.5` in twMerge ordering, so also pass `data-[size=default]:h-14.5`. |
| `ScrollArea h-83` | `div.h-83.overflow-y-auto` | No scroll-area component in bejamas. |
| Tailwind `animate-[marquee_25s_linear_infinite]` + `direction-reverse` | `Marquee time={25} direction="left|right" variant="solid"` + own mask | bejamas gradient mask is 10%/90%; source is 5%/95%, so I used `variant="solid"` plus the source mask class. Spacing: per-item `mr-8` (Marquee copies are `justify-around min-w-full`). |

## Gaps in bejamas/ui (missing components, variants, props, primitives)
- **Calendar / date picker**: missing. The booking "Choose Time" step uses a react-day-picker `Calendar` with disabled days, an "available" modifier dot and month paging. The port builds a static RadioGroup grid for the **build month**, with "today" fixed at build time, and shows the nav chevrons inert. The `date` component in 0.5.0 is a date *formatter*, not a picker; the name suggests otherwise.
- **Wizard / stepper**: missing. Tabs fit as the step owner, but advancing requires a block script that sends `tabs:set` from Next/Back/submit and toggles Next's `disabled`. Tab triggers stay keyboard-reachable (I used manual activation and `pointer-events-none` dots), so a keyboard user can jump steps without validation.
- **Toast (sonner)**: missing. Dropped the `toast.success` on booking; the confirmation panel remains.
- **Toggleable card / pressable surface**: Toggle only renders `<button>` with a slot, and has no `asChild`/`as`. Card-sized toggles need an overlay button + `group-has` styling.
- **Carousel cross-fade**: the carousel is native scroll-snap only, so the profile photos slide instead of fading.
- **Scroll area**: missing; native overflow used.
- **Pointer-follow / parallax / magnetic effects** (services thumbnail, profile-panel parallax, custom cursor): no primitive. Ported as static CSS hover or dropped.
- **"Advance on hover" (surprise note cycling 6 notes)**: no primitive. Static first note.
- **Physics/WebGL (lanyard ID card)**: out of scope for a UI kit. Static image composition.

## Bugs / issues in bejamas 0.5.0 or its CLI
1. **`bejamas add marquee` does not install the marquee keyframes.** `src/ui/marquee/Marquee.astro` uses `[animation:marquee-x_var(--duration,_20s)_linear_infinite]` / `marquee-y`, but after `bunx bejamas add marquee -y`, `grep -c marquee-x src/styles/globals.css` → `0`. The keyframes live only in the repo's generated `packages/ui/src/styles/globals.css`, and the registry item `apps/web/public/r/styles/bejamas-juno/marquee.json` has no `cssVars`/`css`. Expected: the CLI adds `@keyframes marquee-x/marquee-y` (as shadcn does with `css` in the registry item). Workaround: added them to `@theme inline` in `globals.css`.
2. **`CarouselSlide` applies multi-slide grid tracks to single-slide carousels.** Its classes include unscoped `group-data-[orientation=vertical]/carousel:grid-rows-2` and `group-data-[orientation=horizontal]/carousel:grid-cols-2`. Only `grid`/`gap-4` are scoped to `variant=multiple`. When a slide has its own `grid` layout (the testimonial slide: `grid sm:grid-cols-[323px_1fr]`), a vertical single carousel splits it into two 156px rows, and the avatar and quote rendered out of place. Workaround: `group-data-[orientation=vertical]/carousel:grid-rows-none` on the slide. Expected: scope those tracks to `group-data-[variant=multiple]`.
3. **`RadioGroupItem` renders `id=""`** when no `id` is passed (`const { id = "" } = Astro.props` → `<span id="">`). Harmless but invalid-ish markup; expected: omit the attribute.
4. **`Card` default classes contradict themselves**: `border-none … shadow-sm ring-1 … border border-border shadow-lg`. After merge you get border + ring (double outline) + `shadow-lg`. Neither shadcn base-nova nor most source designs expect that. Every card in this port needed `border-0 shadow-none` or an explicit shadow.
5. **`Button` `outline` hover uses the `accent` token** (`hover:bg-accent hover:border-accent hover:text-accent-foreground`). shadcn uses `accent` for subtle hover backgrounds, but many templates (this one: `--accent: oklch(0.6837 0.212 40.59)`, orange) use it as a brand color. Ports silently gain orange hovers unless every outline button overrides hover.
6. **`Toggle` base classes `hover:bg-muted aria-pressed:bg-muted`** look wrong under templates whose `--muted` is a dark ink (here `oklch(0.36 0 0)`). Same class of problem as 5: bejamas components lean on token semantics that shadcn templates re-purpose.
7. Init template still pins `bejamas ^0.4.1` (already noted in the brief). `bun add bejamas@0.5.0` was needed.

## Theming, fonts, assets
- Tokens: copied `:root` and `.dark` verbatim from `src/app/globals.css` (including the template's custom `--background-darker` and `--fade-circle-width`). Exposed `--color-background-darker` so `bg-(--background-darker)` became `bg-background-darker`, and kept the custom `--shadow-realistic` and radius scale up to `--radius-4xl`. All bejamas blues (`--primary: oklch(0.4634 0.2647 264.76)`, chart and sidebar blues) were replaced. Body background (fixed dotted radial grid) copied verbatim.
- Default mode: the source uses `ThemeProvider attribute="class" enableSystem={false}`, so it loads light regardless of OS. The port uses a class strategy with a light default, persisted under the same `localStorage.theme` key next-themes uses. Screenshots with `--dark` (`prefers-color-scheme`) do **not** switch either site. Set `localStorage.theme = "dark"` to compare (see `.compare/darkshots.mjs`).
- Fonts: `next/font/local` Satoshi (400/500/700/900 woff2) → `fontProviders.local()` with `options.variants` from `src/assets/fonts/` (cssVariable `--font-satoshi`). `Geist_Mono` → `fontProviders.google()` `--font-geist-mono`. `Delicious_Handrawn` → google `--font-delicious-handrawn`, exposed as `font-handwritten`. Mapping: `--font-sans`/`--font-heading` = Satoshi, `--font-mono` = Geist Mono. The `<Font>` tags in the layout were edited by hand, and Satoshi is `preload`ed.
- Assets: all of `public/images` and `public/favicon` copied. `public/models/lanyard/card.glb` not copied (no WebGL). Brand/custom SVG React components in `src/assets/svg/*.tsx` were converted to `.astro` with a small script (`strokeWidth` → `stroke-width`, `{...props}` → `{...Astro.props}`).
- Tailwind v4 → v4: no config migration. Source-only utilities checked against the demo's compiled CSS: `direction-reverse` comes from tw-animate-css, so `Marquee direction="right"`. `animate-heartbeat` on the Download button is **undefined** in the demo CSS (a no-op), so it was dropped instead of invented.
- Classes built by string interpolation (`${E}-translate-x-16`) are not seen by the Tailwind scanner. Write the full variant classes literally.

## Animation & third-party libraries
- **motion**:
  - `GreetingWord` uses CSS keyframes, with one shared 8.8s cycle and per-word `animation-delay = i*2.2s - 0.5s`.
  - `Timeline` (`useScroll` + `useSpring` + ResizeObserver-measured segments) uses CSS `animation-timeline: view()` on index/content (`animation-range: cover 30vh cover 55vh`) and on segment fills (scaleY). Segments are laid out with CSS offsets (`top-[60px]`/`sm:top-[65px]`, `bottom-8`), with no measurement. Spring smoothing is lost.
  - `ProfileCard` tilt uses `view()` keyframes −4°/0/4°. `ScrollProfileToast` uses `scroll(root)` with a 300–340px range.
  - Testimonials and the music-player digit roll lose their bespoke transitions. Reduced-motion fallbacks are included for the greeting and the timeline.
- **@react-three/* + rapier** lanyard: static. Rope gradient (light/dark variants), pin image, card, `drop-shadow-xl`. There is no drag/swing.
- **CSS scroll-driven gotcha**: a timeline segment wrapper with `overflow-hidden` became the `view()` scroller (overflow:hidden creates a scroll container), so fills never progressed. `overflow-clip` fixed it.
- **sonner** dropped. **Custom cursor** dropped. **date-fns** replaced with `toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })`.

## Next.js-specific translations
- `next/link` → `<a>`. Secondary routes (`/contact`, `/case-study/[slug]`) point to the demo URL. `#select-service` stays an in-page anchor.
- `next/image` (`fill`, `sizes`) → plain `<img>` with `absolute inset-0 size-full object-cover`.
- `next/font/local` + `next/font/google` → Astro fonts API (see above).
- `next-themes` → inline head script + Toggle `toggle:change` listener.
- `usePathname` + IntersectionObserver active nav → CSS `timeline-scope` + per-section `view-timeline` with `view-timeline-inset: 45% 50%` (same band as the source `rootMargin`). Difference: the source keeps the last active id when no section is in the band (e.g. "Pricing" stays lit over the booking section). The CSS version clears it.
- Server `getCaseStudies()` (`fs` + `gray-matter` over MDX) → static `src/data/case-studies.ts` (frontmatter only, same date sort).
- `Metadata` (title, description, OG/Twitter, icons) → `<head>` tags in `Layout.astro`. JSON-LD → `<script type="application/ld+json" set:html>`. `metadataBase`/env-based URLs omitted.
- `'use client'` islands: none needed. All interactive behavior comes from `@data-slot` runtimes plus 3 small block scripts: the theme mirror, the music clock and the booking wizard glue.

## Verification
- `bun run build`: 1 page, no warnings or errors. `bun run preview --port 4413`.
- Screenshots in `.compare/`: `original*.png` / `port*.png` full-page (1440 and 390, chunked), `orig-*`/`port-*` scrolled viewport shots (`viewshots.mjs`, needed because the source's scroll-linked timeline is invisible in full-page captures on both sites), dark shots (`darkshots.mjs`), and interaction shots `int-*.png`.
- Desktop: section positions match chunk-for-chunk, and total height differs by 16px (testimonial nav sits 16px lower than the source's content-dependent position). Mobile: matches section-for-section; accordion rows matched after removing the trigger's transparent border.
- Interactive checks (`.compare/interact.mjs`, Playwright, all passed, 0 console errors/warnings, no duplicate ids):
  - Profile carousel next/prev, with loop wrap 0 → 3.
  - Music and folder toggles (`aria-pressed`). Contribution tooltip on hover ("5 contributions on Oct 10").
  - Services accordion expands. Testimonial carousel next and loop-prev.
  - Profile card flip.
  - Booking wizard:
    - Next is disabled until a service is selected, then advances to step 2.
    - Time slots are hidden until a date is picked. Next is disabled until both date and time are set.
    - Step 3 summary shows "Framer Site or Landing Page · 30 min", "Fri, Oct 9 · 10:30 AM", "$120".
    - An empty submit is blocked by native validation. A valid submit shows the confirmation text, and "Book Another" resets to step 1 with Next disabled.
  - Theme toggle, persisted across reload with the matching `aria-pressed`.
- Remaining visual differences:
  - The ID card is static and untilted; the demo's card settles at a physics-driven angle.
  - The profile carousel slides instead of fading.
  - The testimonial side columns don't shuffle.
  - The services thumbnail doesn't follow the cursor.
  - No custom cursor.
  - The contribution graph pattern differs (random in the source).
  - The calendar shows the build month only.
  - The mobile dock sits 48px higher.

### Download vs "View original"
The source's Download button is `fixed right-15 bottom-8 z-70` (60px from the right, 32px up), which overlaps the required `fixed bottom-4 right-4` "View original" button. The port keeps the Download link (same href, Button default variant, `h-8 px-2.5`) but moves it to `lg:right-15 lg:bottom-16`, stacked 16px above "View original". Below lg it goes to `right-4 bottom-28`, above the raised mobile dock. The mobile dock moved from `bottom-4` to `bottom-16`, because the centered dock (≈260px wide) also overlapped "View original" at 390px. Download stays `z-70` and "View original" is `z-[9999]`, so it stays on top in both themes.

## Lessons for a migration skill
- **(general)** Before porting, diff the bejamas component's default classes against the source's shadcn style (here base-nova): Card (border + ring + shadow-lg + spacing 6), Button (sizes one step larger, outline hover = accent), Badge (default size = text-sm h-6), AccordionTrigger (transparent border, underline, items-start). Keep a per-component override snippet.
- **(general)** Audit token *semantics*, not only values. shadcn templates often repurpose `--accent` (brand color) and `--muted` (ink). bejamas components that use `bg-accent`/`bg-muted` for hover/pressed states then look wrong. Grep the installed `src/ui` for `accent`/`muted` and neutralise them per use.
- **(general)** For "click the card to toggle" React patterns, use a Toggle overlay (`absolute inset-0 z-30`) inside the card and style the card with `group-has-[[aria-pressed=true]]/name:`. Hover effects then need to target the card group, because the overlay takes the pointer.
- **(general)** Multi-step React wizards: use Tabs as the step owner, RadioGroups for choices, and CSS `group-has-[[data-slot=tabs-content][data-value='N'][data-state=active]]` for step-dependent chrome. Keep the script to `tabs:set` and `disabled` mirroring. Record it as a stepper gap.
- **(general)** motion `useScroll`/`whileInView` effects map well onto `animation-timeline: view()/scroll()` with longhand properties (`animation-duration: auto` after the shorthand, `animation-timeline` *after* `animation`). Never put the subject inside an `overflow-hidden` wrapper (use `overflow-clip`). Full-page screenshots can't show scroll-linked state, so take scrolled viewport shots of both sites.
- **(general)** IntersectionObserver "active section" nav can be pure CSS: `timeline-scope` on body, `view-timeline` per section, `view-timeline-inset` = the IO rootMargin, and an `animation-range: cover` keyframe that sets the active colors.
- **(general)** Check a source utility against the demo's compiled CSS before porting it: `animate-heartbeat` didn't exist (no-op), and `direction-reverse` came from tw-animate-css.
- **(general)** After `bejamas add marquee`, add the `marquee-x`/`marquee-y` keyframes yourself (CLI bug). After adding a carousel with grid-based slides, neutralise `grid-rows-2`/`grid-cols-2`.
- **(general)** next-themes with `enableSystem={false}`: emulating `prefers-color-scheme` won't switch the demo. Seed `localStorage.theme` for dark comparisons.
- **(site-specific)** Physics/WebGL hero props (React Bits "Lanyard") should be a static composition measured from the demo, with the drop recorded. Don't try to port three.js into a UI-kit port.
- **(site-specific)** The required bottom-right "View original" button can collide with a template's own floating CTA and a centered mobile dock. Plan the stacking (move the CTA up and raise the dock below lg) and record it.
