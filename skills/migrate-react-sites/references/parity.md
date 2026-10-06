# Parity resets: bejamas defaults vs shadcn

bejamas components carry their own style (juno), which differs from shadcn's new-york, nova, vega and luma styles. Undoing these defaults was the biggest effort hotspot across 15 site ports. The tables list what those ports found on bejamas 0.5.0 (juno). Defaults change between releases, so **open the installed `src/ui/<name>/` file and confirm a default is still there before you apply its reset.**

## Method

1. **Identify the source style.** Read `components.json` (`style`) and the source `components/ui/*.tsx`. Then measure one rendered Button, Card and Badge on the demo (height, padding, radius, shadow, font size).
2. **Put the resets in one module** (e.g. `src/lib/shadcn.ts`) as class strings per component and variant, and apply them at every call site. Leave the copied `src/ui` files alone. A reset is a few classes; editing the component forks it.
3. **Match the variant prefix.** tailwind-merge only removes a default when your class has the same variant chain. To beat `has-[>svg]:px-2.5`, write `has-[>svg]:px-4`, not `px-4`. The same applies to `md:text-xl`, `data-[size=default]:h-9`, `group-data-[spacing=0]/toggle-group:px-2`, `**:data-[slot=…]:` and `aria-pressed:bg-muted`. If no prefixed class works, style the inner element directly.
4. **Check token semantics.** bejamas uses `bg-accent` and `bg-muted` for hover and pressed states (outline Button, Toggle, DropdownMenu highlight). Many templates repurpose `--accent` or `--muted` as a brand color. Grep `src/ui` for `accent` and `muted` after porting the tokens.
5. **Teach tailwind-merge custom utilities.** Utilities like `glass-*` lose to core `border-*`/`bg-*` defaults until you add them with `extendTailwindMerge` in `src/lib/utils.ts`.

## Reset strings ports converged on

| Source style | Component | Reset |
|---|---|---|
| new-york / v3 default | Button (default) | `rounded-md px-4 shadow-none active:scale-100` |
| | Button `lg` | `rounded-md px-6 has-[>svg]:px-4 active:scale-100` (v3 "default" style: `h-11 px-8 has-[>svg]:px-8`) |
| | Button outline | `bg-background hover:bg-accent hover:text-accent-foreground hover:border-border shadow-none` |
| | Button ghost | `hover:bg-accent hover:text-accent-foreground` |
| | Button link | `text-primary` |
| | Card | `gap-0 py-0 rounded-lg border border-solid ring-0 shadow-xs text-base` (+ `overflow-visible` for hanging badges) |
| | CardHeader | `flex flex-col items-stretch gap-0 space-y-1.5 p-6` |
| | CardTitle | `font-sans text-2xl md:text-2xl font-semibold leading-none tracking-tight text-wrap` (repeat the `md:` size) |
| | CardContent / CardFooter | `p-6 pt-0` (footer `justify-start` or as in the source) |
| | Badge | `shape="pill"` + `h-auto px-2.5 py-0.5 text-xs font-semibold` (or `size="sm"`) |
| | AccordionTrigger | `border-0 text-base items-center rounded-none hover:underline` + a rotating chevron (below) |
| ring styles (nova / vega / luma) | Card | `border-0 shadow-none ring-1 ring-border py-4 gap-4` |
| | Button | `border border-transparent bg-clip-padding gap-1.5 shadow-none active:scale-100 active:translate-y-px rounded-md` |

## Component differences

### Button

| Property | bejamas | shadcn |
|---|---|---|
| radius | `rounded-lg` | `rounded-md` |
| press effect | `active:scale-98` | none (luma/vega: `active:translate-y-px`) |
| padding default / lg | `px-3` / `px-5` | `px-4` / `px-6` (v3 lg `px-8`) |
| icon padding | `has-[>svg]:px-2.5` (default), `px-2` (sm), `px-4` (lg) | `has-[>svg]:px-3` / `px-2.5` / `px-4` |
| heights | default `h-9` | v3 `h-10`, v4 `h-9`, nova `h-8` |
| ghost hover | `hover:bg-secondary` | `hover:bg-accent` |
| shadow | `shadow-xs` on default | none (v4) |
| link | `text-accent` (nearly invisible on neutral themes) | `text-primary` |
| svg sizing | `[&_svg:not([class*='size-'])]:size-4` | v3 `[&_svg]:size-4` beats an icon's own `size-5`, so pass `size-4` to match what renders |
| polymorphism | `as="a"` + `href` | `asChild` + `<Link>`; collapse `<Link><Button/></Link>` into one `<Button as="a">` |

The Button that `bejamas init` scaffolds predates the registry version (it lacks `data-slot`/`data-size`, and outline has no background). Run `bunx bejamas add button --overwrite -y` right after init and re-measure. Source CSS that targets `[data-slot=button][data-size=…]` only matches the registry version.

### Card

