/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImageResponse } from "@vercel/og";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const LARGE_SCREENSHOT_THRESHOLD = 420;
const PREVIEW_TOP_PADDING = 32;
const TWITTER_FOOTER_HEIGHT = 116;

export default {
  async fetch(req: Request) {
    const requestUrl = new URL(req.url);
    const searchParams = requestUrl.searchParams;
    const url = searchParams.get("url");
    const title = searchParams.get("title") ?? "Component";
    const siteTitle = searchParams.get("siteTitle") ?? "bejamas/ui";
    const showTwitterFooter = searchParams.get("x") === "1";

    if (!url) {
      return new Response("Missing `url` query param", { status: 400 });
    }

    // Base of this og-service deployment (e.g. https://bejamas-ui-og.vercel.app)
    const base = requestUrl.origin;

    // This is what Satori will load as <img>. It hits the Node function above.
    const screenshotUrl = `${base}/api/screenshot?url=${encodeURIComponent(url)}`;
    const screenshotResponse = await fetch(screenshotUrl);

    if (!screenshotResponse.ok) {
      return new Response("Failed to capture screenshot", {
        status: screenshotResponse.status,
      });
    }

    const screenshotBuffer = await screenshotResponse.arrayBuffer();
    const screenshotSrc = `data:image/png;base64,${arrayBufferToBase64(screenshotBuffer)}`;
    const dimensions = getPngDimensions(screenshotBuffer);

    const originalWidth = dimensions?.width ?? OG_WIDTH;
    const originalHeight = dimensions?.height ?? OG_HEIGHT;

    const displayWidth = Math.max(originalWidth, 1);
    const displayHeight = Math.max(originalHeight, 1);
    const isLargeScreenshot = displayHeight >= LARGE_SCREENSHOT_THRESHOLD;
    const previewBorderRadius = showTwitterFooter ? "24px 24px 0 0" : 24;

    return new ImageResponse(
      (
        <div
          style={{
            width: OG_WIDTH,
            height: OG_HEIGHT,
            display: "flex",
            flexDirection: "column",
            background: "#f4f5f8",
            color: "#000",
            padding: "56px 56px 0 56px",
            boxSizing: "border-box",
            fontFamily: "Inter",
          }}
        >
          {/* Top bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 48,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 48, fontWeight: 500, color: "#000" }}>
                {title}
              </div>
            </div>

            {/* Simple pill / badge */}
            <div
              style={{
                padding: "8px 20px 10px",
                borderRadius: 999,
                border: "2px solid rgb(219, 230, 242)",
                fontSize: 24,
              }}
            >
              {siteTitle}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              borderRadius: previewBorderRadius,
              boxSizing: "border-box",
              display: "flex",
              border: "2px solid rgb(219, 230, 242)",
              overflow: "hidden",
              paddingTop: isLargeScreenshot ? (showTwitterFooter ? PREVIEW_TOP_PADDING / 2 : PREVIEW_TOP_PADDING) : 0,
              paddingBottom: showTwitterFooter ? TWITTER_FOOTER_HEIGHT / 2 : 0,
              backgroundColor: "#fff",
              alignItems: isLargeScreenshot ? "flex-start" : "center",
              justifyContent: "center",
            }}
          >
            <img
              src={screenshotSrc}
              alt={title}
              style={{
                width: displayWidth,
                height: displayHeight,
                objectFit: "contain",
                imageRendering: "auto",
                maxWidth: "80%"
              }}
            />
       
          </div>
          <div
            style={{
              width: "100%",
              height: 100,
              background: "linear-gradient(to top, #f4f5f8, rgba(255, 255, 255, 0))",
              position: "absolute",
              bottom: showTwitterFooter ? TWITTER_FOOTER_HEIGHT : 0,
              left: 0,
              right: 0,
              zIndex: 1000,
            }} 
          />
          {showTwitterFooter ? (
            <div
              style={{
                width: "100%",
                height: TWITTER_FOOTER_HEIGHT,
                borderTop: "2px solid rgb(219, 230, 242)",
                backgroundColor: "#f4f5f8",
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
              }}
            />
          ) : null}
        </div>
      ),
      {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        fonts: [
          {
            name: 'Inter',
            data: await loadGoogleFont('Inter', title + ' ' + siteTitle),
            style: 'normal',
          },
        ],
      },
    );
  },
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

type Dimensions = {
  width: number;
  height: number;
};

function getPngDimensions(buffer: ArrayBuffer): Dimensions | null {
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

async function loadGoogleFont (font: string, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${font}:wght@500&text=${encodeURIComponent(text)}`
  const css = await (await fetch(url)).text()
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/)
 
  if (resource) {
    const response = await fetch(resource[1])
    if (response.status == 200) {
      return await response.arrayBuffer()
    }
  }
 
  throw new Error('failed to load font data')
}
