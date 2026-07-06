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
      <div className="panel overflow-hidden">
        <div className="border-b border-edge px-5 py-3">
          <h2 className="font-semibold text-white">Webhook endpoints</h2>
        </div>
        <div className="divide-y divide-edge">
          {endpoints.length === 0 ? (
            <p className="p-5 text-sm text-[#7f8bb0]">No endpoints configured.</p>
          ) : (
            endpoints.map((e) => (
              <div key={e.id} className="flex items-center gap-4 p-5">
                <div className="flex-1">
                  <p className="mono text-cyan-soft">{e.url}</p>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {e.events.map((ev) => (
                      <span key={ev} className="chip !py-0.5 !text-[11px]">
                        {ev}
                      </span>
                    ))}
                  </p>
                </div>
                <span className="chip border-lime/30 !text-lime">
                  <span className="dot dot-live" /> {e.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="border-b border-edge px-5 py-3">
          <h2 className="font-semibold text-white">Recent deliveries</h2>
        </div>
        {deliveries === null ? (
          <p className="p-5 text-sm text-[#7f8bb0]">Loading…</p>
        ) : (
          <WebhookDeliveryTable deliveries={deliveries} />
        )}
      </div>
    </div>
  );
}
