/** API entrypoint: start Fastify + in-process workers. */
import { config } from "./config.js";
import { buildServer } from "./server.js";
import { initRedis, isRedisAvailable } from "./queue.js";
import { startInvoicePoller } from "./workers/invoicePoller.js";
import { startWebhookWorker } from "./workers/webhookWorker.js";

async function main(): Promise<void> {
  const app = await buildServer();

  // Probe Redis once; fall back to inline webhook delivery if unavailable.
  await initRedis();
  app.log.info(
    { redis: isRedisAvailable() },
    isRedisAvailable()
      ? "Redis connected — using BullMQ webhook queue"
      : "Redis unavailable — using inline webhook delivery"
  );

  // In-process background workers (single-command demo).
  const stopPoller = startInvoicePoller(app.log);
  const worker = startWebhookWorker(app.log);

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutting down");
    stopPoller();
    await worker?.close().catch(() => undefined);
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port: config.port, host: "0.0.0.0" });
  app.log.info(
    { mode: config.FIBER_MODE, port: config.port },
    `FiberPayKit API listening in ${config.FIBER_MODE} mode`
  );
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
