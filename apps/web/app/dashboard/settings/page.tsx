"use client";

import { useEffect, useState } from "react";
import { apiAuthed } from "@/lib/api";
import { MerchantApiKeyBox } from "@/components/MerchantApiKeyBox";

interface MerchantMe {
  id: string;
  name: string;
  email: string;
  apiKeyPrefix: string;
  createdAt: string;
}

interface Health {
  mode: "mock" | "fiber-rpc";
  fiberNode: { reachable: boolean; pubkey: string | null };
}

export default function SettingsPage() {
  const [me, setMe] = useState<MerchantMe | null>(null);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    apiAuthed<MerchantMe>("/v1/merchant/me").then(setMe).catch(() => undefined);
    apiAuthed<Health>("/health").then(setHealth).catch(() => undefined);
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Merchant</h2>
        {me ? (
          <dl className="space-y-2 text-sm">
            <Row label="Name">{me.name}</Row>
            <Row label="Email">{me.email}</Row>
            <Row label="Merchant ID">
              <span className="mono">{me.id}</span>
            </Row>
          </dl>
        ) : (
          <p className="text-sm text-neutral-500">Loading…</p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-semibold">API credentials</h2>
        <MerchantApiKeyBox
          apiKeyPrefix={me?.apiKeyPrefix ?? "fpk_test_"}
          webhookSecret="whsec_demo_secret_do_not_use_in_prod"
        />
      </div>

      <div className="card p-5 lg:col-span-2">
        <h2 className="mb-4 font-semibold">Fiber integration</h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Row label="Mode">
            <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">
              {health?.mode ?? "—"}
            </span>
          </Row>
          <Row label="Node status">
            <span className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  health?.fiberNode.reachable ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {health?.fiberNode.reachable ? "Reachable" : "Unreachable"}
            </span>
          </Row>
          <Row label="RPC URL">
            <span className="text-neutral-400">
              hidden (server-side only) ••••••••
            </span>
          </Row>
        </dl>
        <p className="mt-4 text-xs text-neutral-400">
          The Fiber RPC URL is never exposed to the browser. All Fiber RPC calls
          happen on the API server. Switch modes with the{" "}
          <code className="mono">FIBER_MODE</code> environment variable.
        </p>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-neutral-800">{children}</dd>
    </div>
  );
}
