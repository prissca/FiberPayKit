/**
 * BullMQ worker that processes webhook delivery jobs. Started in-process with
 * the API for the hackathon demo (a single `pnpm dev`). If Redis is not
 * available the worker simply never starts and deliveries fall back to inline
 * delivery + the poller's retry sweep.
 */
import { Worker, type ConnectionOptions } from "bullmq";
import { WEBHOOK_QUEUE_NAME, getRedisConnection, type WebhookJobData } from "../queue.js";
import { attemptDelivery } from "../services/webhookService.js";

export function startWebhookWorker(log: {
  info: (o: unknown, m?: string) => void;
  error: (o: unknown, m?: string) => void;
}): Worker | null {
  const connection = getRedisConnection();
  if (!connection) {
    log.info({}, "Redis unavailable — webhook worker not started (inline mode)");
    return null;
  }

  const worker = new Worker<WebhookJobData>(
    WEBHOOK_QUEUE_NAME,
    async (job) => {
      const ok = await attemptDelivery(job.data.deliveryId);
      if (!ok) {
        // Throwing lets BullMQ record the failure; our service already
        // scheduled the delayed retry job, so we don't rely on BullMQ attempts.
        return { delivered: false };
      }
      return { delivered: true };
    },
    { connection: connection as unknown as ConnectionOptions, concurrency: 5 }
  );

  worker.on("failed", (job, err) => {
    log.error(
      { jobId: job?.id, err: err.message },
      "webhook delivery job failed"
    );
  });

  log.info({}, "webhook worker started");
  return worker;
}
