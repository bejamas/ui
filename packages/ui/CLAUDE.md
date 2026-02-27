# @bejamas/ui

Astro component library with 31+ components using Tailwind CSS 4, CVA, and @data-slot/* behavior libraries.

## Project Structure

```
packages/ui/
├── src/
│   ├── components/     # Component directories (one per component)
│   ├── lib/            # Utilities (cn function)
│   └── styles/         # Global CSS (globals.css)
├── package.json
└── tsconfig.json
```

## Component Conventions

### File Organization

- PascalCase `.astro` files: `Button.astro`, `CardHeader.astro`
- Each component in its own directory with `index.ts` barrel export
- Compound components: multiple files in same directory

### Props Pattern

```typescript
type Props = {
  class?: string;
  // component-specific props
} & HTMLAttributes<"element">;

const { class: className = "", ...rest } = Astro.props as Props;
```

### Styling

- Use `cn()` from `@bejamas/ui/lib/utils` for class merging
- Use `cva()` from class-variance-authority for variants
- Always include `class?: string` prop
- Use `data-slot="component-name"` attributes

### Common Patterns

- `asChild` pattern for trigger components
- Named slots: `<slot name="icon" />`
- Polymorphic `as` prop for flexible HTML elements
- Spread `...rest` props to underlying element

### @data-slot/* Behavior Libraries

Components use `@data-slot/*` packages for client-side behavior. Each package exports a `create{ComponentName}` function:

```astro
<script>
  import { createToggle } from "@data-slot/toggle";
  import { createTabs } from "@data-slot/tabs";
  import { createDialog } from "@data-slot/dialog";
  import { createAccordion } from "@data-slot/accordion";
  import { createSlider } from "@data-slot/slider";
  import { createTooltip } from "@data-slot/tooltip";
  import { createCollapsible } from "@data-slot/collapsible";
  import { createDropdownMenu } from "@data-slot/dropdown-menu";

  // Initialize by selecting elements with data-slot attribute
  document.querySelectorAll('[data-slot="toggle"]').forEach((el) => createToggle(el));
</script>
```

**Naming convention:** `create` + PascalCase component name (e.g., `createToggle`, `createDropdownMenu`)

## JSDoc Documentation

Each main component file (e.g., `Dialog.astro`, `Tabs.astro`, `Button.astro`) has comprehensive JSDoc in the frontmatter:

```typescript
/**
 * @component ComponentName
 * @title Display Title
 * @description Brief description of the component
 * @figmaUrl https://www.figma.com/design/...
 *
 * @preview
 * <ComponentName>Live preview HTML (no code fence)</ComponentName>
 *
 * @usage
 * ```astro nocollapse
 * ---
 * import { Component } from '@bejamas/ui/components/component';
 * ---
 * <Component>Basic usage</Component>
 * ```
 *
 * @api
 * ### Events
 * | Event | Detail | Description |
 * |-------|--------|-------------|
 * | `component:change` | `{ value: string }` | Fired when... |
 *
 * ### Programmatic Control
 * ```js nocollapse
 * element.dispatchEvent(new CustomEvent('component:set', { detail: {...} }));
 * ```
 *
 * ### Data Attributes
 * | Attribute | Element | Description |
 * |-----------|---------|-------------|
 * | `data-state` | component | Current state |
 *
 * @examples
 * ### Example Name
 * <Component variant="...">Example HTML</Component>
 */
```

### Key Documentation Tags

| Tag | Purpose |
|-----|---------|
| `@component` | Component name (must match) |
| `@title` | Display title for docs |
| `@description` | Brief description |
| `@figmaUrl` | Link to Figma design |
| `@preview` | Live preview HTML (no code fence, rendered in docs) |
| `@usage` | Basic usage with code fence (use `astro nocollapse`) |
| `@api` | Events table, Programmatic Control, Data Attributes, CSS Variables |
| `@examples` | Additional examples with `### Heading` and raw HTML |

**Notes:**
- Only main component files get full JSDoc (e.g., `Dialog.astro`, not `DialogTrigger.astro`)
- Preview blocks are raw HTML (no code fence)
- Usage/API code blocks use triple backticks with `nocollapse` modifier

## Key Styling Conventions

| Pattern | Classes |
|---------|---------|
| Focus states | `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]` |
| Disabled states | `disabled:pointer-events-none disabled:opacity-50` |
| SVG handling | `[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0` |
| Aria states | `aria-invalid:ring-destructive/20`, `aria-expanded:bg-muted` |

## Scripts

```bash
bun lint        # ESLint
bun check-types # TypeScript checking
```
