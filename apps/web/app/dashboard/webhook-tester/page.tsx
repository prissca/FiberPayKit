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
      <div className="panel scanline relative overflow-hidden p-5">
        <h2 className="font-semibold text-white">Built-in webhook receiver</h2>
        <p className="mt-1 text-sm text-[#93a0c4]">
          The API ships a sample receiver at{" "}
          <code className="mono text-cyan-soft">/demo/webhook-receiver</code> that
          verifies the{" "}
          <code className="mono text-cyan-soft">FiberPayKit-Signature</code>{" "}
          header with the SDK. The last 20 events appear below — live proof that
          signed delivery works end to end.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="panel-inset px-4 py-6 text-sm text-[#7f8bb0]">
          No webhooks received yet. Create and pay an invoice to trigger one.
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="panel p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">
                  {e.eventType ?? "unknown"}
                </span>
                <span
                  className={`chip ${
                    e.signatureOk
                      ? "border-lime/30 !text-lime"
                      : "border-red-400/30 !text-red-300"
                  }`}
                >
                  <span
                    className={`dot ${e.signatureOk ? "dot-live" : "dot-off"}`}
                  />
                  {e.signatureOk ? "signature verified" : "signature invalid"}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#5f6a8c]">
                {new Date(e.receivedAt).toLocaleString()} · {e.eventId}
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-edge bg-black/40 p-3 text-xs text-[#c9d2f0]">
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
