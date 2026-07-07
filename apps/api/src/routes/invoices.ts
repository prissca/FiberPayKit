import type { FastifyInstance } from "fastify";
import {
  createInvoiceSchema,
  listInvoicesQuerySchema,
  cancelInvoiceSchema,
} from "@fiberpaykit/shared";
import { requireMerchant, getMerchant } from "../plugins/auth.js";
import { ApiError } from "../utils/errors.js";
import {
  cancelInvoice,
  createInvoice,
  getInvoice,
  listInvoices,
  serializeInvoice,
} from "../services/invoiceService.js";
import { prisma } from "../db.js";
import { cacheWrap, cacheKeys } from "../cache.js";

// Short TTL: the list isn't polled, so a few seconds of staleness is fine and
// it keeps the invoices page snappy under repeated visits.
const LIST_TTL_SECONDS = 5;

export async function invoiceRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireMerchant);

  // POST /v1/invoices
  app.post("/v1/invoices", async (request, reply) => {
    const merchant = getMerchant(request);
    const parsed = createInvoiceSchema.safeParse(request.body);
    if (!parsed.success) {
      throw ApiError.badRequest("Invalid invoice body", parsed.error.flatten());
    }
    const invoice = await createInvoice(merchant, parsed.data);
    reply.code(201);
    return serializeInvoice(invoice);
  });

  // GET /v1/invoices — paginated + filtered
  app.get("/v1/invoices", async (request) => {
    const merchant = getMerchant(request);
    const parsed = listInvoicesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw ApiError.badRequest("Invalid query", parsed.error.flatten());
    }
    const qs = JSON.stringify(parsed.data);
    return cacheWrap(
      cacheKeys.invoiceList(merchant.id, qs),
      LIST_TTL_SECONDS,
      async () => {
        const result = await listInvoices(merchant.id, parsed.data);
        return {
          data: result.data.map(serializeInvoice),
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        };
      }
    );
  });

  // GET /v1/invoices/:id — full detail with webhook delivery summary
  app.get<{ Params: { id: string } }>(
    "/v1/invoices/:id",
    async (request) => {
      const merchant = getMerchant(request);
      const invoice = await getInvoice(merchant.id, request.params.id);
      if (!invoice) throw ApiError.notFound("Invoice not found");

      const deliveries = await prisma.webhookDelivery.groupBy({
        by: ["status"],
        where: { event: { invoiceId: invoice.id } },
        _count: true,
      });
      const summary = { total: 0, succeeded: 0, failed: 0, pending: 0 };
      for (const d of deliveries) {
        summary.total += d._count;
        if (d.status === "succeeded") summary.succeeded += d._count;
        else if (d.status === "pending") summary.pending += d._count;
        else summary.failed += d._count;
      }

      return {
        ...serializeInvoice(invoice),
        webhookDeliverySummary: summary,
      };
    }
  );

  // POST /v1/invoices/:id/cancel
  app.post<{ Params: { id: string } }>(
    "/v1/invoices/:id/cancel",
    async (request) => {
      const merchant = getMerchant(request);
      const parsed = cancelInvoiceSchema.safeParse(request.body ?? {});
      const reason = parsed.success ? parsed.data.reason : undefined;
      const invoice = await cancelInvoice(
        merchant,
        request.params.id,
        reason
      );
      return serializeInvoice(invoice);
    }
  );
}
