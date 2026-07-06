/**
 * Webhook event + delivery lifecycle.
 *
 * On an invoice status change we:
 *   1. create a WebhookEvent (immutable record of what happened),
 *   2. create one WebhookDelivery per matching active endpoint,
 *   3. enqueue delivery jobs (BullMQ) or deliver inline if Redis is absent.
 *
 * Deliveries are signed with HMAC-SHA256 and retried with exponential backoff.
 */
import type { Invoice, Merchant } from "@prisma/client";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { generateId } from "../utils/ids.js";
import { buildSignatureHeader } from "../utils/hmac.js";
import {
  delayForAttempt,
  getWebhookQueue,
  type WebhookJobData,
} from "../queue.js";
import { getWebhookSecret } from "./merchantService.js";
import type { WebhookEventType } from "@fiberpaykit/shared";

/** Build the canonical webhook payload for an invoice event. */
export function buildEventPayload(
  eventId: string,
  type: WebhookEventType,
  invoice: Invoice
) {
  return {
    id: eventId,
    type,
    createdAt: new Date().toISOString(),
    data: {
      invoice: {
        id: invoice.id,
        orderId: invoice.orderId,
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        fiber: {
          paymentHash: invoice.fiberPaymentHash,
          invoiceAddress: invoice.fiberInvoiceAddress,
        },
        metadata: invoice.metadata ?? null,
      },
    },
  };
}

/**
 * Create an event + deliveries for the invoice and enqueue delivery.
 * Returns the created event id.
 */
export async function emitInvoiceEvent(
  merchant: Merchant,
  invoice: Invoice,
  type: WebhookEventType
): Promise<string> {
  const eventId = generateId("evt");
  const payload = buildEventPayload(eventId, type, invoice);

  await prisma.webhookEvent.create({
    data: {
      id: eventId,
      merchantId: merchant.id,
      invoiceId: invoice.id,
      type,
      payload,
    },
  });

  // Find endpoints subscribed to this event type.
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { merchantId: merchant.id, status: "active" },
  });
  const matching = endpoints.filter((e) =>
    (e.events as string[]).includes(type)
  );

  const queue = getWebhookQueue();

  for (const endpoint of matching) {
    const deliveryId = generateId("whd");
    await prisma.webhookDelivery.create({
      data: {
        id: deliveryId,
        eventId,
        endpointId: endpoint.id,
        status: "pending",
        attemptCount: 0,
        requestUrl: endpoint.url,
        nextAttemptAt: new Date(),
      },
    });

    if (queue) {
      await queue.add(
        "deliver",
        { deliveryId } satisfies WebhookJobData,
        { attempts: 1, jobId: deliveryId }
      );
    } else {
      // No Redis — deliver inline (fire and forget) so the demo still works.
      void attemptDelivery(deliveryId).catch(() => undefined);
    }
  }

  return eventId;
}

/**
 * Attempt a single webhook delivery. Updates the delivery record and, on
 * failure, schedules the next retry (or marks abandoned when attempts run out).
 * Returns true on success.
 */