- **Edge:** `ring-1 ring-foreground/10`. The border classes cancel each other out (`border-none` + `border`), so a border needs `border-solid`, and usually `ring-0`.
- **Shadow:** `shadow-lg`, where shadcn uses `shadow-sm` (v3) or `shadow-xs` (v4).
- **Text:** `text-sm`; shadcn inherits 16px.
- **Spacing:** `rounded-xl py-6 gap-6`, with the parts carrying `px-6`. v3 parts own `p-6` / `p-6 pt-0`.
- **CardHeader:** a container-query grid (`grid-rows-[auto_auto] items-start gap-1.5`):
  - With a single child, it adds a phantom 6px row; use `grid-rows-none`.
  - Inside an `items-center` parent it collapses, so add `w-full`.
- **CardTitle / CardDescription:** render `div` and have no `as` prop. Wrap an `h3` or `p` inside to keep semantics.
- **Overflow:** `overflow-clip` hides hanging "Most popular" pills; add `overflow-visible`.

### Badge

- **Shape:** `rounded-xs` by default, because the `shape` default beats the style radius. Use `shape="pill"`, or pass `rounded-md` for new-york v4.
- **Size:** `h-6 text-sm` by default, because the `size` default beats the base size. shadcn is `text-xs`, `h-5` or auto.
- **Links:** `as="a"` works at runtime, but `href` fails `astro check` because Props don't extend anchor attributes. Spread an object as a workaround.

### Accordion

- **Chevron:** bejamas swaps two icons. shadcn rotates one. Reproduce shadcn with `<ChevronDown slot="icon" class="group-aria-expanded/accordion-trigger:rotate-180 transition-transform">`. For a Plus icon use `rotate-45`.
- **Trigger box:** `border border-transparent` adds 2px per row; use `border-0`. It also has `items-start` (v3 used `items-center`) and `rounded-md hover:underline`.
- **Open state:** use the `aria-expanded:` variant (not `data-[state=open]:`).
- **API:** `multiple` / `collapsible` (default true) / `defaultValue` (a string). shadcn's `type="single"` maps to the default.
- **Last item:** v4 sources use `last:border-b-0`.

### Menus, overlays and inputs

| Component | bejamas default | Typical override |
|---|---|---|
| DropdownMenuContent | `align="start"`, width = trigger width (`w-[var(--anchor-width)]`), `ring-1 rounded-lg` | pass `align` explicitly; `w-auto min-w-[8rem]`; `rounded-md border ring-0 shadow-md` |
| DropdownMenuItem | `div[role=menuitem]`, no `href`; selection via a root `dropdown-menu:select` event; content is portalled | see the link-item workaround in known-issues |
| DropdownMenuRadioItem | check icon on the right | dot on the left needs arbitrary variants on `[data-slot=dropdown-menu-radio-item-indicator]` |
| NavigationMenuTrigger | `text-base`, always a chevron | `text-sm [&>svg]:hidden` |
| NavigationMenuLink | `flex p-2 rounded-sm hover:bg-muted` | reset, then inline the source's trigger-style classes |
| NavigationMenu viewport | positioned under the active trigger | `alignOffset`/`sideOffset` to imitate a root-anchored mega menu |
| TooltipContent | `bg-foreground text-background` + arrow | `[&>[data-slot=tooltip-arrow]]:hidden`, `bg-popover border` |
| DialogContent | `ring-1 rounded-xl gap-6 sm:max-w-md`, light overlay | `gap-4 rounded-lg border p-6 shadow-lg ring-0 sm:max-w-lg`, `overlayClass="bg-black/50"` |
| Drawer (as a Sheet) | 340px, 16px radius, borders on all sides, `bg-foreground/20` backdrop, all in unlayered global CSS | `w-3/4! sm:max-w-sm! rounded-none!`, or global `[data-slot=drawer-popup]` / `[data-slot=drawer-backdrop]` rules; place `DrawerClose` after the body |
| TabsList | `variant="indicator"` (sliding pill) | `variant="default"` for a static active background |
| Toggle | `hover:bg-muted aria-pressed:bg-muted` | `aria-pressed:bg-transparent` or the source color |
| Input / SelectTrigger | `data-[size=default]:h-9 px-3`, `rounded-lg`, `shadow-xs` | `data-[size=default]:h-10` (same prefix), `rounded-md shadow-none` |
| Textarea | `field-sizing-content` ignores `rows` | `field-sizing-fixed` |
| FieldLabel | `leading-snug` | `leading-none` (FormLabel) |
| Carousel content | is the scroll viewport, `gap-4 rounded-lg` | embla `-ml-4`/`pl-4` → `gap-0 -ml-4 w-[calc(100%+1rem)]` + root `overflow-x-clip` |
| Avatar | no ring | luma/nova: `after:border after:border-border after:mix-blend-darken` |
| Marquee | 2 copies, `min-w-full justify-around` | `[&_.marquee-content]:min-w-max justify-start gap-4 pr-4`; pause: `hover:[&_.marquee-content]:[animation-play-state:paused]` |
| HamburgerMenu | its own 48px bar, overlay panel, fixed icon | use Collapsible (inline panel) or Drawer (side sheet) when the layout differs |

### `asChild` and triggers

`asChild` in bejamas wraps the child in a `div` that becomes the trigger. To get one real element, pass the primitive's slot to the Button directly. Button forwards rest props, so this works: `<Button data-slot="dialog-trigger" variant="ghost">`. The same applies to `drawer-trigger`, `tooltip-trigger` and `collapsible-trigger`. Put responsive visibility classes on the component root, not on the wrapped child.
