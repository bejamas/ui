# Known issues and primitive gaps

Observed on bejamas 0.5.0–0.6.0 across 15 site ports and two in-repo migrations. The setup bugs fixed after 0.5.0 (base color theme, font weights and variables, the template Button, `add select`, the layout's `<html>` and viewport, `astro check`, `shadcn` in devDependencies) and the component bugs fixed in the registry since (Badge `href`, Avatar `<div>`s, RadioGroupItem `id`, Separator orientation attributes, CarouselSlide tracks, StickySurface line, Drawer `modal`) are no longer listed. Before applying a workaround, check the installed component, since the issue may already be fixed. When a gap blocks fidelity, record it and pick the accepted approach below rather than writing a new controller.

## Setup and CLI

| Issue | Workaround |
|---|---|
| no color-mode script | see the color-mode recipe |
| `bejamas add` re-inserts the style's base rules (`* { border-border outline-ring/50 }`, `body { bg-background text-foreground }`) into `globals.css` when a port removed them | re-check `globals.css` after every `bejamas add` |
| Registry components fail `eslint-plugin-astro`'s recommended rules (`no-exports-from-components`, `no-explicit-any`) | a lint override for `src/ui/**` in repos that lint `.astro` files |
| In a workspace, the template's TypeScript major can differ from the workspace's | align shared tool versions before installing |
| Up to bejamas 0.6.0, `bejamas add` fails with `ERR_PNPM_ADDING_TO_ROOT` in a site that is its own pnpm workspace root | `npm_config_ignore_workspace_root_check=true pnpm exec bejamas add <name>` |
| Astro 7's `astro preview` can detach and return immediately | `astro preview status`, `logs` or `stop` |
| Scaffold favicon and `bejamas.svg` | delete |

## Components

| Issue | Workaround |
|---|---|
| Card border never shows (`border-none` + `border`) | `border-solid` (+ `ring-0`) |
| Card `shadow-sm` and `shadow-lg` both present; `shadow-lg` wins | set the source's shadow |
| Badge `shape` and `size` defaults override the style | `shape="pill"`, `size="sm"` or explicit classes |
| Button `variant="link"` is `text-accent` | `text-primary` |
| Drawer width, radius and backdrop are set in unlayered global CSS | `!` utilities or global `[data-slot=drawer-popup]` / `[data-slot=drawer-backdrop]` rules |
| ToggleGroup's runtime re-adds variant classes after merge | `!` utilities on items |
| The scroll lock reserves `scrollbar-gutter: stable` even without a scrollbar: a 7.5–15px shift while menus, dialogs or drawers are open (seen in headless Chromium) | accept it; don't chase it in screenshot diffs |
| An interactive component's in-place `<script>` sibling picks up `space-*` margins | `gap-*`, or wrap the component in a div |
| The NavigationMenu wrapper hardcodes a `<nav>` root and `<button>` triggers, so a trigger that is also a link (opening on hover) can't be built | use the `@data-slot/navigation-menu` primitive directly |
| ClientRouter: a component whose `<script>` has no `astro:page-load` listener (installed before the registry fix) binds once per session, so after a client-side navigation the new page's components don't respond | reinstall it (`bejamas add <name> --overwrite`) and re-apply the port's edits to the file. Until then, a stopgap: one page-load script that calls `create()` from each `@data-slot/*` package the site uses (`create()` skips roots that are already bound, but never releases removed ones). Delete the script once the components are reinstalled, or each one warns in dev that it was bound twice |
| A modal Drawer makes everything outside it `inert`: a dialog opened from inside the drawer but rendered outside it is unreachable, and the drawer's Escape handler fires first | `modal="trap-focus"` on the Drawer, and handle Escape in the dialog (the primitive skips events already prevented) |

## Astro gotchas

| Issue | Workaround |
|---|---|
| A component's `<script>` is emitted where the component first appears; inside a `<template>` (an inactive view) it never runs | import the behavior from a component rendered outside the template |
| A Toast marked `transition:persist` loses its toast viewport on a ClientRouter navigation: the viewport is portaled to `<body>`, which the swap replaces | render the Toast on every page without `transition:persist` |
| In dev, Vite discovers dependencies during the first render, logs "optimized dependencies changed. reloading" and reloads the page mid-measurement | list the `@data-slot/*` packages (and other late discoveries) in `vite.optimizeDeps.include` |
| Spreading CMS objects as props renders object-valued and camelCase props that React silently dropped (`[object Object]` attributes) | filter props with a small `domProps()` helper, and diff section-root attributes against the legacy HTML |
| Astro inlines small scripts, which a strict CSP copied from the legacy headers blocks | `vite: { build: { assetsInlineLimit: 0 } }` |

## Gaps and accepted approaches

| Need | Accepted approach |
|---|---|
| Theme provider or toggle | head script + listener on the Toggle/DropdownMenu event (recipes) |
| Mobile nav that differs from HamburgerMenu's layout | HamburgerMenu `triggerPosition="start"` for a left trigger, `panel="inline"` for a push-down panel, `--hamburger-menu-bar-height` and `barClass`/`panelClass` to match the header; Drawer for a side sheet |
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
| Rating, animated number, scroll-spy primitive | static, CSS, or dropped; record it |
