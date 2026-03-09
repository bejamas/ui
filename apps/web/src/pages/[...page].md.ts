import {
  getMarkdownSource,
  transformMarkdown,
} from "../utils/docsMarkdown";

export function GET({ params }: { params: { page?: string } }) {
  const source = getMarkdownSource(params.page ?? "");

  if (!source) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return new Response(transformMarkdown(source), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
