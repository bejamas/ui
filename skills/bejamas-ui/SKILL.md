---
name: bejamas-ui
description: Build Astro pages and components with bejamas/ui - set up a project, add components with the bejamas CLI, compose them, style their states and script their behavior. Use when a task touches an Astro project that has bejamas/ui (a components.json with a bejamas style, `@data-slot/*` dependencies, `data-slot` attributes), or when asked to build UI with bejamas/ui.
---

# Building with bejamas/ui

bejamas/ui components are Astro files copied into the project, styled with Tailwind CSS v4. They render plain HTML on the server. Interactive ones attach a small `@data-slot/*` controller in a bundled `<script>`; the rest ship no JavaScript.

Three facts drive almost every decision:

1. **The code is the project's.** After `bejamas add`, a component is an editable `.astro` file. Read it before guessing its props.
2. **State is uncontrolled.** Props set the *initial* state. The controller owns it afterwards, reports changes through `<component>:change` events and accepts `<component>:set` events.
3. **Parts are found by `data-slot`.** Controllers locate triggers, content and items by their `data-slot` attribute, so any element with the right `data-slot` becomes that part.

## Look things up instead of guessing

- Every docs page has a Markdown twin: append `.md` to the URL, e.g. `https://ui.bejamas.com/components/select.md`.
- The index of all pages is `https://ui.bejamas.com/llms.txt`; everything in one file is `https://ui.bejamas.com/llms-full.txt`.
- From the project: `npx bejamas docs <component>` prints that component's docs; `npx bejamas info --json` shows the project's config.
- Coming from shadcn/ui or React: read `https://ui.bejamas.com/docs/shadcn-parity.md`. It maps every component, prop and pattern.

Read a component's page before using it for the first time in a task. Props, parts and events differ per component.

## Set up and add components

```bash
npx bejamas@latest init            # new Astro app or monorepo
npx bejamas@latest add select dialog tabs
```

- Check `components.json` for where components land. Import from its `ui` alias: `@/ui/select` in a single app, `@repo/ui/components/select` in the template monorepo.
- Re-adding a component with `--overwrite` discards local edits. Preview the change with `--diff` or `--dry-run` first.
- Blocks (`navigation-headers-01`, `footer-01`, …) install the same way and pull in their components.

## Compose

```astro
---
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
---

<Select name="fruit" defaultValue="apple" class="w-48">
  <SelectTrigger>
    <SelectValue placeholder="Pick a fruit" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="apple">Apple</SelectItem>
    <SelectItem value="banana">Banana</SelectItem>
  </SelectContent>
</Select>
```

- Use `class`, not `className`. Classes merge with the component's own, so you can override them.
- **Links that look like buttons**: `<Button as="a" href="/login">`. `as` exists on Button, Badge, StickySurface and a few others, listed in the parity doc.
- **Your own element as a part**: give it the part's `data-slot`, e.g. `<Button variant="ghost" data-slot="dialog-close">Cancel</Button>`. This is the usual way to restyle a trigger.
- **`asChild`** on triggers wraps your element in a `<div data-slot="…-trigger">`. It doesn't merge into the child, so put attributes on the child.
- Named slots replace inner parts, e.g. `<PlusIcon slot="icon" />` inside `AccordionTrigger`.
- Never add `client:*` directives to bejamas/ui components. They aren't framework islands.

## Style state

Components expose state as attributes: `data-state`, `data-open` / `data-closed`, `data-checked`, `data-selected`, `data-disabled`, `data-orientation` and so on. Style with Tailwind data variants:

```astro
<AccordionTrigger class="data-[state=open]:text-primary">…</AccordionTrigger>
<TabsTrigger class="data-[state=active]:font-semibold">…</TabsTrigger>
```

Theme colors, radius and fonts are CSS variables in the project's global stylesheet. Change tokens there instead of hard-coding colors in components. See `https://ui.bejamas.com/docs/theming.md`.

## Script behavior

React to changes and drive state from a plain `<script>`. There are no callbacks or props for this:

```astro
<Dialog id="settings">…</Dialog>
<Button id="open-settings">Settings</Button>

<script>
  const dialog = document.getElementById("settings")!;

  dialog.addEventListener("dialog:change", (event) => {
    console.log((event as CustomEvent<{ open: boolean }>).detail.open);
  });

  document.getElementById("open-settings")!.addEventListener("click", () => {
    dialog.dispatchEvent(new CustomEvent("dialog:set", { detail: { open: true } }));
  });
</script>
```

- Event names follow `<component>:change` / `<component>:set` (`tabs:change` with `{ value }`, `select:change`, `accordion:change`, …). Some components add more specific ones (`command:select`, `slider:commit`). The component's page lists them.
- Forms: `Select`, `Combobox`, `RadioGroup` and `Switch` render hidden native inputs when given `name`, so a plain `<form>` submits them. `Slider` doesn't. Mirror `slider:change` into a hidden input.
- Component scripts bind on load and again after each `<ClientRouter />` navigation. Markup you insert later from your own script isn't bound. Call the controller for it, e.g. `createDialog(el)` from `@data-slot/dialog`.
- For blocks and page sections, compose the components and use their events. Don't write a separate behavior controller for a block when a component already provides the behavior.

## Pitfalls

| Symptom | Cause and fix |
|---|---|
| Component works on first load, dead after a ClientRouter navigation | It was installed before components re-bound on `astro:page-load`. Reinstall it with `bejamas add <name> --overwrite` and re-apply local edits. |
| Trigger renders as a filled primary button | `PopoverTrigger` and `DropdownMenuTrigger` render a `Button` with the `default` variant. Pass `variant="outline"` or `variant="ghost"`. |
| Passing `value` / `open` later changes nothing | State is uncontrolled. Dispatch `<component>:set` instead. |
| A component's script never runs | It's rendered only inside a `<template>`. Render one instance of that component outside the template. |
| Dev server reloads the page once with "optimized dependencies changed" | Add the `@data-slot/*` packages to `vite.optimizeDeps.include`. |
| Toast stops working after navigation | Its viewport is moved to `<body>`, which navigation replaces. Render `Toast` on each page without `transition:persist`. |

## Check your work

Render the page and confirm, in the browser rather than by reading code:

1. No console errors, and no warnings that a component was bound twice.
2. Interactive components work with the keyboard: Tab reaches the trigger, Enter or Space opens it, arrows move, Escape closes, and focus returns to the trigger.
3. State attributes change in the DOM when you interact (`data-state`, `aria-expanded`), and your state styles follow them.
