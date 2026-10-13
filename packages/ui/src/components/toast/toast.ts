// Generated from bejamas-juno style registry. Do not edit packages/ui/src/components/toast/toast.ts directly.
import {
  createToast,
  type ToastController,
  type ToastPromiseHandle,
  type ToastPromiseOptions,
  type ToastShowOptions,
  type ToastUpdateOptions,
} from "@data-slot/toast";

export type ToastOptions = Omit<ToastShowOptions, "title">;

const toasters = new Map<HTMLElement, ToastController>();

export function initializeToasts() {
  document
    .querySelectorAll<HTMLElement>('[data-slot="toast"]')
    .forEach((root) => {
      if (!toasters.has(root)) toasters.set(root, createToast(root));
    });
}

/** The controller for the first `<Toast />` on the page. */
export function getToaster() {
  const root = document.querySelector<HTMLElement>('[data-slot="toast"]');
  if (!root) {
    console.warn("[toast] Render <Toast /> on the page before calling toast().");
    return null;
  }
  initializeToasts();
  return toasters.get(root) ?? null;
}

function show(title: string, options: ToastOptions = {}) {
  return getToaster()?.show({ ...options, title });
}

function withType(type: NonNullable<ToastOptions["type"]>) {
  return (title: string, options: Omit<ToastOptions, "type"> = {}) =>
    show(title, { ...options, type });
}

/**
 * Show a toast in the page's `<Toast />` region and return its id.
 *
 * ```ts
 * toast("Event created", { description: "Sunday, December 03 at 9:00 AM" });
 * toast.success("Profile saved");
 * toast.promise(save(), { loading: "Saving…", success: "Saved", error: "Failed" });
 * ```
 */
export const toast = Object.assign(show, {
  success: withType("success"),
  error: withType("error"),
  warning: withType("warning"),
  info: withType("info"),
  loading: withType("loading"),
  promise<T>(
    input: Promise<T> | (() => Promise<T>),
    options: ToastPromiseOptions<T>,
  ): ToastPromiseHandle<T> | undefined {
    return getToaster()?.promise(input, options);
  },
  update(id: string, patch: ToastUpdateOptions) {
    getToaster()?.update(id, patch);
  },
  /** Dismiss one toast, or every toast when `id` is omitted. */
  dismiss(id?: string) {
    const toaster = getToaster();
    if (id === undefined) toaster?.dismissAll();
    else toaster?.dismiss(id);
  },
});

// `<Button data-slot="toast-trigger" data-toast-title="Saved">` shows a toast
// on click without a client script.
function handleTriggerClick(event: MouseEvent) {
  if (!(event.target instanceof Element)) return;
  const trigger = event.target.closest<HTMLElement>(
    '[data-slot="toast-trigger"]',
  );
  const { toastTitle, toastDescription, toastType, toastDuration } =
    trigger?.dataset ?? {};
  if (!toastTitle) return;
  show(toastTitle, {
    description: toastDescription,
    type: toastType as ToastOptions["type"],
    duration: toastDuration === undefined ? undefined : Number(toastDuration),
  });
}

document.addEventListener("click", handleTriggerClick);
document.addEventListener("astro:page-load", initializeToasts);
document.addEventListener("astro:before-swap", () => {
  toasters.forEach((toaster) => toaster.destroy());
  toasters.clear();
});
