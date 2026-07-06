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
      <div className="panel p-5">
        <h2 className="mb-4 font-semibold text-white">Merchant</h2>
        {me ? (
          <dl className="space-y-3 text-sm">
            <Row label="Name">{me.name}</Row>
            <Row label="Email">{me.email}</Row>
            <Row label="Merchant ID">
              <span className="mono text-cyan-soft">{me.id}</span>
            </Row>
          </dl>
        ) : (
          <p className="text-sm text-[#7f8bb0]">Loading…</p>
        )}
      </div>

      <div className="panel p-5">
        <h2 className="mb-4 font-semibold text-white">API credentials</h2>
        <MerchantApiKeyBox
          apiKeyPrefix={me?.apiKeyPrefix ?? "fpk_test_"}
          webhookSecret="whsec_demo_secret_do_not_use_in_prod"
        />
      </div>

      <div className="panel p-5 lg:col-span-2">
        <h2 className="mb-4 font-semibold text-white">Fiber integration</h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Row label="Mode">
            <span className="chip !py-0.5">{health?.mode ?? "—"}</span>
          </Row>
          <Row label="Node status">
            <span className="flex items-center gap-2">
              <span
                className={`dot ${
                  health?.fiberNode.reachable
                    ? "dot-live animate-pulseGlow"
                    : "dot-off"
                }`}
              />
              {health?.fiberNode.reachable ? "Reachable" : "Unreachable"}
            </span>
          </Row>
          <Row label="RPC URL">
            <span className="text-[#5f6a8c]">hidden · server-side only ••••</span>
          </Row>
        </dl>
        <p className="mt-4 text-xs text-[#7f8bb0]">
          The Fiber RPC URL is never exposed to the browser. All Fiber RPC calls
          happen on the API server. Switch modes with the{" "}
          <code className="mono text-cyan-soft">FIBER_MODE</code> environment
          variable.
        </p>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-white">{children}</dd>
    </div>
  );
}
