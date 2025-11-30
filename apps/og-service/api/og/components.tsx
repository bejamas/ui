/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImageResponse } from "@vercel/og";
import { buildCacheHeaders } from "../../lib/cache";
import { loadGoogleFont } from "../../lib/fonts";
import { arrayBufferToBase64, getPngDimensions } from "../../lib/png";
import { decodeQueryValue } from "../../lib/query";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const LARGE_SCREENSHOT_THRESHOLD = 420;
const PREVIEW_TOP_PADDING = 32;
const TWITTER_FOOTER_HEIGHT = 116;

export default {
  async fetch(req: Request) {
    const requestUrl = new URL(req.url);
    const searchParams = requestUrl.searchParams;
    const url = decodeQueryValue(searchParams.get("url"));
    const title = decodeQueryValue(searchParams.get("title")) ?? "Component";
    const siteTitle =
      decodeQueryValue(searchParams.get("siteTitle")) ?? "bejamas/ui";
    const showTwitterFooter = searchParams.get("x") === "1";
    const buildTime = decodeQueryValue(searchParams.get("buildTime"));
    const isFreshRequest = searchParams.has("fresh");

    if (!url) {
      return new Response("Missing `url` query param", { status: 400 });
    }

    // Base of this og-service deployment (e.g. https://bejamas-ui-og.vercel.app)
    const base = requestUrl.origin;

    // This is what Satori will load as <img>. It hits the Node function above.
    const screenshotUrl = new URL(`${base}/api/screenshot`);
    screenshotUrl.searchParams.set("url", url);
    if (buildTime) {
      screenshotUrl.searchParams.set("buildTime", buildTime);
    }
    if (isFreshRequest) {
      screenshotUrl.searchParams.set("fresh", "1");
    }

    const screenshotFetchOptions: RequestInit | undefined = isFreshRequest
      ? { cache: "no-store" }
      : undefined;
    const screenshotResponse = await fetch(
      screenshotUrl.toString(),
      screenshotFetchOptions,
    );

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

    const fontText = `${title} ${siteTitle}`;
    const [interRegular, interMedium] = await Promise.all([
      loadGoogleFont("Inter", fontText, 400),
      loadGoogleFont("Inter", fontText, 500),
    ]);

    const response = new ImageResponse(
      (
        <div
          style={{
            width: OG_WIDTH,
            height: OG_HEIGHT,
            display: "flex",
            flexDirection: "column",
            background: "#f4f5f8",
            color: "#051729",
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
              <div style={{ fontSize: 48, fontWeight: 500, color: "#051729" }}>
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
            name: "Inter",
            data: interRegular,
            style: "normal",
            weight: 400,
          },
          {
            name: "Inter",
            data: interMedium,
            style: "normal",
            weight: 500,
          },
        ],
      },
    );

    const cacheHeaders = buildCacheHeaders(buildTime, isFreshRequest);
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  },
};
