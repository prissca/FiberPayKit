"use client";

import { useEffect, useState } from "react";
import { apiAuthed, type DashboardSummary } from "@/lib/api";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import { ReconciliationExportButton } from "@/components/ReconciliationExportButton";
import Link from "next/link";

function Stat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  accent: string;
  icon: string;
}) {
  return (
    <div className="panel scanline relative overflow-hidden p-5">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${accent}`}
      />
      <div className="flex items-center justify-between">
        <p className="label">{label}</p>
        <span className="text-lg opacity-70">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

/** Tiny SVG donut for the paid/open/failed split. */
function StatusDonut({ paid, open, other }: { paid: number; open: number; other: number }) {
  const total = Math.max(1, paid + open + other);
  const segs = [
    { v: paid, color: "#54f7c0" },
    { v: open, color: "#2dd4ff" },
    { v: other, color: "#ff5c6a" },
  ];
  const C = 2 * Math.PI * 30;
  let offset = 0;
  return (
    <svg viewBox="0 0 80 80" className="h-28 w-28 -rotate-90">
      <circle cx="40" cy="40" r="30" fill="none" stroke="#161c30" strokeWidth="12" />
      {segs.map((s, i) => {
        const len = (s.v / total) * C;
        const el = (
          <circle
            key={i}
            cx="40"
            cy="40"
            r="30"
            fill="none"
            stroke={s.color}
            strokeWidth="12"
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${s.color})` }}
          />
        );
        offset += len;
        return el;
      })}
    </svg>
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
      <p className="panel-inset px-4 py-3 text-sm text-red-300">
        {error} — is the API reachable?
      </p>
    );
  if (!summary)
    return (
      <div className="panel-inset flex items-center gap-3 px-4 py-6 text-sm text-[#93a0c4]">
        <span className="dot dot-live animate-pulseGlow" /> Loading telemetry…
      </div>
    );

  const successRate =
    summary.webhookSuccessRate === null
      ? "—"
      : `${Math.round(summary.webhookSuccessRate * 100)}%`;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ReconciliationExportButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total invoices" value={summary.totalInvoices} icon="▤" accent="bg-violet/30" />
        <Stat label="Paid" value={summary.paidInvoices} icon="✓" accent="bg-lime/30" />
        <Stat label="Open" value={summary.openInvoices} icon="◷" accent="bg-cyan/30" />
        <Stat label="Failed / expired" value={summary.failedOrExpiredInvoices} icon="⚠" accent="bg-magenta/30" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Status donut */}
        <div className="panel p-5">
          <p className="label">Invoice health</p>
          <div className="mt-3 flex items-center gap-4">
            <StatusDonut
              paid={summary.paidInvoices}
              open={summary.openInvoices}
              other={summary.failedOrExpiredInvoices + summary.canceledInvoices}
            />
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-lime" /> Paid ·{" "}
                {summary.paidInvoices}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan" /> Open ·{" "}
                {summary.openInvoices}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5c6a]" /> Other ·{" "}
                {summary.failedOrExpiredInvoices + summary.canceledInvoices}
              </li>
            </ul>
          </div>
        </div>

        {/* Total received */}
        <div className="panel p-5">
          <p className="label">Total received</p>
          <div className="mt-3 space-y-2">
            {Object.keys(summary.receivedByCurrency).length === 0 ? (
              <p className="text-sm text-[#7f8bb0]">No payments yet</p>
            ) : (
              Object.entries(summary.receivedByCurrency).map(([cur, amt]) => (
                <div
                  key={cur}
                  className="panel-inset flex items-center justify-between px-3 py-2"
                >
                  <span className="text-lg font-bold holo-text">{amt}</span>
                  <span className="chip !py-0.5">{cur}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Webhook rate + node */}
        <div className="space-y-4">
          <div className="panel p-5">
            <p className="label">Webhook success</p>
            <p className="mt-2 text-3xl font-bold text-lime neon-cyan">
              {successRate}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-lime to-cyan"
                style={{
                  width:
                    summary.webhookSuccessRate === null
                      ? "0%"
                      : `${Math.round(summary.webhookSuccessRate * 100)}%`,
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-[#7f8bb0]">
              {summary.webhookDeliveries.succeeded} /{" "}
              {summary.webhookDeliveries.total} deliveries
            </p>
          </div>

          <div className="panel p-5">
            <p className="label">Fiber node</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`dot ${summary.fiberNode.reachable ? "dot-live animate-pulseGlow" : "dot-off"}`}
              />
              <span className="font-semibold">
                {summary.fiberNode.reachable ? "Reachable" : "Unreachable"}
              </span>
              <span className="chip ml-auto !py-0.5">{summary.mode}</span>
            </div>
            <p className="mt-2 truncate font-mono text-xs text-[#5f6a8c]">
              {summary.fiberNode.pubkey ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Recent invoices */}
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-edge px-5 py-3">
          <h2 className="font-semibold text-white">Recent invoices</h2>
          <Link href="/dashboard/invoices" className="text-sm text-cyan-soft hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-[#7f8bb0]">
                <th className="px-5 py-2.5">Invoice</th>
                <th className="px-5 py-2.5">Order</th>
                <th className="px-5 py-2.5">Amount</th>
                <th className="px-5 py-2.5">Status</th>
                <th className="px-5 py-2.5">Created</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-t border-edge transition hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-3 font-mono text-xs text-cyan-soft">
                    {inv.id}
                  </td>
                  <td className="px-5 py-3">{inv.orderId}</td>
                  <td className="px-5 py-3 font-semibold">
                    {inv.amount}{" "}
                    <span className="text-xs text-[#7f8bb0]">{inv.currency}</span>
                  </td>
                  <td className="px-5 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-5 py-3 text-[#7f8bb0]">
                    {new Date(inv.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
