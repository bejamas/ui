interface Env {
  UPSTREAM_ORIGIN: string;
}

function createUpstreamUrl(requestUrl: URL, upstreamOrigin: URL): URL {
  const upstreamUrl = new URL(upstreamOrigin);
  upstreamUrl.pathname = requestUrl.pathname;
  upstreamUrl.search = requestUrl.search;
  upstreamUrl.hash = "";
  return upstreamUrl;
}

function rewriteLocation(
  location: string,
  upstreamOrigin: URL,
  publicOrigin: URL,
): string {
  try {
    const redirectUrl = new URL(location, upstreamOrigin);

    if (redirectUrl.origin !== upstreamOrigin.origin) {
      return location;
    }

    redirectUrl.protocol = publicOrigin.protocol;
    redirectUrl.host = publicOrigin.host;
    return redirectUrl.toString();
  } catch {
    return location;
  }
}

export async function handleRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const publicUrl = new URL(request.url);
  const upstreamOrigin = new URL(env.UPSTREAM_ORIGIN);
  const upstreamUrl = createUpstreamUrl(publicUrl, upstreamOrigin);
  const headers = new Headers(request.headers);

  headers.set("X-Forwarded-Host", publicUrl.host);
  headers.set("X-Forwarded-Proto", publicUrl.protocol.slice(0, -1));

  const upstreamRequest = new Request(upstreamUrl, request);

  try {
    const upstreamResponse = await fetch(
      new Request(upstreamRequest, {
        headers,
        redirect: "manual",
      }),
    );
    const responseHeaders = new Headers(upstreamResponse.headers);
    const location = responseHeaders.get("Location");

    if (
      !publicUrl.hostname.endsWith(".workers.dev") &&
      responseHeaders.get("X-Robots-Tag")?.toLowerCase() === "noindex"
    ) {
      responseHeaders.delete("X-Robots-Tag");
    }

    if (location) {
      responseHeaders.set(
        "Location",
        rewriteLocation(location, upstreamOrigin, publicUrl),
      );
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "Bridge upstream request failed",
        upstream: upstreamOrigin.host,
        error: error instanceof Error ? error.message : String(error),
      }),
    );

    return new Response("Upstream unavailable", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
