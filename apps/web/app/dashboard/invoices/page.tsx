"use client";

import { useEffect, useState } from "react";
import { apiAuthed, type InvoiceView } from "@/lib/api";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import Link from "next/link";

const STATUSES = ["", "open", "paid", "expired", "canceled", "failed"];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = status ? `?status=${status}` : "";
    apiAuthed<{ data: InvoiceView[] }>(`/v1/invoices${q}`)
      .then((r) => setInvoices(r.data))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label">Filter:</span>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition ${
              status === s ? "btn-primary" : "chip hover:border-cyan/40"
            }`}
          >
            {s || "all"}
          </button>
        ))}
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-[#7f8bb0]">
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-[#7f8bb0]">
                  Loading…
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-[#7f8bb0]">
                  No invoices.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-t border-edge transition hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 font-mono text-xs text-cyan-soft">
                    {inv.id}
                  </td>
                  <td className="px-4 py-3">{inv.orderId}</td>
                  <td className="px-4 py-3 font-semibold">
                    {inv.amount}{" "}
                    <span className="text-xs text-[#7f8bb0]">{inv.currency}</span>
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-[#7f8bb0]">
                    {new Date(inv.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[#7f8bb0]">
                    {new Date(inv.expiresAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[#7f8bb0]">
                    {inv.paidAt ? new Date(inv.paidAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/checkout/${inv.id}`}
                      className="text-sm text-cyan-soft hover:underline"
                    >
                      Checkout →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
