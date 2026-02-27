import type { APIRoute } from "astro";
import {
  generatePaletteWithProgress,
  type ProgressEvent,
} from "../../../lib/ai/palette-agent";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { prompt, images } = body as {
      prompt: string;
      images?: { data: string; mediaType: string }[];
    };

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a streaming response using Server-Sent Events
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: ProgressEvent) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        try {
          await generatePaletteWithProgress({ prompt, images }, (event) => {
            send(event);
          });
        } catch (error) {
          console.error("Palette generation error:", error);
          const message =
            error instanceof Error
              ? error.message
              : "Failed to generate palette";
          send({ type: "error", message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Request parsing error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to parse request";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
