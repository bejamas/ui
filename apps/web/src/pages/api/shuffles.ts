import type { APIRoute } from "astro";
import { incrementShuffleCount } from "../../lib/redis";

export const prerender = false;

export const POST: APIRoute = async () => {
  const count = await incrementShuffleCount();

  return new Response(JSON.stringify({ count }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
