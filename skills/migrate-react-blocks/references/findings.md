# Migration findings

These findings summarize practical migrations of static layouts, forms, interactive primitives and service-dependent blocks. Use them to estimate effort and recognize common obstacles; arbitrary blocks still require source inspection and runtime verification.

## Easy: static layout and forms without state

Metric cards, feature grids, highlight sections and static footers need no React runtime. Even an upstream `use client` file can be static when it has no hooks. Source arrays and icon data remain server-side. Typography/theme defaults may differ; preserve layout classes rather than assuming the primitive's defaults match.

Login, signup and form-layout ports use native validation and server-rendered fields. Upstream frontend previews often have no auth or submission implementation. Adding `required`, repairing a missing form association, or changing Cancel to reset is an explicit behavior change, even if sensible. Do not conflate those repairs with source parity.

## Medium: existing primitive, different composition

Dialogs demonstrate render-prop translation, controlled-to-DOM state and form association. Inspect both source and destination APIs. A passthrough prop accepted by Astro's compiler may do nothing at runtime. The `data-dialog-close` attribute does not close a dialog; the installed controller requires `data-slot="dialog-close"`.

A handcrafted disclosure can use Bejamas Accordion while preserving single-open/collapsible behavior. Entrance staggering needs separate treatment. Tabbed FAQs can use separate native panels/accordions to avoid stale filtered children and keep each category's state. Test the actual category/accordion relationship rather than merely showing tab labels.

## Harder: compound local state and semantic composition

Pricing controls listen to switch state and update price nodes within their own root. Configurable pricing must preserve source prices, quantity multipliers and optional add-ons. Native Bejamas Slider replaces React slider state, while derived totals remain block-owned. Number/layout springs require a separate animation implementation.

Expandable tables can preserve project/module rows and expansion behavior with valid table markup. Do not emulate React render composition by wrapping tbody in a div. Geometry and expansion animation may differ and need documentation.

Command menus can preserve grouped search and keyboard selection. React effect cleanup and the global shortcut become explicit browser responsibilities. Delegate command filtering to the primitive and choose the appropriate instance for the hotkey. If the source never wired command actions, a selected item is not evidence of an executed application command.

## Highest friction: specialized controls, motion and services

A color picker can retain hex/alpha/preset data flow and popover behavior while using a native OS RGB chooser instead of a custom saturation/hue plane. That is an interaction difference. Full parity requires a native pointer/keyboard color plane, color conversion math and screen-reader behavior, or an explicitly agreed framework island. Do not label an approximation pixel/interaction equivalent.

CSS can approximate some animation effects and support reduced motion. Spring, stagger and scroll-linked motion require deliberate translation; removing them cannot be called a faithful animation port.

File cards separate presentation, clipboard/download links and local removal from uploading/deleting a stored file. OAuth buttons can expose configurable server endpoints and disable unconfigured providers. Full service behavior requires a server integration, credentials and actual end-to-end validation. Record unresolved integration boundaries explicitly.

## Repository and integration obstacles

- Read the checked-in canonical source. `packages/ui` is generated, not the place to fix a primitive.
- Check public component exports: a wildcard pointing to flat Astro files does not resolve component barrels in subdirectories. Recheck the receiving package before adding aliases.
- Lucide brand exports used by upstream are absent from the installed Astro package. Preserve pinned brand SVGs; substituting arbitrary generic glyphs changes the visual contract.
- A README license link can be broken while the actual notice uses another filename, such as `LICENCE.md`. Verify the notice itself.
- External logo/portrait URLs and host-specific font classes need asset decisions. Record external requests and substitutions; production ports should expose props or vendor authorized assets.
- Animation CSS can override `hidden`; expandable-table ports may need explicit styles for hidden rows. Browser-test this instead of trusting an HTML attribute alone.
- Portals reparent Dialog/Popover content to the body. A color picker can update values but leave preset pressed state stale when a later root query finds no portalled buttons. Capture references at initialization. Dialog form handlers bind directly to their forms for the same reason.
- Semantic SVGs without intrinsic dimensions can collapse icon-only dialog close buttons to 0×0. Supply dimensions in the receiving styles when needed; preserve the close control.
- A fixed 480px settings panel put its close control outside a short viewport. Capping panel height to `100dvh - 2rem` repaired the responsive defect; record that behavior change.

For each migration, record build/type results, observed browser behavior and remaining differences. Pending tests are not passes.
