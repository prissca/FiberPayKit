/**
 * Demo-only routes.
 *
 * - Mock payment controls (mark-paid / mark-failed / expire) so a presenter can
 *   drive invoice state without a real Fiber node.
 * - A built-in webhook receiver that verifies FiberPayKit signatures and stores
 *   the last received events (surfaced at /dashboard/webhook-tester).
 *
 * These are gated to mock mode (except the receiver, which is always useful).
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { ApiError } from "../utils/errors.js";
import { getMockFiberClient } from "../fiber/mockFiberClient.js";
import { transitionInvoice } from "../services/invoiceService.js";
import { getWebhookSecret } from "../services/merchantService.js";
import { verifyWebhookSignature } from "@fiberpaykit/sdk/webhook";
import { generateId } from "../utils/ids.js";

async function loadInvoiceOr404(id: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw ApiError.notFound("Invoice not found");
  return invoice;
}

export async function demoRoutes(app: FastifyInstance): Promise<void> {
  const ensureMock = () => {
    if (config.FIBER_MODE !== "mock") {
      throw ApiError.forbidden(
        "Demo payment controls are only available in FIBER_MODE=mock"
      );
    }
  };

  // POST /demo/invoices/:id/mark-paid
  app.post<{ Params: { id: string } }>(
    "/demo/invoices/:id/mark-paid",
    async (request) => {
      ensureMock();
      const invoice = await loadInvoiceOr404(request.params.id);
      const mock = getMockFiberClient();
      if (invoice.fiberPaymentHash) mock.markPaid(invoice.fiberPaymentHash);
      const updated = await transitionInvoice(invoice.id, "paid", {
        reason: "demo_mark_paid",
      });
      return { ok: true, status: updated?.status ?? invoice.status };
    }
  );

  // POST /demo/invoices/:id/mark-failed
  app.post<{ Params: { id: string } }>(
    "/demo/invoices/:id/mark-failed",
    async (request) => {
      ensureMock();
      const invoice = await loadInvoiceOr404(request.params.id);
      const mock = getMockFiberClient();
      if (invoice.fiberPaymentHash) mock.markFailed(invoice.fiberPaymentHash);
      const updated = await transitionInvoice(invoice.id, "failed", {
        reason: "demo_mark_failed",
      });
      return { ok: true, status: updated?.status ?? invoice.status };
    }
  );

  // POST /demo/invoices/:id/expire
  app.post<{ Params: { id: string } }>(
    "/demo/invoices/:id/expire",
    async (request) => {
      ensureMock();
      const invoice = await loadInvoiceOr404(request.params.id);
      const mock = getMockFiberClient();
      if (invoice.fiberPaymentHash) mock.expire(invoice.fiberPaymentHash);
      const updated = await transitionInvoice(invoice.id, "expired", {
        reason: "demo_expire",
      });
      return { ok: true, status: updated?.status ?? invoice.status };
    }
  );

  // POST /demo/webhook-receiver — a sample merchant endpoint.
  app.post("/demo/webhook-receiver", async (request: FastifyRequest) => {
    const rawBody = (request as { rawBody?: string }).rawBody ?? "";
    const signatureHeader =
      (request.headers["fiberpaykit-signature"] as string | undefined) ?? "";
    const eventId =
      (request.headers["fiberpaykit-event-id"] as string | undefined) ?? null;

    let signatureOk = false;
    let eventType: string | null = null;

    // Look up the event to find the signing merchant, then verify.
    if (eventId) {
      const event = await prisma.webhookEvent.findUnique({
        where: { id: eventId },
        include: { merchant: true },
      });
      if (event) {
        eventType = event.type;
        try {
          const secret = getWebhookSecret(event.merchant);
          verifyWebhookSignature({ rawBody, signatureHeader, secret });
          signatureOk = true;
        } catch {
          signatureOk = false;
        }
      }
    }

    await prisma.receivedWebhook.create({
      data: {
        id: generateId("rw"),
        eventId,
        eventType,
        signatureOk,
        headers: JSON.parse(JSON.stringify(request.headers)),
        body: rawBody.slice(0, 8000),
      },
    });

    // Trim to the last 20 stored events.
    const all = await prisma.receivedWebhook.findMany({
      orderBy: { receivedAt: "desc" },
      skip: 20,
      select: { id: true },
    });
    if (all.length > 0) {
      await prisma.receivedWebhook.deleteMany({
        where: { id: { in: all.map((r) => r.id) } },
      });
    }

    return { ok: true, signatureOk };
  });

  // GET /demo/received-webhooks — for the webhook tester UI.
  app.get("/demo/received-webhooks", async () => {
    const received = await prisma.receivedWebhook.findMany({
      orderBy: { receivedAt: "desc" },
      take: 20,
    });
    return {
      data: received.map((r) => ({
        id: r.id,
        eventId: r.eventId,
        eventType: r.eventType,
        signatureOk: r.signatureOk,
        body: r.body,
        receivedAt: r.receivedAt.toISOString(),
      })),
    };
  });
}
