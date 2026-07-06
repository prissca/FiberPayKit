"use client";

import { useEffect, useState } from "react";
import { apiAuthed, type DashboardSummary } from "@/lib/api";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import { ReconciliationExportButton } from "@/components/ReconciliationExportButton";
import Link from "next/link";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card p-4">
      <p className="label">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function DashboardOverview() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      apiAuthed<DashboardSummary>("/v1/dashboard/summary")
        .then(setSummary)
        .catch((e) => setError(e.message));
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  if (error)
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
        {error} — is the API running on port 4000?
      </p>
    );
  if (!summary) return <p className="text-sm text-neutral-500">Loading…</p>;

  const successRate =
    summary.webhookSuccessRate === null
      ? "—"
      : `${Math.round(summary.webhookSuccessRate * 100)}%`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <ReconciliationExportButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total invoices" value={summary.totalInvoices} />
        <Stat label="Paid" value={summary.paidInvoices} />
        <Stat label="Open" value={summary.openInvoices} />
        <Stat
          label="Failed / expired"
          value={summary.failedOrExpiredInvoices}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <p className="label">Total received</p>
          <div className="mt-2 space-y-1">
            {Object.keys(summary.receivedByCurrency).length === 0 ? (
              <p className="text-sm text-neutral-400">No payments yet</p>
            ) : (
              Object.entries(summary.receivedByCurrency).map(([cur, amt]) => (
                <p key={cur} className="text-lg font-semibold">
                  {amt}{" "}
                  <span className="text-sm font-medium text-neutral-500">
                    {cur}
                  </span>
                </p>
              ))
            )}
          </div>
        </div>

        <div className="card p-5">
          <p className="label">Webhook success rate</p>
          <p className="mt-2 text-2xl font-bold">{successRate}</p>
          <p className="text-xs text-neutral-400">
            {summary.webhookDeliveries.succeeded} /{" "}
            {summary.webhookDeliveries.total} deliveries
          </p>
        </div>

        <div className="card p-5">
          <p className="label">Fiber node</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                summary.fiberNode.reachable ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="font-semibold">
              {summary.fiberNode.reachable ? "Reachable" : "Unreachable"}
            </span>
            <span className="ml-auto rounded bg-neutral-100 px-2 py-0.5 text-xs">
              {summary.mode}
            </span>
          </div>
          <p className="mt-2 truncate font-mono text-xs text-neutral-400">
            {summary.fiberNode.pubkey ?? "—"}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <h2 className="font-semibold">Recent invoices</h2>
          <Link href="/dashboard/invoices" className="text-sm text-brand">
            View all →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-neutral-500">
              <th className="px-5 py-2">Invoice</th>
              <th className="px-5 py-2">Order</th>
              <th className="px-5 py-2">Amount</th>
              <th className="px-5 py-2">Status</th>
              <th className="px-5 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {summary.recentInvoices.map((inv) => (
              <tr key={inv.id} className="border-t border-neutral-100">
                <td className="px-5 py-2 font-mono text-xs">{inv.id}</td>
                <td className="px-5 py-2">{inv.orderId}</td>
                <td className="px-5 py-2">
                  {inv.amount} {inv.currency}
                </td>
                <td className="px-5 py-2">
                  <InvoiceStatusBadge status={inv.status} />
                </td>
                <td className="px-5 py-2 text-neutral-500">
                  {new Date(inv.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
