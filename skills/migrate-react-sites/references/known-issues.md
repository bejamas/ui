# Known issues and primitive gaps

Observed on bejamas 0.5.0 across 15 site ports. Before applying a workaround, check the installed component, since the issue may already be fixed. When a gap blocks fidelity, record it and pick the accepted approach below rather than writing a new controller.

## Setup and CLI

| Issue | Workaround |
|---|---|
| The template pins an older `bejamas` | `bun add bejamas@latest` after init |
| The template's Button predates the registry one; `add button` reports "Skipped … (files might be identical)" | `bunx bejamas add button --overwrite -y` |
| `-b neutral` still ships the blue `bejamas-blue` primary (plus sidebar and chart tokens) | replace `:root`/`.dark` wholesale with the source's tokens; add `--destructive-foreground` if the source uses it |
| Generated fonts have no `weights`, so only 400 loads and bold is synthesized | `weights: ["100 900"]` (variable fonts) or an explicit list |
| `@theme inline { --font-sans: var(--font-sans) }` is self-referential without a `<Font>` | for system-stack sites, write the stack literally |
| `:root { --font-heading: var(--font-sans) }` overrides a real heading font | delete the line |
| no color-mode script | see the color-mode recipe |
| `bejamas add` puts `shadcn` in devDependencies | `bun remove shadcn` |
| `bejamas add marquee`: the `marquee-x`/`marquee-y` keyframes are missing, so the marquee is static | add both to `globals.css` inside `@layer theme`: `@keyframes marquee-x { from { transform: translateX(0) } to { transform: translateX(-100%) } }`, and the same for `marquee-y` with `translateY`. For a seamless loop with a gap between copies, subtract it: `translateX(calc(-100% - var(--marquee-gap, 0px)))` |
| `bejamas add select` fails to build (`Rolldown failed to resolve import "@/lib/select"`); `@data-slot/select` isn't installed | `bun add @data-slot/select`; copy `lib/select.ts` from the bejamas registry source into `src/lib/` |
| `astro check` needs `@astrojs/check` | `bun add -d @astrojs/check` |
| `<html  lang>` (double space), no `initial-scale=1`, scaffold favicon and `bejamas.svg` | fix and delete |

## Components

| Issue | Workaround |
|---|---|
| Card border never shows (`border-none` + `border`) | `border-solid` (+ `ring-0`) |
| Card `shadow-sm` and `shadow-lg` both present; `shadow-lg` wins | set the source's shadow |
| Badge `shape` and `size` defaults override the style | `shape="pill"`, `size="sm"` or explicit classes |
| Badge `href` fails `astro check` | spread an attributes object |
| Button `variant="link"` is `text-accent` | `text-primary` |
| Drawer width, radius and backdrop are set in unlayered global CSS | `!` utilities or global `[data-slot=drawer-popup]` / `[data-slot=drawer-backdrop]` rules |
| ToggleGroup's runtime re-adds variant classes after merge | `!` utilities on items |
| ToggleGroup `multiple` `defaultValue` array is joined with `,` but split on whitespace | pass a space-separated string |
| CarouselSlide applies 2-up grid tracks outside `variant="multiple"` | `group-data-[orientation=vertical]/carousel:grid-rows-none` (or `grid-cols-none`) |
| `AvatarFallback` and src-less `AvatarImage` render `<div>`, which breaks a surrounding `<p>` | make the wrapper a `div` |
| `RadioGroupItem` renders an empty `id` | pass an explicit `id` |
| `StickySurface` line is `after:bg-black/15`, invisible in dark mode | `after:bg-border` |
| `Separator` has no `data-orientation`, so source `data-vertical:` classes never match | plain classes |
| The scroll lock reserves `scrollbar-gutter: stable` even without a scrollbar: a 7.5–15px shift while menus, dialogs or drawers are open (seen in headless Chromium) | accept it; don't chase it in screenshot diffs |
| An interactive component's in-place `<script>` sibling picks up `space-*` margins | `gap-*`, or wrap the component in a div |

## Gaps and accepted approaches

| Need | Accepted approach |
|---|---|
| Theme provider or toggle | head script + listener on the Toggle/DropdownMenu event (recipes) |
| Mobile nav that differs from HamburgerMenu's layout | Collapsible for an inline push-down panel; Drawer for a side sheet |
| Close the menu on link tap | Drawer: `<a data-slot="drawer-close" href>`, or `drawer:close` on link click. Collapsible: none, so record it |
| A panel that's collapsible below a breakpoint and always visible above it | the `hidden` attribute beats `lg:flex!` (preflight `!important`), so render a static desktop copy and wrap only the mobile copy in Collapsible (`class="contents lg:hidden"`) |
| DropdownMenuItem as a link | an `<a>` inside `DropdownMenuItem class="p-0"`, plus a `dropdown-menu:select` listener that clicks the link when `detail.source === "keyboard"` |
| Carousel with several visible slides | `data-slides="multiple"` on `CarouselRoot` (`variant="multiple"` means a 2-up grid per slide). Without it, visible neighbours are `inert` |
| Carousel autoplay | an interval dispatching `carousel:set { action: "next" }`, paused on hover, when hidden and under reduced motion |
| Synced carousels or thumbnail indicators | relay `carousel:change` from one to `carousel:set` on the other. Center alignment, seamless loop and cross-fade aren't available; record them |
| ToggleGroup that must keep a selection (monthly/yearly) | when `toggle-group:change` reports `[]`, re-set the last value with `toggle-group:set` |
| Derived display (price label, active panel image) | a listener on the primitive's change event, scoped to the block root |
| Copy to clipboard | a short click handler: `navigator.clipboard.writeText`, then a `data-copied` attribute for 2s, with CSS swapping the icon |
| ⌘K search | compose `Dialog` + `DialogTrigger` + `DialogContent` + `Command`; `autofocus` on the command input; extra triggers and the hotkey dispatch `dialog:set { open: true }`. `command:select` → navigate via `data-href` |
| Dialog with several triggers | the first binds; the others dispatch `dialog:set` |
| Form validation (react-hook-form + zod) | native constraint validation (`required`, `type=email`, `minlength`). Prevent the default GET submit so emails don't end up in the URL |
| Tabs activated from external links (category badges, hash) | `tabs:set` on click + an initial `location.hash` check |
| Stepper or wizard | Tabs + `tabs:set` |
| Calendar or date picker (`date` is only a formatter) | a RadioGroup grid for a fixed month; record the gap |
| ScrollArea | native `overflow-auto` with styled or hidden scrollbars |
| BreadcrumbLink / BreadcrumbPage | plain `<a>` / `<span aria-current="page">` inside BreadcrumbItem |
| Pressable card (Toggle is a `<button>` only) | a Toggle overlay + `group-has-[[aria-pressed=true]]:` styles |
| Dismissible banner | Collapsible or Toggle; persistence isn't available |
| Toast, rating, animated number, scroll-spy primitive | static, CSS, or dropped; record it |
