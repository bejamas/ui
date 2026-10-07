export interface PageOptions {
  title?: string;
  buttonPadding?: number;
  /** Wrap sections the way island frameworks add wrappers. */
  wrapSections?: boolean;
  missingAlt?: boolean;
  extraText?: string;
}

export function renderPage({
  title = "Acme",
  buttonPadding = 16,
  wrapSections = false,
  missingAlt = false,
  extraText = "",
}: PageOptions = {}) {
  const section = (content: string) =>
    wrapSections ? `<div class="island">${content}</div>` : content;
  const image =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="teal"/></svg>';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="A fixture page">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header data-slot="header"><strong>Acme</strong></header>
  <main>
    ${section(`<section><h1>Ship faster</h1><p>Static pages with small scripts.${extraText}</p>
      <button data-slot="button" type="button">Get started</button>
      <img src='${image}' ${missingAlt ? "" : 'alt="Logo"'} width="40" height="40"></section>`)}
    ${section(`<section><h2>Pricing</h2><div data-slot="card"><p>Pro plan</p></div></section>`)}
  </main>
  <footer data-slot="footer">© Acme</footer>
  <script type="module" src="/app.js"></script>
</body>
</html>
<!-- padding:${buttonPadding} -->`;
}

export function renderStyles(buttonPadding = 16) {
  return `body{margin:0;font:16px/1.5 system-ui,sans-serif}header,footer{padding:16px;background:#eee}
section{padding:32px 16px}[data-slot=button]{padding:8px ${buttonPadding}px;border:1px solid #333;background:#fff}
[data-slot=card]{border:1px solid #ccc;padding:16px;border-radius:8px}`;
}

export function serve(options: PageOptions = {}) {
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch(request) {
      const { pathname } = new URL(request.url);
      if (pathname === "/")
        return new Response(renderPage(options), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      if (pathname === "/styles.css")
        return new Response(renderStyles(options.buttonPadding), {
          headers: { "content-type": "text/css" },
        });
      if (pathname === "/app.js")
        return new Response(
          "document.documentElement.dataset.ready = 'true';",
          { headers: { "content-type": "text/javascript" } },
        );
      return new Response("Not found", { status: 404 });
    },
  });
  return {
    url: `http://127.0.0.1:${server.port}/`,
    stop: () => server.stop(true),
  };
}
