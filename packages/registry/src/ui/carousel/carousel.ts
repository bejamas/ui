import { createCarousel, type CarouselController } from "@data-slot/carousel";

const carousels = new Map<HTMLElement, CarouselController>();

export function initializeCarousels() {
  document
    .querySelectorAll<HTMLElement>('[data-slot="carousel"]')
    .forEach((root) => {
      if (carousels.has(root)) return;
      const content = Array.from(
        root.querySelectorAll<HTMLElement>('[data-slot="carousel-content"]'),
      ).find((part) => part.closest('[data-slot="carousel"]') === root);
      if (!content?.querySelector(':scope > [data-slot="carousel-item"]'))
        return;
      const counter = root.querySelector<HTMLElement>(
        ':scope > [data-slot="carousel-counter"]',
      );
      const updateCounter = () => {
        const carousel = carousels.get(root);
        if (counter && carousel) {
          counter.textContent = carousel.count
            ? `${root.dataset.counterLabel} ${carousel.index + 1} of ${carousel.count}`
            : "";
        }
      };
      const carousel = createCarousel(root, { onIndexChange: updateCounter });
      carousels.set(root, carousel);
      updateCounter();
    });
}

document.addEventListener("astro:page-load", initializeCarousels);
document.addEventListener("astro:before-swap", () => {
  carousels.forEach((carousel) => carousel.destroy());
  carousels.clear();
});
