/** Authenticated dashboard aggregate endpoints. */
import type { FastifyInstance } from "fastify";
import { requireMerchant, getMerchant } from "../plugins/auth.js";
import { buildDashboardSummary } from "../services/reconciliationService.js";
import { getFiberClient } from "../fiber/fiberClient.js";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { serializeInvoice } from "../services/invoiceService.js";

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireMerchant);

  // GET /v1/dashboard/summary
  app.get("/v1/dashboard/summary", async (request) => {
    const merchant = getMerchant(request);
    const summary = await buildDashboardSummary(merchant.id);

    let fiberNode = { reachable: false, pubkey: null as string | null };
    try {
      const info = await getFiberClient().getNodeInfo();
      fiberNode = { reachable: info.reachable, pubkey: info.pubkey };
    } catch {
      // leave defaults
    }

    const recent = await prisma.invoice.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return {
      ...summary,
      mode: config.FIBER_MODE,
      fiberNode,
      recentInvoices: recent.map(serializeInvoice),
    };
  });
}
