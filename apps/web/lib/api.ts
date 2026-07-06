/**
 * Browser API client for the FiberPayKit web app.
 *
 * SECURITY: this file runs in the browser. It only ever references the public
 * API base URL and the demo API key (NEXT_PUBLIC_*). The Fiber RPC URL and
 * webhook/encryption secrets live exclusively on the API server.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export const WEB_URL =
  process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";

/**
 * For the hackathon demo the dashboard authenticates as the seeded demo
 * merchant. In a real deployment this would come from a login session.
 */
export const DEMO_API_KEY =
  process.env.NEXT_PUBLIC_DEMO_API_KEY || "fpk_test_demo";

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  const body = text ? safeJson(text) : undefined;
  if (!res.ok) {
    const message =
      (body as { error?: { message?: string } })?.error?.message ??
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Authenticated (merchant) fetch — used by the dashboard. */
export async function apiAuthed<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEMO_API_KEY}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  return handle<T>(res);
}

/** Public (no key) fetch — used by the hosted checkout page. */
export async function apiPublic<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  return handle<T>(res);
}

export function reconciliationCsvUrl(): string {
  return `${API_URL}/v1/reconciliation/export.csv`;
}

// ---- Shared view types (kept minimal + local to avoid cross-package build) ---

export type InvoiceStatus =
  | "open"
  | "paid"
  | "expired"
  | "canceled"
  | "failed";

export interface CheckoutView {
  id: string;
  merchantName: string;
  orderId: string;
  amount: string;
  displayAmount: string;
  currency: string;
  description?: string | null;
  status: InvoiceStatus;
  fiberInvoiceAddress: string | null;
  fiberPaymentHash: string | null;
  qrCodeDataUrl: string;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  failedReason: string | null;
  checkoutSuccessUrl?: string | null;
  checkoutCancelUrl?: string | null;
  mode: "mock" | "fiber-rpc";
  demoControlsEnabled: boolean;
}

export interface InvoiceView {
  id: string;
  status: InvoiceStatus;
  orderId: string;
  amount: string;
  currency: string;
  checkoutUrl: string;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  fiber: { invoiceAddress: string | null; paymentHash: string | null };
}

export interface DashboardSummary {
  totalInvoices: number;
  paidInvoices: number;
  openInvoices: number;
  failedOrExpiredInvoices: number;
  canceledInvoices: number;
  receivedByCurrency: Record<string, string>;
  webhookSuccessRate: number | null;
  webhookDeliveries: { total: number; succeeded: number };
  mode: "mock" | "fiber-rpc";
  fiberNode: { reachable: boolean; pubkey: string | null };
  recentInvoices: InvoiceView[];
}

export interface WebhookDeliveryView {
  id: string;
  eventId: string;
  eventType: string | null;
  status: "pending" | "succeeded" | "failed" | "abandoned";
  attemptCount: number;
  nextAttemptAt: string | null;
  lastAttemptAt: string | null;
  responseStatus: number | null;
  errorMessage: string | null;
  requestUrl: string;
  createdAt: string;
}
