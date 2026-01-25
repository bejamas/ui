import { Redis } from "@upstash/redis";
import { getSecret } from "astro:env/server";

// Lazy initialization to avoid errors when env vars are not set
let redisClient: Redis | null = null;

export function getRedis(): Redis | null {
  if (redisClient) return redisClient;

  const url = getSecret("UPSTASH_REDIS_REST_URL");
  const token = getSecret("UPSTASH_REDIS_REST_TOKEN");

  if (!url || !token) {
    console.warn(
      "Redis not configured: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing",
    );
    return null;
  }

  redisClient = new Redis({
    url,
    token,
  });

  return redisClient;
}

// Theme key prefix
export const THEME_KEY_PREFIX = "theme:";

// Default TTL: 30 days in seconds
export const DEFAULT_THEME_TTL = 30 * 24 * 60 * 60;

// Shared theme data structure
export interface SharedTheme {
  id: string;
  name: string;
  styles: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  createdAt: string;
  sharedAt: string;
  views?: number;
}

/**
 * Get a shared theme from Redis
 */
export async function getSharedTheme(
  shortId: string,
): Promise<SharedTheme | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const theme = await redis.get<SharedTheme>(`${THEME_KEY_PREFIX}${shortId}`);

    if (theme) {
      // Extend TTL on access (sliding expiration)
      await redis.expire(`${THEME_KEY_PREFIX}${shortId}`, DEFAULT_THEME_TTL);

      // Increment view count
      await redis.hincrby(`${THEME_KEY_PREFIX}${shortId}:stats`, "views", 1);
    }

    return theme;
  } catch (error) {
    console.error("Failed to get shared theme:", error);
    return null;
  }
}

/**
 * Save a theme to Redis and return its short ID
 */
export async function saveSharedTheme(
  theme: Omit<SharedTheme, "sharedAt" | "views">,
  shortId: string,
): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const sharedTheme: SharedTheme = {
      ...theme,
      sharedAt: new Date().toISOString(),
      views: 0,
    };

    await redis.set(`${THEME_KEY_PREFIX}${shortId}`, sharedTheme, {
      ex: DEFAULT_THEME_TTL,
    });

    return shortId;
  } catch (error) {
    console.error("Failed to save shared theme:", error);
    return null;
  }
}

/**
 * Check if a theme with the given short ID exists
 */
export async function themeExists(shortId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    const exists = await redis.exists(`${THEME_KEY_PREFIX}${shortId}`);
    return exists === 1;
  } catch (error) {
    console.error("Failed to check theme existence:", error);
    return false;
  }
}

// Custom theme data structure (stored with full custom-* ID)
export interface CustomTheme {
  id: string;
  name: string;
  styles: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  createdAt: string;
  modifiedAt: string;
}

/**
 * Get a custom theme from Redis by its full ID (e.g., "custom-1234567890-abc123")
 */
export async function getCustomTheme(
  customId: string,
): Promise<CustomTheme | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const theme = await redis.get<CustomTheme>(
      `${THEME_KEY_PREFIX}${customId}`,
    );

    if (theme) {
      // Extend TTL on access (sliding expiration)
      await redis.expire(`${THEME_KEY_PREFIX}${customId}`, DEFAULT_THEME_TTL);
    }

    return theme;
  } catch (error) {
    console.error("Failed to get custom theme:", error);
    return null;
  }
}

/**
 * Save a custom theme to Redis with its full ID
 */
export async function saveCustomThemeToRedis(
  theme: CustomTheme,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    await redis.set(`${THEME_KEY_PREFIX}${theme.id}`, theme, {
      ex: DEFAULT_THEME_TTL,
    });
    return true;
  } catch (error) {
    console.error("Failed to save custom theme:", error);
    return false;
  }
}

/**
 * Delete a custom theme from Redis
 */
export async function deleteCustomThemeFromRedis(
  customId: string,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    await redis.del(`${THEME_KEY_PREFIX}${customId}`);
    return true;
  } catch (error) {
    console.error("Failed to delete custom theme:", error);
    return false;
  }
}
