/**
 * Invoice lifecycle: creation (via FiberClient), retrieval, cancellation,
 * listing, and status transitions (which write history + emit webhook events).
 */
import type { Invoice, Merchant, InvoiceStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { generateId } from "../utils/ids.js";
import { getFiberClient } from "../fiber/fiberClient.js";
import { ApiError } from "../utils/errors.js";
import type { CreateInvoiceInput } from "@fiberpaykit/shared";
import { emitInvoiceEvent } from "./webhookService.js";
import type { WebhookEventType } from "@fiberpaykit/shared";
import { cacheDel, cacheKeys } from "../cache.js";

/** Map an internal status transition to the webhook event type. */
const STATUS_EVENT: Record<InvoiceStatus, WebhookEventType> = {
  open: "invoice.open",
  paid: "invoice.paid",
  expired: "invoice.expired",
  canceled: "invoice.canceled",
  failed: "invoice.failed",
};

export function checkoutUrl(invoiceId: string): string {
  return `${config.WEB_URL}/checkout/${invoiceId}`;
}

export async function createInvoice(
  merchant: Merchant,
  input: CreateInvoiceInput
): Promise<Invoice> {
  if (input.currency === "CUSTOM_UDT" && !input.udtTypeScript) {
    throw ApiError.badRequest(
      "udtTypeScript is required when currency is CUSTOM_UDT"
    );
  }

  const id = generateId("inv");
  const fiber = getFiberClient();

  const fiberInvoice = await fiber.createInvoice({
    amount: input.amount,
    description: input.description,
    currency: input.currency,
    expiry: input.expiresInSeconds,
    udtTypeScript: input.udtTypeScript,
    allowMpp: config.FIBER_ALLOW_MPP,
    allowTrampolineRouting: config.FIBER_ALLOW_TRAMPOLINE_ROUTING,
    fallbackAddress: config.FIBER_FALLBACK_ADDRESS,
    referenceId: id,
  });

  const invoice = await prisma.invoice.create({
    data: {
      id,
      merchantId: merchant.id,
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      status: "open",
      fiberInvoiceAddress: fiberInvoice.invoiceAddress,
      fiberPaymentHash: fiberInvoice.paymentHash,
      fiberRawInvoice: fiberInvoice.raw as object,
      udtTypeScript: input.udtTypeScript as object | undefined,
      displayAmount: input.displayAmount,
      settlementAsset: input.settlementAsset,
      customerEmail: input.customer?.email,
      customerName: input.customer?.name,
      metadata: input.metadata as object | undefined,
      checkoutSuccessUrl: input.checkout?.successUrl,
      checkoutCancelUrl: input.checkout?.cancelUrl,
      expiresAt: new Date(fiberInvoice.expiresAt),
    },
  });

  await prisma.invoiceStatusHistory.create({
    data: {
      id: generateId("ish"),
      invoiceId: invoice.id,
      oldStatus: null,
      newStatus: "open",
      reason: "created",
    },
  });

  // invoice.created is always emitted regardless of endpoint filters logic
  // (endpoint subscription is checked inside emitInvoiceEvent).
  await emitInvoiceEvent(merchant, invoice, "invoice.created");
  // Bust the merchant's dashboard summary so new invoices show up immediately.
  await cacheDel(cacheKeys.dashboardSummary(merchant.id));

  return invoice;
}

export async function getInvoice(
  merchantId: string,
  invoiceId: string
): Promise<Invoice | null> {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, merchantId },
  });
}

/** Get an invoice by id without a merchant scope (for the public checkout page). */
export async function getInvoicePublic(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { merchant: { select: { name: true } } },
  });
}

/**
 * Transition an invoice to a new status. Idempotent: if the status is already
 * the target (or terminal), it does nothing. Writes history and emits the
 * matching webhook event on a real change.
 */
