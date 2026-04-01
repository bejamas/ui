// Generated from packages/registry/src/lib. Do not edit packages/ui/src/lib/select.ts directly.
import {
  createSelect as createBaseSelect,
  type SelectController,
  type SelectOptions,
} from "@data-slot/select";

const SCROLL_STEP = 24;
const CONTINUOUS_SCROLL_DELAY = 80;

function findPart<T extends Element>(root: ParentNode, slot: string): T | null {
  return root.querySelector<T>(`[data-slot="${slot}"]`);
}

function toggleHidden(element: HTMLElement, hidden: boolean) {
  if (hidden) {
    element.setAttribute("hidden", "");
    return;
  }

  element.removeAttribute("hidden");
}

function setScrollButtonState(
  element: HTMLElement | null,
  enabled: boolean,
) {
  if (!element) {
    return;
  }

  toggleHidden(element, !enabled);

  if (enabled) {
    element.removeAttribute("data-disabled");
    return;
  }

  element.setAttribute("data-disabled", "");
}

export function createSelect(
  root: Element,
  options?: SelectOptions,
): SelectController {
  const controller = createBaseSelect(root, options);
  const trigger = findPart<HTMLElement>(root, "select-trigger");
  const content = findPart<HTMLElement>(root, "select-content");
  const viewport =
    findPart<HTMLElement>(content ?? root, "select-viewport") ?? content;
  const scrollUpButton = findPart<HTMLElement>(
    content ?? root,
    "select-scroll-up-button",
  );
  const scrollDownButton = findPart<HTMLElement>(
    content ?? root,
    "select-scroll-down-button",
  );

  if (!trigger || !content || !viewport) {
    return controller;
  }

  let scrollTimer: number | null = null;
  let animationFrame = 0;

  const stopContinuousScroll = () => {
    if (scrollTimer !== null) {
      window.clearInterval(scrollTimer);
      scrollTimer = null;
    }
  };

  const scrollViewport = (delta: number) => {
    viewport.scrollBy({ top: delta, behavior: "auto" });
  };

  const startContinuousScroll = (delta: number) => {
    stopContinuousScroll();
    scrollViewport(delta);
    scrollTimer = window.setInterval(() => {
      scrollViewport(delta);
    }, CONTINUOUS_SCROLL_DELAY);
  };

  const updateSizeVars = () => {
    const rect = trigger.getBoundingClientRect();
    const availableHeight = Math.max(window.innerHeight - 16, rect.height);

    content.style.setProperty("--select-trigger-width", `${rect.width}px`);
    content.style.setProperty("--select-trigger-height", `${rect.height}px`);
    content.style.setProperty(
      "--select-content-available-height",
      `${availableHeight}px`,
    );
  };

  const updateScrollButtons = () => {
    const isOpen =
      content.dataset.state === "open" || content.hasAttribute("data-open");
    const hasOverflow = viewport.scrollHeight - viewport.clientHeight > 1;
    const canScrollUp = hasOverflow && viewport.scrollTop > 1;
    const canScrollDown =
      hasOverflow &&
      viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - 1;

    setScrollButtonState(scrollUpButton, isOpen && canScrollUp);
    setScrollButtonState(scrollDownButton, isOpen && canScrollDown);
  };

  const scheduleUpdate = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }

    animationFrame = requestAnimationFrame(() => {
      animationFrame = 0;
      updateSizeVars();
      updateScrollButtons();
    });
  };

  const handleOpenChange = () => {
    scheduleUpdate();
    requestAnimationFrame(scheduleUpdate);
  };

  const attachScrollButton = (
    element: HTMLElement | null,
    delta: number,
  ) => {
    if (!element) {
      return () => {};
    }

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      startContinuousScroll(delta);
    };

    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      scrollViewport(delta);
    };

    const onPointerEnd = () => {
      stopContinuousScroll();
      scheduleUpdate();
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("click", onClick);
    element.addEventListener("pointerup", onPointerEnd);
    element.addEventListener("pointerleave", onPointerEnd);
    element.addEventListener("pointercancel", onPointerEnd);

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("click", onClick);
      element.removeEventListener("pointerup", onPointerEnd);
      element.removeEventListener("pointerleave", onPointerEnd);
      element.removeEventListener("pointercancel", onPointerEnd);
    };
  };

  const cleanupScrollUp = attachScrollButton(scrollUpButton, -SCROLL_STEP);
  const cleanupScrollDown = attachScrollButton(
    scrollDownButton,
    SCROLL_STEP,
  );

  viewport.addEventListener("scroll", updateScrollButtons);
  root.addEventListener("select:open-change", handleOpenChange);
  window.addEventListener("resize", scheduleUpdate);

  const resizeObserver = new ResizeObserver(scheduleUpdate);
  resizeObserver.observe(trigger);
  resizeObserver.observe(content);
  resizeObserver.observe(viewport);

  const mutationObserver = new MutationObserver(scheduleUpdate);
  mutationObserver.observe(content, {
    attributes: true,
    attributeFilter: ["data-state", "data-open", "data-closed", "hidden"],
    childList: true,
    subtree: true,
  });

  scheduleUpdate();

  return {
    get value() {
      return controller.value;
    },
    get isOpen() {
      return controller.isOpen;
    },
    select(value: string) {
      controller.select(value);
      scheduleUpdate();
    },
    open() {
      controller.open();
      handleOpenChange();
    },
    close() {
      controller.close();
      handleOpenChange();
    },
    destroy() {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      stopContinuousScroll();
      cleanupScrollUp();
      cleanupScrollDown();
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      viewport.removeEventListener("scroll", updateScrollButtons);
      root.removeEventListener("select:open-change", handleOpenChange);
      window.removeEventListener("resize", scheduleUpdate);
      controller.destroy();
    },
  };
}

