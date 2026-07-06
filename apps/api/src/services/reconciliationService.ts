/** CSV reconciliation export for a merchant's invoices. */
import { prisma } from "../db.js";

const HEADERS = [
  "invoice_id",
  "order_id",
  "amount",
  "currency",
  "status",
  "fiber_payment_hash",
  "fiber_invoice_address",
  "fee",
  "created_at",
  "paid_at",
  "expires_at",
];

function csvEscape(value: string | null | undefined): string {
  const v = value ?? "";
  if (/[",\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export async function buildReconciliationCsv(
  merchantId: string
): Promise<string> {
  const invoices = await prisma.invoice.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
  });

  const rows = invoices.map((inv) =>
    [
      inv.id,
      inv.orderId,
      inv.amount,
      inv.currency,
      inv.status,
      inv.fiberPaymentHash,
      inv.fiberInvoiceAddress,
      inv.fee,
      inv.createdAt.toISOString(),
      inv.paidAt?.toISOString() ?? "",
      inv.expiresAt.toISOString(),
    ]
      .map(csvEscape)
      .join(",")
  );

  return [HEADERS.join(","), ...rows].join("\n") + "\n";
}

/** Dashboard summary metrics for a merchant. */
export async function buildDashboardSummary(merchantId: string) {
  const [invoices, deliveries] = await Promise.all([
    prisma.invoice.findMany({ where: { merchantId } }),
    prisma.webhookDelivery.findMany({
      where: { event: { merchantId } },
      select: { status: true },
    }),
  ]);

  const byStatus = { open: 0, paid: 0, expired: 0, canceled: 0, failed: 0 };
  const receivedByCurrency: Record<string, string> = {};

  for (const inv of invoices) {
    byStatus[inv.status] += 1;
    if (inv.status === "paid") {
      const cur = receivedByCurrency[inv.currency] ?? "0";
      receivedByCurrency[inv.currency] = (
        BigInt(cur) + BigInt(inv.amount)
      ).toString();
    }
  }

  const totalDeliveries = deliveries.length;
  const succeeded = deliveries.filter((d) => d.status === "succeeded").length;
  const webhookSuccessRate =
    totalDeliveries === 0 ? null : succeeded / totalDeliveries;

  return {
    totalInvoices: invoices.length,
    paidInvoices: byStatus.paid,
    openInvoices: byStatus.open,
    failedOrExpiredInvoices: byStatus.failed + byStatus.expired,
    canceledInvoices: byStatus.canceled,
    receivedByCurrency,
    webhookSuccessRate,
    webhookDeliveries: { total: totalDeliveries, succeeded },
  };
}