export async function transitionInvoice(
  invoiceId: string,
  newStatus: InvoiceStatus,
  opts: { reason?: string; rawFiberStatus?: unknown } = {}
): Promise<Invoice | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { merchant: true },
  });
  if (!invoice) return null;

  const terminal: InvoiceStatus[] = ["paid", "expired", "canceled", "failed"];
  if (invoice.status === newStatus) return invoice;
  if (terminal.includes(invoice.status)) {
    // Already settled; don't move away from a terminal state.
    return invoice;
  }

  const now = new Date();
  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: newStatus,
      paidAt: newStatus === "paid" ? now : invoice.paidAt,
      canceledAt: newStatus === "canceled" ? now : invoice.canceledAt,
      failedAt: newStatus === "failed" ? now : invoice.failedAt,
      failedReason:
        newStatus === "failed" ? opts.reason ?? "failed" : invoice.failedReason,
    },
  });

  await prisma.invoiceStatusHistory.create({
    data: {
      id: generateId("ish"),
      invoiceId,
      oldStatus: invoice.status,
      newStatus,
      reason: opts.reason,
      rawFiberStatus: (opts.rawFiberStatus as object) ?? undefined,
    },
  });

  await emitInvoiceEvent(invoice.merchant, updated, STATUS_EVENT[newStatus]);
  // Status changed (e.g. paid) — refresh the dashboard summary right away.
  await cacheDel(cacheKeys.dashboardSummary(invoice.merchantId));
  return updated;
}

export async function cancelInvoice(
  merchant: Merchant,
  invoiceId: string,
  reason?: string
): Promise<Invoice> {
  const invoice = await getInvoice(merchant.id, invoiceId);
  if (!invoice) throw ApiError.notFound("Invoice not found");
  if (invoice.status !== "open") {
    throw ApiError.badRequest(
      `Invoice cannot be canceled from status "${invoice.status}"`
    );
  }

  // Best-effort call to the Fiber node.
  if (invoice.fiberPaymentHash) {
    try {
      await getFiberClient().cancelInvoice({
        paymentHash: invoice.fiberPaymentHash,
        invoiceAddress: invoice.fiberInvoiceAddress ?? undefined,
      });
    } catch {
      // Cancellation on the node is best-effort; we still cancel internally.
    }
  }

  const updated = await transitionInvoice(invoiceId, "canceled", {
    reason: reason ?? "canceled_by_merchant",
  });
  return updated ?? invoice;
}

export interface ListInvoicesOptions {
  status?: InvoiceStatus;
  currency?: string;
  orderId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit: number;
}

export async function listInvoices(
  merchantId: string,
  opts: ListInvoicesOptions
) {
  const where: Record<string, unknown> = { merchantId };
  if (opts.status) where.status = opts.status;
  if (opts.currency) where.currency = opts.currency;
  if (opts.orderId) where.orderId = opts.orderId;
  if (opts.from || opts.to) {
    where.createdAt = {
      ...(opts.from ? { gte: new Date(opts.from) } : {}),
      ...(opts.to ? { lte: new Date(opts.to) } : {}),
    };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: opts.limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const hasMore = invoices.length > opts.limit;
  const page = hasMore ? invoices.slice(0, opts.limit) : invoices;
  return {
    data: page,
    hasMore,
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  };
}

/** Map a Prisma Invoice to the public API/SDK invoice shape. */
export function serializeInvoice(invoice: Invoice) {
  return {
    id: invoice.id,
    object: "invoice" as const,
    status: invoice.status,
    orderId: invoice.orderId,
    amount: invoice.amount,
    currency: invoice.currency,
    description: invoice.description,
    fiber: {
      invoiceAddress: invoice.fiberInvoiceAddress,
      paymentHash: invoice.fiberPaymentHash,
    },
    multiAsset:
      invoice.currency === "CUSTOM_UDT" || invoice.displayAmount
        ? {
            currency: invoice.currency,
            udtTypeScript: invoice.udtTypeScript,
            displayAmount: invoice.displayAmount,
            settlementAsset: invoice.settlementAsset,
          }
        : null,
    customer: invoice.customerEmail
      ? { email: invoice.customerEmail, name: invoice.customerName }
      : null,
    metadata: invoice.metadata,
    checkout: {
      successUrl: invoice.checkoutSuccessUrl,
      cancelUrl: invoice.checkoutCancelUrl,
    },
    checkoutUrl: checkoutUrl(invoice.id),
    createdAt: invoice.createdAt.toISOString(),
    expiresAt: invoice.expiresAt.toISOString(),
    paidAt: invoice.paidAt?.toISOString() ?? null,
    canceledAt: invoice.canceledAt?.toISOString() ?? null,
    failedAt: invoice.failedAt?.toISOString() ?? null,
    failedReason: invoice.failedReason,
  };
}
