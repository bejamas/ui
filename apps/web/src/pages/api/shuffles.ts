import type { APIRoute } from "astro";
import { getShuffleCount, incrementShuffleCount } from "../../lib/redis";

export const prerender = false;

export const GET: APIRoute = async () => {
  const count = await getShuffleCount();

  return new Response(JSON.stringify({ count }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
    },
  });
};

export const POST: APIRoute = async () => {
  const count = await incrementShuffleCount();

  return new Response(JSON.stringify({ count }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};