export async function attemptDelivery(deliveryId: string): Promise<boolean> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: {
      event: { include: { merchant: true } },
      endpoint: true,
    },
  });
  if (!delivery) return false;
  if (delivery.status === "succeeded" || delivery.status === "abandoned") {
    return delivery.status === "succeeded";
  }

  const attempt = delivery.attemptCount + 1;
  const merchant = delivery.event.merchant;
  const secret = getWebhookSecret(merchant);

  const rawBody = JSON.stringify(delivery.event.payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = buildSignatureHeader(timestamp, rawBody, secret);
  const eventType = delivery.event.type;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "FiberPayKit-Webhooks/0.1",
    "FiberPayKit-Event-Id": delivery.eventId,
    "FiberPayKit-Timestamp": String(timestamp),
    "FiberPayKit-Signature": signature,
    "FiberPayKit-Event-Type": eventType,
  };

  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;
  let success = false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(delivery.endpoint.url, {
      method: "POST",
      headers,
      body: rawBody,
      signal: controller.signal,
    });
    responseStatus = res.status;
    const text = await res.text();
    responseBody = text.slice(0, 2000); // store a snippet only
    success = res.status >= 200 && res.status < 300;
    if (!success) errorMessage = `Non-2xx response: ${res.status}`;
  } catch (e) {
    errorMessage = (e as Error).message;
  } finally {
    clearTimeout(timeout);
  }

  const maxAttempts = config.WEBHOOK_MAX_ATTEMPTS;
  const exhausted = attempt >= maxAttempts;
  const nextAttemptAt =
    success || exhausted
      ? null
      : new Date(Date.now() + delayForAttempt(attempt + 1));

  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      attemptCount: attempt,
      lastAttemptAt: new Date(),
      responseStatus,
      responseBody,
      errorMessage,
      requestHeaders: redactHeaders(headers),
      requestBody: rawBody.slice(0, 4000),
      status: success ? "succeeded" : exhausted ? "abandoned" : "failed",
      nextAttemptAt,
    },
  });

  // Emit a delivery-status meta event (best effort, no recursion into deliveries
  // for meta events — they are recorded but not re-delivered).
  await recordDeliveryMetaEvent(
    merchant.id,
    delivery.event.invoiceId,
    success ? "webhook.delivery.succeeded" : "webhook.delivery.failed",
    { deliveryId, endpointId: delivery.endpointId, attempt, responseStatus }
  );

  // If failed but retries remain, re-enqueue with delay.
  if (!success && !exhausted) {
    const queue = getWebhookQueue();
    if (queue) {
      await queue.add(
        "deliver",
        { deliveryId } satisfies WebhookJobData,
        {
          delay: delayForAttempt(attempt + 1),
          attempts: 1,
          jobId: `${deliveryId}:${attempt + 1}`,
        }
      );
    }
    // Without a queue, the invoicePoller sweeps due retries (see worker).
  }

  return success;
}

async function recordDeliveryMetaEvent(
  merchantId: string,
  invoiceId: string | null,
  type: WebhookEventType,
  info: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.webhookEvent.create({
      data: {
        id: generateId("evt"),
        merchantId,
        invoiceId: invoiceId ?? undefined,
        type,
        payload: {
          id: generateId("evt"),
          type,
          createdAt: new Date().toISOString(),
          data: info,
        } as object,
      },
    });
  } catch {
    // Meta events are best-effort.
  }
}

function redactHeaders(headers: Record<string, string>) {
  // Signature is safe to store (it's a MAC, not the secret). Nothing to redact
  // here, but keep the hook in case auth headers are added later.
  return headers;
}

/** Manually retry a delivery (dashboard "Retry" button). */
export async function retryDelivery(
  merchantId: string,
  deliveryId: string
): Promise<boolean> {
  const delivery = await prisma.webhookDelivery.findFirst({
    where: { id: deliveryId, event: { merchantId } },
  });
  if (!delivery) return false;
  // Reset to pending so it can be attempted again.
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: { status: "pending", nextAttemptAt: new Date() },
  });
  const queue = getWebhookQueue();
  if (queue) {
    await queue.add(
      "deliver",
      { deliveryId } satisfies WebhookJobData,
      { jobId: `${deliveryId}:retry:${Date.now()}` }
    );
    return true;
  }
  return attemptDelivery(deliveryId);
}

/** Sweep deliveries whose next attempt is due (used when Redis is absent). */
export async function sweepDueDeliveries(): Promise<void> {
  const due = await prisma.webhookDelivery.findMany({
    where: {
      status: { in: ["pending", "failed"] },
      nextAttemptAt: { lte: new Date() },
    },
    take: 50,
  });
  for (const d of due) {
    await attemptDelivery(d.id).catch(() => undefined);
  }
}

export function serializeDelivery(d: {
  id: string;
  eventId: string;
  endpointId: string;
  status: string;
  attemptCount: number;
  nextAttemptAt: Date | null;
  lastAttemptAt: Date | null;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  requestUrl: string;
  createdAt: Date;
  updatedAt: Date;
  event?: { type: string } | null;
}) {
  return {
    id: d.id,
    eventId: d.eventId,
    endpointId: d.endpointId,
    eventType: d.event?.type ?? null,
    status: d.status,
    attemptCount: d.attemptCount,
    nextAttemptAt: d.nextAttemptAt?.toISOString() ?? null,
    lastAttemptAt: d.lastAttemptAt?.toISOString() ?? null,
    responseStatus: d.responseStatus,
    responseBody: d.responseBody,
    errorMessage: d.errorMessage,
    requestUrl: d.requestUrl,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}
