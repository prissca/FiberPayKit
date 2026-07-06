"use client";

import { useEffect, useState, useCallback } from "react";
import { apiPublic, API_URL, type CheckoutView } from "@/lib/api";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { CopyButton } from "./CopyButton";

function useCountdown(expiresAt: string) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now())
  );
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const totalSeconds = Math.floor(remaining / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return { label: `${mm}:${ss}`, expired: remaining <= 0 };
}

export function CheckoutCard({ initial }: { initial: CheckoutView }) {
  const [invoice, setInvoice] = useState<CheckoutView>(initial);
  const [busy, setBusy] = useState(false);
  const { label: countdown } = useCountdown(invoice.expiresAt);

  const refresh = useCallback(async () => {
    try {
      const data = await apiPublic<CheckoutView>(`/checkout/${invoice.id}`);
      setInvoice(data);
    } catch {
      /* transient */
    }
  }, [invoice.id]);

  // Live status refresh every 3 seconds while OPEN.
  useEffect(() => {
    if (invoice.status !== "open") return;
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [invoice.status, refresh]);

  const demoAction = async (action: "mark-paid" | "mark-failed" | "expire") => {
    setBusy(true);
    try {
      await fetch(`${API_URL}/demo/invoices/${invoice.id}/${action}`, {
        method: "POST",
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (invoice.status === "paid") {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
          ✓
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">
          Payment confirmed
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{invoice.merchantName}</p>
        <dl className="mt-6 space-y-3 text-left">
          <Row label="Order">{invoice.orderId}</Row>
          <Row label="Amount">
            {invoice.amount} {invoice.currency}
          </Row>
          <Row label="Status">
            <InvoiceStatusBadge status={invoice.status} />
          </Row>
          <Row label="Payment hash">
            <span className="mono">{invoice.fiberPaymentHash}</span>
          </Row>
        </dl>
        {invoice.checkoutSuccessUrl && (
          <a
            className="btn-primary mt-6 w-full"
            href={invoice.checkoutSuccessUrl}
          >
            Return to merchant
          </a>
        )}
      </div>
    );
  }

  const terminal = ["expired", "canceled", "failed"].includes(invoice.status);

  return (
    <div className="card mx-auto max-w-md overflow-hidden">
      <div className="bg-brand px-6 py-4 text-white">
        <p className="text-sm opacity-80">FiberPayKit Checkout</p>
        <h1 className="text-lg font-semibold">{invoice.merchantName}</h1>
      </div>

      <div className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="label">Order</p>
            <p className="font-medium">{invoice.orderId}</p>
          </div>
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="label">Amount</p>
            <p className="text-2xl font-bold">
              {invoice.amount}{" "}
              <span className="text-base font-medium text-neutral-500">
                {invoice.currency}
              </span>
            </p>
            <p className="text-xs text-neutral-400">
              ≈ {invoice.displayAmount} {invoice.currency} (display)
            </p>
          </div>
          {!terminal && (
            <div className="text-right">
              <p className="label">Expires in</p>
              <p className="font-mono text-lg">{countdown}</p>
            </div>
          )}
        </div>

        {!terminal && (
          <div className="flex flex-col items-center gap-3 rounded-lg bg-neutral-50 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={invoice.qrCodeDataUrl}
              alt="Fiber invoice QR code"
              className="h-56 w-56 rounded-md bg-white p-2"
            />
            <p className="text-xs text-neutral-500">
              Scan with a Fiber-compatible wallet
            </p>
          </div>
        )}

        <div>
          <p className="label mb-1">Fiber invoice</p>
          <div className="flex items-center gap-2">
            <code className="mono flex-1 rounded-md bg-neutral-100 px-3 py-2">
              {invoice.fiberInvoiceAddress ?? "—"}
            </code>
            {invoice.fiberInvoiceAddress && (
              <CopyButton value={invoice.fiberInvoiceAddress} label="Copy" />
            )}
          </div>
        </div>

        {terminal ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
            This invoice is {invoice.status}.
            {invoice.failedReason ? ` (${invoice.failedReason})` : ""}
          </p>
        ) : (
          <p className="flex items-center justify-center gap-2 text-sm text-neutral-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
            Waiting for payment…
          </p>
        )}

        {invoice.demoControlsEnabled && !terminal && (
          <div className="rounded-lg border border-dashed border-neutral-300 p-3">
            <p className="label mb-2">Demo controls (mock mode)</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                className="btn-primary"
                disabled={busy}
                onClick={() => demoAction("mark-paid")}
              >
                Mark paid
              </button>
              <button
                className="btn-danger"
                disabled={busy}
                onClick={() => demoAction("mark-failed")}
              >
                Fail
              </button>
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() => demoAction("expire")}
              >
                Expire
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
      <dt className="label">{label}</dt>
      <dd className="text-sm font-medium text-neutral-800">{children}</dd>
    </div>
  );
}
