/**
 * BullMQ queue setup for webhook delivery.
 *
 * The queue is optional: if Redis is unreachable we fall back to inline
 * delivery so the demo still works on a machine without Redis. This keeps the
 * hackathon setup friction low while preserving the real retry/backoff design.
 *
 * `initRedis()` probes the connection once at startup. Everything downstream
 * (queue, worker, emit path) checks `isRedisAvailable()` so a missing Redis
 * never breaks the demo — it just switches to inline delivery + poller sweeps.
 */
import { Queue, type ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";
import { config } from "./config.js";

// BullMQ disallows ":" in queue names.
export const WEBHOOK_QUEUE_NAME = "fiberpaykit-webhook-delivery";

/** Exponential backoff schedule (ms) per the spec:
 * attempt 1 immediately, 2 after 30s, 3 after 2m, 4 after 10m, 5 after 30m. */
export const RETRY_DELAYS_MS = [0, 30_000, 120_000, 600_000, 1_800_000];

export function delayForAttempt(attempt: number): number {
  // attempt is 1-based; index 0 is the first (immediate) attempt.
  return (
    RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!
  );
}

let connection: Redis | null = null;
let webhookQueue: Queue | null = null;
let redisAvailable = false;

/**
 * Probe Redis once at startup. Returns true if reachable. On failure we quietly
 * fall back to inline webhook delivery.
 */
export async function initRedis(): Promise<boolean> {
  try {
    const conn = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: (times: number) =>
        times > 3 ? null : Math.min(times * 200, 1000),
    });
    conn.on("error", () => {
      redisAvailable = false;
    });
    await conn.connect();
    await conn.ping();
    connection = conn;
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    connection = null;
    return false;
  }
}

/** The live connection (only present after a successful {@link initRedis}). */
export function getRedisConnection(): Redis | null {
  return redisAvailable ? connection : null;
}

export function getWebhookQueue(): Queue | null {
  const conn = getRedisConnection();
  if (!conn) return null;
  if (!webhookQueue) {
    webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
      connection: conn as unknown as ConnectionOptions,
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
  }
  return webhookQueue;
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export interface WebhookJobData {
  deliveryId: string;
}
