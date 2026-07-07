/** Authenticated dashboard aggregate endpoints. */
import type { FastifyInstance } from "fastify";
import { requireMerchant, getMerchant } from "../plugins/auth.js";
import { buildDashboardSummary } from "../services/reconciliationService.js";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { serializeInvoice } from "../services/invoiceService.js";
import { getCachedNodeInfo } from "../services/fiberStatusService.js";
import { cacheWrap, cacheKeys } from "../cache.js";

// The dashboard polls every ~5s; a short TTL makes repeated polls near-instant
// (one Redis GET instead of several Postgres queries) while staying fresh.
const SUMMARY_TTL_SECONDS = 4;

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireMerchant);

  // GET /v1/dashboard/summary
  app.get("/v1/dashboard/summary", async (request) => {
    const merchant = getMerchant(request);

    return cacheWrap(
      cacheKeys.dashboardSummary(merchant.id),
      SUMMARY_TTL_SECONDS,
      async () => {
        const [summary, fiberNode, recent] = await Promise.all([
          buildDashboardSummary(merchant.id),
          getCachedNodeInfo(),
          prisma.invoice.findMany({
            where: { merchantId: merchant.id },
            orderBy: { createdAt: "desc" },
            take: 10,
          }),
        ]);

        return {
          ...summary,
          mode: config.FIBER_MODE,
          fiberNode: {
            reachable: fiberNode.reachable,
            pubkey: fiberNode.pubkey,
          },
          recentInvoices: recent.map(serializeInvoice),
        };
      }
    );
  });
}
