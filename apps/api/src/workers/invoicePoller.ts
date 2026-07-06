/**
 * Invoice status poller.
 *
 * On an interval it:
 *   1. finds open, non-expired invoices,
 *   2. asks the Fiber node (mock or RPC) for each invoice's status,
 *   3. normalizes and applies status transitions (which emit webhook events),
 *   4. marks past-expiry open invoices as expired,
 *   5. (when Redis is absent) sweeps due webhook retries.
 */
import { config } from "../config.js";
import { prisma } from "../db.js";
import { getFiberClient } from "../fiber/fiberClient.js";
import { normalizeFiberStatus } from "../fiber/types.js";
import { transitionInvoice } from "../services/invoiceService.js";
import { sweepDueDeliveries } from "../services/webhookService.js";
import { isRedisAvailable } from "../queue.js";

let timer: NodeJS.Timeout | null = null;
let running = false;

export async function pollOnce(log?: {
  info: (o: unknown, m?: string) => void;
  error: (o: unknown, m?: string) => void;
}): Promise<void> {
  const fiber = getFiberClient();
  const now = new Date();

  const openInvoices = await prisma.invoice.findMany({
    where: { status: "open" },
    take: 200,
  });

  for (const invoice of openInvoices) {
    try {
      // Expire first if past expiry.
      if (invoice.expiresAt.getTime() < now.getTime()) {
        await transitionInvoice(invoice.id, "expired", {
          reason: "expired_by_poller",
        });
        continue;
      }
      if (!invoice.fiberPaymentHash) continue;

      const result = await fiber.getInvoice({
        paymentHash: invoice.fiberPaymentHash,
        invoiceAddress: invoice.fiberInvoiceAddress ?? undefined,
      });
      const internal = normalizeFiberStatus(result.status);
      if (internal !== "open" && internal !== invoice.status) {
        await transitionInvoice(invoice.id, internal, {
          reason: "poller_status_change",
          rawFiberStatus: result.raw,
        });
      }
    } catch (e) {
      log?.error(
        { invoiceId: invoice.id, err: (e as Error).message },
        "invoice poll failed"
      );
    }
  }

  // If BullMQ/Redis isn't available, drive webhook retries from here.
  if (!isRedisAvailable()) {
    await sweepDueDeliveries().catch(() => undefined);
  }
}

export function startInvoicePoller(log: {
  info: (o: unknown, m?: string) => void;
  error: (o: unknown, m?: string) => void;
}): () => void {
  const interval = config.INVOICE_POLL_INTERVAL_MS;
  log.info({ interval }, "starting invoice poller");

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await pollOnce(log);
    } catch (e) {
      log.error({ err: (e as Error).message }, "poller tick failed");
    } finally {
      running = false;
    }
  };

  timer = setInterval(tick, interval);
  // Kick off an immediate first pass.
  void tick();

  return () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
}
