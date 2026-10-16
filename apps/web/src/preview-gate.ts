// Temporary password gate for branch previews. Revert this commit before merging.
//
// The gate is compiled in only when the build runs for PREVIEW_GATE_BRANCH on
// Workers Builds (or with PREVIEW_GATE=1 locally); every other build passes
// requests straight through.

export const PREVIEW_GATE_BRANCH = "feat/migrate-some-shadcn-blocks-to-bui";
export const PREVIEW_GATE_PATH = "/preview-access";

const PASSWORD = "bejamas";
const COOKIE_NAME = "bui_preview";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

// Requests the login page itself needs (styles, scripts, fonts, icons, and
// the stylesheet that applies the visitor's selected theme).
const PUBLIC_PREFIXES = [
  "/_astro/",
  "/_server-islands/",
  "/fonts/",
  "/r/themes/",
];
const PUBLIC_FILES = ["/favicon.svg", "/favicon.ico", "/robots.txt"];

interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const sessionToken = () => sha256(`${PASSWORD}:preview-session`);

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

function safeNext(value: FormDataEntryValue | string | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

async function loginPage(request: Request, assets: AssetsBinding) {
  const page = await assets.fetch(
    new Request(new URL(PREVIEW_GATE_PATH, request.url)),
  );
  return new Response(page.body, {
    status: 401,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

/**
 * Returns a response when the request must not reach the site (login page,
 * login form handling), or null when it may continue.
 */
export async function previewGate(
  request: Request,
  assets: AssetsBinding,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === PREVIEW_GATE_PATH && request.method === "POST") {
    const form = await request.formData();
    const next = safeNext(form.get("next"));
    const password = form.get("password");
    if (password !== PASSWORD) {
      const retry = new URL(PREVIEW_GATE_PATH, url);
      retry.searchParams.set("error", "1");
      retry.searchParams.set("next", next);
      return Response.redirect(retry.toString(), 303);
    }

    return new Response(null, {
      status: 303,
      headers: {
        location: next,
        "set-cookie": `${COOKIE_NAME}=${await sessionToken()}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  }

  if (
    PUBLIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) ||
    PUBLIC_FILES.includes(url.pathname)
  ) {
    return null;
  }

  if (readCookie(request, COOKIE_NAME) === (await sessionToken())) {
    if (url.pathname === PREVIEW_GATE_PATH) {
      return Response.redirect(
        new URL(safeNext(url.searchParams.get("next")), url).toString(),
        303,
      );
    }
    return null;
  }

  return loginPage(request, assets);
}
