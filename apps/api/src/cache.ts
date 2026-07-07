/**
 * Tiny Redis-backed cache for read-heavy endpoints.
 *
 * Reuses the same ioredis connection as the BullMQ queue (see queue.ts). Every
 * function degrades gracefully: if Redis is unavailable or errors, reads fall
 * through to the source of truth and writes are skipped. A cache problem must
 * never break or slow a request, so all Redis calls are time-boxed and wrapped.
 */
import { getRedisConnection } from "./queue.js";

const NS = "fpk:cache:";

/** GET a cached JSON value, or null on miss/unavailable/error. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisConnection();
  if (!redis) return null;
  try {
    const raw = await redis.get(NS + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** SET a JSON value with a TTL (seconds). No-op if Redis is unavailable. */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedisConnection();
  if (!redis) return;
  try {
    await redis.set(NS + key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    /* ignore cache write failures */
  }
}

/** Delete one or more cache keys. No-op if Redis is unavailable. */
export async function cacheDel(...keys: string[]): Promise<void> {
  const redis = getRedisConnection();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys.map((k) => NS + k));
  } catch {
    /* ignore */
  }
}

/**
 * Read-through cache: return the cached value for `key`, or compute it with
 * `producer`, store it with `ttlSeconds`, and return it. Falls straight through
 * to `producer` when Redis is unavailable.
 */
export async function cacheWrap<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await producer();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

// ---- Key builders (single source of truth so invalidation stays in sync) ----
export const cacheKeys = {
  dashboardSummary: (merchantId: string) => `dash:summary:${merchantId}`,
  nodeInfo: () => `fiber:nodeinfo`,
  invoiceList: (merchantId: string, qs: string) => `inv:list:${merchantId}:${qs}`,
};
