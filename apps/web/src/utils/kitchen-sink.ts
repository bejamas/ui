export type KitchenSinkPage = {
  id: string;
  href: string;
  label: string;
  description: string;
  js?: boolean;
};

export const KITCHEN_SINK_PAGES: KitchenSinkPage[] = [
  {
    id: "accordion",
    href: "/kitchen-sink/accordion",
    label: "Accordion",
    description: "Collapsible sections, multiple open, default open, disabled items",
    js: true,
  },
  {
    id: "alert",
    href: "/kitchen-sink/alert",
    label: "Alert",
    description: "Default, destructive, with icons, custom styled alerts",
  },
  {
    id: "avatar",
    href: "/kitchen-sink/avatar",
    label: "Avatar",
    description: "Images, fallbacks, sizes, rounded variants, groups, dropdown trigger",
  },
  {
    id: "badge",
    href: "/kitchen-sink/badge",
    label: "Badge",
    description: "Variants, pill shape, sizes, with icons, as links",
  },
  {
    id: "breadcrumb",
    href: "/kitchen-sink/breadcrumb",
    label: "Breadcrumb",
    description: "Basic, custom separator, collapsed ellipsis, long paths",
  },
  {
    id: "button",
    href: "/kitchen-sink/button",
    label: "Button",
    description: "Variants, sizes, icons, loading states, as links",
  },
  {
    id: "button-group",
    href: "/kitchen-sink/button-group",
    label: "Button Group",
    description: "Horizontal, vertical, sizes, icons, split button, nested",
  },
  {
    id: "card",
    href: "/kitchen-sink/card",
    label: "Card",
    description: "Default, ghost, with media, login form, actions, grid layout",
  },
  {
    id: "carousel",
    href: "/kitchen-sink/carousel",
    label: "Carousel",
    description: "Basic, vertical, snap proximity, center aligned, fade, multiple items",
  },
  {
    id: "checkbox",
    href: "/kitchen-sink/checkbox",
    label: "Checkbox",
    description: "Basic, checked, disabled, groups, indeterminate state",
  },
  {
    id: "collapsible",
    href: "/kitchen-sink/collapsible",
    label: "Collapsible",
    description: "Basic, default open, file tree, events, programmatic control",
    js: true,
  },
  {
    id: "combobox",
    href: "/kitchen-sink/combobox",
    label: "Combobox",
    description: "Searchable dropdowns, groups, side/align, input sizing",
    js: true,
  },
  {
    id: "date",
    href: "/kitchen-sink/date",
    label: "Date",
    description: "Short, full, long formats, with time, time only, custom locales",
  },
  {
    id: "dialog",
    href: "/kitchen-sink/dialog",
    label: "Dialog",
    description: "Basic, with form, confirmation, scrollable, programmatic control",
    js: true,
  },
  {
    id: "dropdown-menu",
    href: "/kitchen-sink/dropdown-menu",
    label: "Dropdown Menu",
    description: "Submenus, checkboxes, radio groups, keyboard navigation",
    js: true,
  },
  {
    id: "forms-actions",
    href: "/kitchen-sink/forms-actions",
    label: "Forms + Actions",
    description: "Astro Actions form POST, client RPC submit, validation errors",
  },
  {
    id: "hover-card",
    href: "/kitchen-sink/hover-card",
    label: "Hover Card",
    description: "Link previews, timing, positioning, events, dialog nesting",
    js: true,
  },
  {
    id: "input",
    href: "/kitchen-sink/input",
    label: "Input",
    description: "Types, button-aligned sizes, disabled, invalid, file upload",
  },
  {
    id: "input-group",
    href: "/kitchen-sink/input-group",
    label: "Input Group",
    description: "Sizes, icons, text addons, buttons, textarea, form",
  },
  {
    id: "item",
    href: "/kitchen-sink/item",
    label: "Item",
    description: "Basic, with icon, avatar, actions, variants, sizes, item group",
  },
  {
    id: "kbd",
    href: "/kitchen-sink/kbd",
    label: "Kbd",
    description: "Single keys, combinations, in context, in button, in tooltip",
  },
  {
    id: "label",
    href: "/kitchen-sink/label",
    label: "Label",
    description: "Basic, with input, checkbox, switch, disabled, required",
  },
  {
    id: "link-group",
    href: "/kitchen-sink/link-group",
    label: "Link Group",
    description: "Basic, without title, custom styling, footer layout",
  },
  {
    id: "marquee",
    href: "/kitchen-sink/marquee",
    label: "Marquee",
    description: "Left, right, vertical, speed variations, solid variant",
  },
  {
    id: "native-select",
    href: "/kitchen-sink/native-select",
    label: "Native Select",
    description: "Basic, sizes, with label, option groups, disabled, error, form",
  },
  {
    id: "navigation-menu",
    href: "/kitchen-sink/navigation-menu",
    label: "Navigation Menu",
    description: "Horizontal nav with dropdowns and mega menus",
    js: true,
  },
  {
    id: "popover",
    href: "/kitchen-sink/popover",
    label: "Popover",
    description: "Positioning, triggers, nested content",
    js: true,
  },
  {
    id: "radio-group",
    href: "/kitchen-sink/radio-group",
    label: "Radio Group",
    description: "Basic, default selected, descriptions, disabled, horizontal, form",
  },
  {
    id: "select",
    href: "/kitchen-sink/select",
    label: "Select",
    description: "Dropdowns, groups, scrollable lists, form integration",
    js: true,
  },
  {
    id: "separator",
    href: "/kitchen-sink/separator",
    label: "Separator",
    description: "Horizontal, vertical, in menu, in list",
  },
  {
    id: "skeleton",
    href: "/kitchen-sink/skeleton",
    label: "Skeleton",
    description: "Basic shapes, avatar + text, card, table, form loading states",
  },
  {
    id: "slider",
    href: "/kitchen-sink/slider",
    label: "Slider",
    description: "Single, range, multi-thumb, vertical, step controls",
    js: true,
  },
  {
    id: "spinner",
    href: "/kitchen-sink/spinner",
    label: "Spinner",
    description: "Basic, sizes, in button, in badge, custom colors",
  },
  {
    id: "sticky-surface",
    href: "/kitchen-sink/sticky-surface",
    label: "Sticky Surface",
    description: "Line, elevate, backdrop effects, combined, observeStuck",
  },
  {
    id: "switch",
    href: "/kitchen-sink/switch",
    label: "Switch",
    description: "Basic, disabled, with descriptions, settings panel",
  },
  {
    id: "tabs",
    href: "/kitchen-sink/tabs",
    label: "Tabs",
    description: "Basic, with indicator, cards, disabled, overflow",
    js: true,
  },
  {
    id: "textarea",
    href: "/kitchen-sink/textarea",
    label: "Textarea",
    description: "Basic, with label, disabled, error, character count, form",
  },
  {
    id: "toggle",
    href: "/kitchen-sink/toggle",
    label: "Toggle",
    description: "Variants, sizes, pressed states, programmatic control",
    js: true,
  },
  {
    id: "toggle-group",
    href: "/kitchen-sink/toggle-group",
    label: "Toggle Group",
    description: "Single/multiple selection, orientations, sizes",
    js: true,
  },
  {
    id: "tooltip",
    href: "/kitchen-sink/tooltip",
    label: "Tooltip",
    description: "Sides, alignment, delay, icon buttons, keyboard shortcuts",
    js: true,
  },
];

