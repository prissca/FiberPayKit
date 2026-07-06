"use client";

import { useEffect, useState } from "react";
import { apiAuthed, type WebhookDeliveryView } from "@/lib/api";
import { WebhookDeliveryTable } from "@/components/WebhookDeliveryTable";

interface Endpoint {
  id: string;
  url: string;
  events: string[];
  status: string;
}

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryView[] | null>(
    null
  );

  useEffect(() => {
    apiAuthed<{ data: Endpoint[] }>("/v1/webhook-endpoints").then((r) =>
      setEndpoints(r.data)
    );
    apiAuthed<{ data: WebhookDeliveryView[] }>("/v1/webhook-deliveries").then(
      (r) => setDeliveries(r.data)
    );
  }, []);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="border-b border-neutral-200 px-5 py-3">
          <h2 className="font-semibold">Webhook endpoints</h2>
        </div>
        <div className="divide-y divide-neutral-100">
          {endpoints.length === 0 ? (
            <p className="p-5 text-sm text-neutral-500">
              No endpoints configured.
            </p>
          ) : (
            endpoints.map((e) => (
              <div key={e.id} className="flex items-center gap-4 p-5">
                <div className="flex-1">
                  <p className="mono">{e.url}</p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    {e.events.map((ev) => (
                      <span
                        key={ev}
                        className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600"
                      >
                        {ev}
                      </span>
                    ))}
                  </p>
                </div>
                <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  {e.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="border-b border-neutral-200 px-5 py-3">
          <h2 className="font-semibold">Recent deliveries</h2>
        </div>
        {deliveries === null ? (
          <p className="p-5 text-sm text-neutral-500">Loading…</p>
        ) : (
          <WebhookDeliveryTable deliveries={deliveries} />
        )}
      </div>
    </div>
  );
}
