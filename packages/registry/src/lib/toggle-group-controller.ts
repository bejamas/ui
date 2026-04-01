import {
  createToggleGroup as createBaseToggleGroup,
  type ToggleGroupController,
  type ToggleGroupOptions,
} from "@data-slot/toggle-group";
import {
  TOGGLE_SIZES,
  TOGGLE_VARIANTS,
  toggleVariants,
  type ToggleSize,
  type ToggleVariant,
} from "./toggle-shared";

type ToggleOrientation = "horizontal" | "vertical";

interface ToggleGroupControllerOptions extends ToggleGroupOptions {
  size?: ToggleSize;
  spacing?: number;
  variant?: ToggleVariant;
}

function parseOrientation(value: string | undefined): ToggleOrientation {
  return value === "vertical" ? "vertical" : "horizontal";
}

function parseVariant(value: string | undefined): ToggleVariant | null {
  return TOGGLE_VARIANTS.includes(value as ToggleVariant)
    ? (value as ToggleVariant)
    : null;
}

function parseSize(value: string | undefined): ToggleSize | null {
  return TOGGLE_SIZES.includes(value as ToggleSize)
    ? (value as ToggleSize)
    : null;
}

function parseSpacing(value: string | undefined): number {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function setPresenceAttribute(
  element: HTMLElement,
  attribute: string,
  active: boolean,
) {
  if (active) {
    element.setAttribute(attribute, "");
    return;
  }

  element.removeAttribute(attribute);
}

function syncRootAttributes(
  root: HTMLElement,
  orientation: ToggleOrientation,
  spacing: number,
) {
  root.dataset.orientation = orientation;
  root.dataset.spacing = String(spacing);
  root.style.setProperty("--gap", String(spacing));
  setPresenceAttribute(root, "data-horizontal", orientation === "horizontal");
  setPresenceAttribute(root, "data-vertical", orientation === "vertical");
}

function syncItemAttributes(
  item: HTMLElement,
  variant: ToggleVariant,
  size: ToggleSize,
  spacing: number,
) {
  const itemVariant = parseVariant(item.dataset.variant) ?? variant;
  const itemSize = parseSize(item.dataset.size) ?? size;

  item.dataset.variant = itemVariant;
  item.dataset.size = itemSize;
  item.dataset.spacing = String(spacing);

  for (const className of toggleVariants({
    variant: itemVariant,
    size: itemSize,
  }).split(/\s+/)) {
    if (className) {
      item.classList.add(className);
    }
  }
}

export function createToggleGroup(
  root: HTMLElement,
  options?: ToggleGroupControllerOptions,
): ToggleGroupController {
  const orientation = parseOrientation(
    options?.orientation ?? root.dataset.orientation,
  );
  const variant = parseVariant(options?.variant ?? root.dataset.variant) ?? "default";
  const size = parseSize(options?.size ?? root.dataset.size) ?? "default";
  const spacing =
    options?.spacing ?? parseSpacing(root.dataset.spacing ?? root.style.getPropertyValue("--gap"));

  syncRootAttributes(root, orientation, spacing);

  root
    .querySelectorAll<HTMLElement>('[data-slot="toggle-group-item"]')
    .forEach((item) => syncItemAttributes(item, variant, size, spacing));

  return createBaseToggleGroup(root, {
    ...options,
    orientation,
  });
}
