"use client";

import { useState } from "react";
import { apiAuthed, type WebhookDeliveryView } from "@/lib/api";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

export function WebhookDeliveryTable({
  deliveries: initial,
}: {
  deliveries: WebhookDeliveryView[];
}) {
  const [deliveries, setDeliveries] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  const retry = async (id: string) => {
    setBusyId(id);
    try {
      await apiAuthed(`/v1/webhook-deliveries/${id}/retry`, { method: "POST" });
      const fresh = await apiAuthed<{ data: WebhookDeliveryView[] }>(
        "/v1/webhook-deliveries"
      );
      setDeliveries(fresh.data);
    } finally {
      setBusyId(null);
    }
  };

  if (deliveries.length === 0) {
    return (
      <p className="p-6 text-sm text-neutral-500">No webhook deliveries yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
            <th className="px-4 py-3">Event</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Attempts</th>
            <th className="px-4 py-3">HTTP</th>
            <th className="px-4 py-3">URL</th>
            <th className="px-4 py-3">Last attempt</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => (
            <tr key={d.id} className="border-b border-neutral-100">
              <td className="px-4 py-3 font-medium">{d.eventType ?? "—"}</td>
              <td className="px-4 py-3">
                <InvoiceStatusBadge status={d.status} />
              </td>
              <td className="px-4 py-3">{d.attemptCount}</td>
              <td className="px-4 py-3">
                {d.responseStatus ?? (
                  <span className="text-neutral-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 max-w-[220px] truncate text-neutral-500">
                {d.requestUrl}
              </td>
              <td className="px-4 py-3 text-neutral-500">
                {d.lastAttemptAt
                  ? new Date(d.lastAttemptAt).toLocaleString()
                  : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                {(d.status === "failed" || d.status === "abandoned") && (
                  <button
                    className="btn-secondary"
                    disabled={busyId === d.id}
                    onClick={() => retry(d.id)}
                  >
                    {busyId === d.id ? "Retrying…" : "Retry"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
