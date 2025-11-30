/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImageResponse } from "@vercel/og";
import { buildCacheHeaders } from "../../lib/cache";
import { loadGoogleFont } from "../../lib/fonts";
import { decodeQueryValue } from "../../lib/query";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const TWITTER_FOOTER_HEIGHT = 116;

const DEFAULT_TITLE = "bejamas/ui";
const DEFAULT_DESCRIPTION = "Modern component blueprints for Astro.";
const DEFAULT_SITE_TITLE = "bejamas/ui";

const BejamasUiBgSvg = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1200"
    height="630"
    fill="none"
    viewBox="0 0 1200 630"
    {...props}
  >
    <g clipPath="url(#clip0_2572_3087)">
      <g fill="#051729" fillOpacity="0.04" clipPath="url(#clip1_2572_3087)">
        <path d="m1068.13 394.459-5.98 25.854-65.116 278.819h102.156l71.19-304.673zM1142.99 343.36c28.15 0 50.98-22.793 50.98-50.911s-22.83-50.911-50.98-50.911c-28.16 0-50.98 22.793-50.98 50.911s22.82 50.911 50.98 50.911M907.103 190.421h-337.44v199.271C544.173 266.888 435.344 174.71 304.809 174.71c-85.43 0-161.601 39.576-211.087 101.326L178.854-88H60.068l-184.203 787.137H-5.349l46-196.486C67.238 623.963 175.37 714.848 304.81 714.848s239.364-92.277 264.854-214.981v26.649c0 121.014 74.976 190.42 205.61 190.42s205.611-69.406 205.611-190.42V190.421z"></path>
      </g>
    </g>
    <defs>
      <clipPath id="clip0_2572_3087">
        <path fill="#fff" d="M0 0h1200v630H0z"></path>
      </clipPath>
      <clipPath id="clip1_2572_3087">
        <path fill="#fff" d="M-124.135-88h1324.27v805.433h-1324.27z"></path>
      </clipPath>
    </defs>
  </svg>
);

export default {
  async fetch(req: Request) {
    const { searchParams } = new URL(req.url);
    const title = decodeQueryValue(searchParams.get("title")) ?? DEFAULT_TITLE;
    const description =
      decodeQueryValue(searchParams.get("description")) ??
      DEFAULT_DESCRIPTION;
    const siteTitle =
      decodeQueryValue(searchParams.get("siteTitle")) ??
      DEFAULT_SITE_TITLE;
    const isFreshRequest = searchParams.has("fresh");
    const showTwitterFooter = searchParams.get("x") === "1";

    const fontText = `${title} ${description} ${siteTitle}`;
    const [interRegular, interMedium] = await Promise.all([
      loadGoogleFont("Inter", fontText, 400),
      loadGoogleFont("Inter", fontText, 600),
    ]);

    const response = new ImageResponse(
      (
        <div
          style={{
            width: OG_WIDTH,
            height: OG_HEIGHT,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: "#F3F5F8",
            color: "#0f172a",
            padding: showTwitterFooter
              ? "48px 128px 116px 128px"
              : "96px 128px",
            boxSizing: "border-box",
            fontFamily: "Inter",
            // position: "relative",
            overflow: "hidden",
            gap: 32,
            textWrap: "balance",
          }}
        >
          {/* Background shapes */}
          <BejamasUiBgSvg style={{ opacity: 0.04, position: "absolute", left: 0, top: 0, bottom: 0, inset: 0, overflow: "hidden", zIndex: 0, objectFit: "cover" }} />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 32,
              maxWidth: 760,
            }}
          >
            <div
              style={{
                fontSize: 78,
                fontWeight: 500,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                textWrap: "balance",
              }}
            >
              {title}
            </div>

            <div
              style={{
                fontSize: 32,
                fontWeight: 400,
                color: "#475569",
                lineHeight: 1.4,
                textWrap: "balance",
              }}
            >
              {description}
            </div>
          </div>
          {showTwitterFooter ? (
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
          ) : null}
          {showTwitterFooter ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: TWITTER_FOOTER_HEIGHT,
                borderTop: "2px solid rgba(15, 23, 42, 0.08)",
                background: "#f4f5f8",
                zIndex: 1,
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

    const cacheHeaders = buildCacheHeaders(null, isFreshRequest);
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  },
};

