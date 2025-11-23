type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Clip = BoundingBox;

export async function capturePreviewScreenshot(
  page: any,
  previewHandle: any,
): Promise<Buffer> {
  const childHandles = await previewHandle.$$(":scope > *");

  if (childHandles.length === 0) {
    return (await previewHandle.screenshot({ type: "png" })) as Buffer;
  }

  try {
    const boxes = (
      await Promise.all(childHandles.map((child: any) => child.boundingBox()))
    ).filter(isUsableBoundingBox);

    if (boxes.length === 0) {
      return (await previewHandle.screenshot({ type: "png" })) as Buffer;
    }

    const viewport =
      typeof page.viewport === "function" ? page.viewport() : null;
    const clip = computeClipFromBoxes(boxes, viewport);

    return (await page.screenshot({ type: "png", clip })) as Buffer;
  } finally {
    await Promise.all(childHandles.map((child: any) => child.dispose()));
  }
}

function isUsableBoundingBox(box: BoundingBox | null): box is BoundingBox {
  return (
    box !== null &&
    Number.isFinite(box.x) &&
    Number.isFinite(box.y) &&
    Number.isFinite(box.width) &&
    Number.isFinite(box.height) &&
    box.width > 0 &&
    box.height > 0
  );
}

function computeClipFromBoxes(
  boxes: BoundingBox[],
  viewport: { width: number; height: number } | null,
  padding = 8,
): Clip {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return {
      x: 0,
      y: 0,
      width: viewport?.width ?? 1,
      height: viewport?.height ?? 1,
    };
  }

  const x = Math.max(Math.floor(minX - padding), 0);
  const y = Math.max(Math.floor(minY - padding), 0);
  const widthWithPadding = Math.ceil(maxX - minX + padding * 2);
  const heightWithPadding = Math.ceil(maxY - minY + padding * 2);

  const maxWidth = viewport ? Math.max(viewport.width - x, 1) : null;
  const maxHeight = viewport ? Math.max(viewport.height - y, 1) : null;

  const width =
    maxWidth === null
      ? Math.max(widthWithPadding, 1)
      : Math.max(Math.min(widthWithPadding, maxWidth), 1);

  const height =
    maxHeight === null
      ? Math.max(heightWithPadding, 1)
      : Math.max(Math.min(heightWithPadding, maxHeight), 1);

  return { x, y, width, height };
}

