"use client";

import { useState } from "react";
import { apiAuthed } from "@/lib/api";

interface CreatedInvoice {
  id: string;
  checkoutUrl: string;
}

export default function StorePage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const invoice = await apiAuthed<CreatedInvoice>("/v1/invoices", {
        method: "POST",
        body: JSON.stringify({
          orderId: `ORDER-${Math.floor(Math.random() * 9000 + 1000)}`,
          amount: "100000000",
          currency: "CKB",
          description: "Fiber Test Mug",
          expiresInSeconds: 900,
          metadata: { source: "demo-store", product: "fiber-test-mug" },
          checkout: {
            successUrl: `${window.location.origin}/store?paid=1`,
            cancelUrl: `${window.location.origin}/store`,
          },
        }),
      });
      // Redirect to the hosted checkout page.
      window.location.href = `/checkout/${invoice.id}`;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="card overflow-hidden">
        <div className="flex h-56 items-center justify-center bg-gradient-to-br from-brand-light to-white text-7xl">
          ☕
        </div>
        <div className="space-y-4 p-6">
          <div>
            <h1 className="text-xl font-semibold">Fiber Test Mug</h1>
            <p className="text-sm text-neutral-500">
              A ceramic mug for testing Fiber Network payments. Ships nowhere —
              it&apos;s a demo!
            </p>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold">
              100000000{" "}
              <span className="text-base font-medium text-neutral-500">CKB</span>
            </span>
          </div>
          <button className="btn-primary w-full" onClick={pay} disabled={busy}>
            {busy ? "Creating invoice…" : "Pay with Fiber"}
          </button>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <p className="text-center text-xs text-neutral-400">
            Powered by FiberPayKit · demo merchant · mock Fiber mode
          </p>
        </div>
      </div>
    </div>
  );
}
