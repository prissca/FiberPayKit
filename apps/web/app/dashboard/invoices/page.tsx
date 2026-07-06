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
      <div className="flex items-center gap-2">
        <span className="label">Filter status:</span>
        <select
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || "all"}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
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
                <td colSpan={8} className="px-4 py-6 text-neutral-500">
                  Loading…
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-neutral-500">
                  No invoices.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-neutral-100">
                  <td className="px-4 py-3 font-mono text-xs">{inv.id}</td>
                  <td className="px-4 py-3">{inv.orderId}</td>
                  <td className="px-4 py-3">
                    {inv.amount} {inv.currency}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(inv.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(inv.expiresAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {inv.paidAt ? new Date(inv.paidAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/checkout/${inv.id}`}
                      className="text-sm text-brand"
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
