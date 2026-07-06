"use client";

import { useEffect, useState, useCallback } from "react";
import { apiPublic, API_URL, type CheckoutView } from "@/lib/api";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { CopyButton } from "./CopyButton";
import { LogoMark } from "./Logo";

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
      <div className="panel mx-auto max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-lime/15 text-4xl text-lime shadow-glow-lime">
          ✓
        </div>
        <h1 className="text-2xl font-bold">
          Payment <span className="holo-text">confirmed</span>
        </h1>
        <p className="mt-1 text-sm text-[#93a0c4]">{invoice.merchantName}</p>
        <dl className="mt-6 space-y-1">
          <Row label="Order">{invoice.orderId}</Row>
          <Row label="Amount">
            {invoice.amount} {invoice.currency}
          </Row>
          <Row label="Status">
            <InvoiceStatusBadge status={invoice.status} />
          </Row>
          <Row label="Payment hash">
            <span className="mono text-xs">{invoice.fiberPaymentHash}</span>
          </Row>
        </dl>
        {invoice.checkoutSuccessUrl && (
          <a className="btn-lime mt-6 w-full" href={invoice.checkoutSuccessUrl}>
            Return to merchant →
          </a>
        )}
      </div>
    );
  }

  const terminal = ["expired", "canceled", "failed"].includes(invoice.status);

  return (
    <div className="panel mx-auto max-w-md overflow-hidden">
      {/* Header band */}
      <div className="relative overflow-hidden border-b border-edge px-6 py-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet/20 via-transparent to-cyan/20" />
        <div className="relative flex items-center gap-3">
          <LogoMark size={30} />
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[#7f8bb0]">
              FiberPayKit Checkout
            </p>
            <h1 className="font-bold text-white">{invoice.merchantName}</h1>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="label">Order</p>
            <p className="font-semibold text-white">{invoice.orderId}</p>
          </div>
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="label">Amount</p>
            <p className="text-3xl font-bold holo-text">{invoice.amount}</p>
            <p className="text-xs text-[#7f8bb0]">
              {invoice.currency} · ≈ {invoice.displayAmount} (display)
            </p>
          </div>
          {!terminal && (
            <div className="panel-inset px-3 py-2 text-right">
              <p className="label">Expires</p>
              <p className="font-mono text-lg text-cyan-soft neon-cyan">
                {countdown}
              </p>
            </div>
          )}
        </div>

        {!terminal && (
          <div className="panel-inset flex flex-col items-center gap-3 p-4">
            <div className="rounded-xl bg-white p-2 shadow-glow-cyan">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={invoice.qrCodeDataUrl}
                alt="Fiber invoice QR code"
                className="h-52 w-52 rounded-md"
              />
            </div>
            <p className="text-xs text-[#7f8bb0]">
              Scan with a Fiber-compatible wallet
            </p>
          </div>
        )}

        <div>
          <p className="label mb-1.5">Fiber invoice</p>
          <div className="flex items-center gap-2">
            <code className="mono flex-1 rounded-lg border border-edge bg-black/30 px-3 py-2 text-xs">
              {invoice.fiberInvoiceAddress ?? "—"}
            </code>
            {invoice.fiberInvoiceAddress && (
              <CopyButton value={invoice.fiberInvoiceAddress} label="Copy" />
            )}
          </div>
        </div>

        {terminal ? (
          <p className="panel-inset px-3 py-2 text-center text-sm text-amber-300">
            This invoice is {invoice.status}.
            {invoice.failedReason ? ` (${invoice.failedReason})` : ""}
          </p>
        ) : (
          <p className="flex items-center justify-center gap-2 text-sm text-[#93a0c4]">
            <span className="dot dot-live animate-pulseGlow" />
            Waiting for payment…
          </p>
        )}

        {invoice.demoControlsEnabled && !terminal && (
          <div className="panel-inset p-3">
            <p className="label mb-2">Demo controls · mock mode</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                className="btn-lime"
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
    <div className="flex items-center justify-between border-b border-edge py-2">
      <dt className="label">{label}</dt>
      <dd className="text-sm font-medium text-white">{children}</dd>
    </div>
  );
}
