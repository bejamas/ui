export type Dimensions = {
  width: number;
  height: number;
};

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function getPngDimensions(buffer: ArrayBuffer): Dimensions | null {
  const signature = new Uint8Array(buffer.slice(0, 8));
  const pngMagic = [137, 80, 78, 71, 13, 10, 26, 10];

  for (let i = 0; i < pngMagic.length; i += 1) {
    if (signature[i] !== pngMagic[i]) {
      return null;
    }
  }

  const view = new DataView(buffer);

  try {
    const width = view.getUint32(16);
    const height = view.getUint32(20);

    if (Number.isNaN(width) || Number.isNaN(height) || width === 0 || height === 0) {
      return null;
    }

    return { width, height };
  } catch {
    return null;
  }
}