export const DEFAULT_CREATE_PREVIEW_PATH: string | null = null;
export const CREATE_PREVIEW_FALLBACK_LABEL = "Create preview";

const KITCHEN_SINK_PAGE_MAP = new Map(
  KITCHEN_SINK_PAGES.map((page) => [page.href, page]),
);
const KITCHEN_SINK_PAGE_ID_MAP = new Map(
  KITCHEN_SINK_PAGES.map((page) => [page.id, page]),
);

export function getKitchenSinkPage(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  return KITCHEN_SINK_PAGE_MAP.get(normalizeKitchenSinkPath(path)) ?? null;
}

export function getKitchenSinkPageById(id: string | null | undefined) {
  if (!id) {
    return null;
  }

  return KITCHEN_SINK_PAGE_ID_MAP.get(id) ?? null;
}

export function getKitchenSinkPagePaths() {
  return KITCHEN_SINK_PAGES.map((page) => page.href);
}

export function getKitchenSinkPageIds() {
  return KITCHEN_SINK_PAGES.map((page) => page.id);
}

export function getKitchenSinkCreateItemId(id: string | null | undefined) {
  if (!id) {
    return null;
  }

  return `${id}-example`;
}

export function normalizeKitchenSinkPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.replace(/\/+$/, "");
}

export function resolveCreatePreviewItem(
  item: string | null | undefined,
): string | null {
  if (!item) {
    return DEFAULT_CREATE_PREVIEW_PATH;
  }

  const normalizedItem = item.endsWith("-example")
    ? item.slice(0, -"-example".length)
    : item;

  return (
    getKitchenSinkPageById(normalizedItem)?.id ?? DEFAULT_CREATE_PREVIEW_PATH
  );
}

export function getKitchenSinkPreviewHref(
  item: string | null | undefined,
): string | null {
  return getKitchenSinkPageById(item)?.href ?? null;
}
