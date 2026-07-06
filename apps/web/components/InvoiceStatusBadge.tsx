import type { InvoiceStatus } from "@/lib/api";

const STYLES: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  expired: "bg-amber-50 text-amber-700 border-amber-200",
  canceled: "bg-neutral-100 text-neutral-600 border-neutral-300",
  failed: "bg-red-50 text-red-700 border-red-200",
  pending: "bg-blue-50 text-blue-700 border-blue-200",
  succeeded: "bg-green-50 text-green-700 border-green-200",
  abandoned: "bg-red-50 text-red-700 border-red-200",
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? STYLES.canceled;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${cls}`}
    >
      {status}
    </span>
  );
}
