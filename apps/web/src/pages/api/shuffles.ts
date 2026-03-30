import type { APIRoute } from "astro";
import { getShuffleCount, incrementShuffleCount } from "../../lib/redis";
import {
  NO_STORE_CACHE_CONTROL,
  SHORT_SHARED_CACHE_CONTROL,
} from "../../utils/http-cache";

export const prerender = false;

export const GET: APIRoute = async () => {
  const count = await getShuffleCount();

  return new Response(JSON.stringify({ count }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": SHORT_SHARED_CACHE_CONTROL,
    },
  });
};

export const POST: APIRoute = async () => {
  const count = await incrementShuffleCount();

  return new Response(JSON.stringify({ count }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": NO_STORE_CACHE_CONTROL,
    },
  });
};
