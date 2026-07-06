/**
 * Public checkout data API (no API key). Powers the hosted checkout page.
 * Returns only non-sensitive invoice fields plus a QR code data URL for the
 * Fiber invoice address. The Fiber RPC URL is never exposed here.
 */
import type { FastifyInstance } from "fastify";
import QRCode from "qrcode";
import { getInvoicePublic } from "../services/invoiceService.js";
import { formatDisplayAmount } from "../utils/money.js";
import { ApiError } from "../utils/errors.js";
import { config } from "../config.js";

export async function checkoutRoutes(app: FastifyInstance): Promise<void> {
  // GET /checkout/:id — public checkout view model.
  app.get<{ Params: { id: string } }>(
    "/checkout/:id",
    async (request) => {
      const invoice = await getInvoicePublic(request.params.id);
      if (!invoice) throw ApiError.notFound("Invoice not found");

      const qrPayload = invoice.fiberInvoiceAddress ?? invoice.id;
      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
        margin: 1,
        width: 320,
      });

      return {
        id: invoice.id,
        merchantName: invoice.merchant.name,
        orderId: invoice.orderId,
        amount: invoice.amount,
        displayAmount:
          invoice.displayAmount ??
          formatDisplayAmount(invoice.amount, invoice.currency),
        currency: invoice.currency,
        description: invoice.description,
        status: invoice.status,
        fiberInvoiceAddress: invoice.fiberInvoiceAddress,
        fiberPaymentHash: invoice.fiberPaymentHash,
        qrCodeDataUrl,
        createdAt: invoice.createdAt.toISOString(),
        expiresAt: invoice.expiresAt.toISOString(),
        paidAt: invoice.paidAt?.toISOString() ?? null,
        failedReason: invoice.failedReason,
        checkoutSuccessUrl: invoice.checkoutSuccessUrl,
        checkoutCancelUrl: invoice.checkoutCancelUrl,
        mode: config.FIBER_MODE,
        // Only expose demo controls when running in mock mode.
        demoControlsEnabled: config.FIBER_MODE === "mock",
      };
    }
  );
}
