"use client";

import { useEffect, useState } from "react";
import { apiPublic } from "@/lib/api";

interface Received {
  id: string;
  eventId: string | null;
  eventType: string | null;
  signatureOk: boolean;
  body: string;
  receivedAt: string;
}

export default function WebhookTesterPage() {
  const [events, setEvents] = useState<Received[]>([]);

  useEffect(() => {
    const load = () =>
      apiPublic<{ data: Received[] }>("/demo/received-webhooks").then((r) =>
        setEvents(r.data)
      );
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="font-semibold">Built-in webhook receiver</h2>
        <p className="mt-1 text-sm text-neutral-600">
          The API ships a sample receiver at{" "}
          <code className="mono">/demo/webhook-receiver</code> that verifies the{" "}
          <code className="mono">FiberPayKit-Signature</code> header using the
          SDK. The last 20 received events appear below — a live proof that
          signed delivery works end to end.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No webhooks received yet. Create and pay an invoice to trigger one.
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {e.eventType ?? "unknown"}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    e.signatureOk
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {e.signatureOk ? "signature verified" : "signature invalid"}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                {new Date(e.receivedAt).toLocaleString()} · {e.eventId}
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100">
                {tryFormat(e.body)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function tryFormat(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
