import type { FastifyInstance } from "fastify";
import { createWebhookEndpointSchema } from "@fiberpaykit/shared";
import { requireMerchant, getMerchant } from "../plugins/auth.js";
import { ApiError } from "../utils/errors.js";
import {
  createWebhookEndpoint,
  serializeEndpoint,
} from "../services/merchantService.js";
import {
  retryDelivery,
  serializeDelivery,
} from "../services/webhookService.js";
import { prisma } from "../db.js";
import { buildReconciliationCsv } from "../services/reconciliationService.js";

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireMerchant);

  // POST /v1/webhook-endpoints
  app.post("/v1/webhook-endpoints", async (request, reply) => {
    const merchant = getMerchant(request);
    const parsed = createWebhookEndpointSchema.safeParse(request.body);
    if (!parsed.success) {
      throw ApiError.badRequest("Invalid endpoint body", parsed.error.flatten());
    }
    const endpoint = await createWebhookEndpoint(
      merchant.id,
      parsed.data.url,
      parsed.data.events
    );
    reply.code(201);
    return serializeEndpoint(endpoint);
  });

  // GET /v1/webhook-endpoints
  app.get("/v1/webhook-endpoints", async (request) => {
    const merchant = getMerchant(request);
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
    });
    return { data: endpoints.map(serializeEndpoint) };
  });

  // GET /v1/webhook-deliveries
  app.get("/v1/webhook-deliveries", async (request) => {
    const merchant = getMerchant(request);
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { event: { merchantId: merchant.id } },
      include: { event: { select: { type: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { data: deliveries.map(serializeDelivery) };
  });

  // GET /v1/webhook-deliveries/:id
  app.get<{ Params: { id: string } }>(
    "/v1/webhook-deliveries/:id",
    async (request) => {
      const merchant = getMerchant(request);
      const delivery = await prisma.webhookDelivery.findFirst({
        where: { id: request.params.id, event: { merchantId: merchant.id } },
        include: { event: true },
      });
      if (!delivery) throw ApiError.notFound("Delivery not found");
      return {
        ...serializeDelivery(delivery),
        requestBody: delivery.requestBody,
        requestHeaders: delivery.requestHeaders,
        eventPayload: delivery.event.payload,
      };
    }
  );

  // POST /v1/webhook-deliveries/:id/retry
  app.post<{ Params: { id: string } }>(
    "/v1/webhook-deliveries/:id/retry",
    async (request) => {
      const merchant = getMerchant(request);
      const ok = await retryDelivery(merchant.id, request.params.id);
      if (!ok && ok !== false) throw ApiError.notFound("Delivery not found");
      return { ok: true, retried: true };
    }
  );

  // GET /v1/reconciliation/export.csv
  app.get("/v1/reconciliation/export.csv", async (request, reply) => {
    const merchant = getMerchant(request);
    const csv = await buildReconciliationCsv(merchant.id);
    reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header(
        "Content-Disposition",
        `attachment; filename="fiberpaykit-reconciliation-${Date.now()}.csv"`
      );
    return csv;
  });
}
