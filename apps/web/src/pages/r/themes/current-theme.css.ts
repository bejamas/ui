import { getCollection, getEntry } from "astro:content";
import { applyThemeToCss } from "../../../utils/themes/apply-theme";

export const prerender = false;

const parseCookies = (request: Request) => {
  const cookies = request.headers.get("Cookie");
  if (!cookies) return {};
  return cookies.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.split("=");
    acc[key.trim()] = value.trim();
    return acc;
  }, {});
};

export async function GET({
  request,
  params,
}: {
  request: Request;
  params: { slug: string };
}) {
  try {
    const cookies = parseCookies(request);
    const currentTheme = cookies.theme;

    if (!currentTheme) {
      return new Response("No theme found", {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const entry = await getEntry("themes", currentTheme);
    if (!entry) {
      return new Response("Not found", {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const generated = applyThemeToCss({
      currentMode: entry.data.mode,
      styles: entry.data.styles,
    });

    const registryItem = generated;
    return new Response(
      `/* ${currentTheme} */\n/* dynamically generated at ${new Date().toISOString()} */\n${registryItem}`,
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "s-maxage=3600",
          Vary: "Cookie",
          "Content-Type": "text/css",
        },
      },
    );
  } catch (e) {
    console.error("Error fetching the theme registry item:", e);
    return new Response("Failed to fetch the theme registry item.", {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
