import {
  createToast,
  type ToastController,
  type ToastPromiseOptions,
  type ToastShowOptions,
  type ToastUpdateOptions,
} from "@data-slot/toast";

export type ToastOptions = Omit<ToastShowOptions, "title">;

const toasters = new WeakMap<Element, ToastController>();

/** Bind a `<Toast />` root, reusing its controller when already bound. */
export function bindToaster(root: Element) {
  let toaster = toasters.get(root);
  if (!toaster) {
    toaster = createToast(root);
    toasters.set(root, toaster);
  }
  return toaster;
}

/** The controller for the first `<Toast />` on the page. */
export function getToaster() {
  const root = document.querySelector('[data-slot="toast"]');
  if (!root) {
    throw new Error("[toast] Render <Toast /> on the page before calling toast().");
  }
  return bindToaster(root);
}

function show(title: string, options: ToastOptions = {}) {
  return getToaster().show({ ...options, title });
}

function withType(
  type: NonNullable<ToastOptions["type"]>,
  defaults: ToastOptions = {},
) {
  return (title: string, options: Omit<ToastOptions, "type"> = {}) =>
    show(title, { ...defaults, ...options, type });
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
  // Loading toasts stay open until they are updated or dismissed.
  loading: withType("loading", { duration: 0 }),
  promise<T>(
    input: Promise<T> | (() => Promise<T>),
    options: ToastPromiseOptions<T>,
  ) {
    return getToaster().promise(input, options);
  },
  update(id: string, patch: ToastUpdateOptions) {
    getToaster().update(id, patch);
  },
  /** Dismiss one toast, or every toast when `id` is omitted. */
  dismiss(id?: string) {
    const toaster = getToaster();
    if (id === undefined) toaster.dismissAll();
    else toaster.dismiss(id);
  },
});
