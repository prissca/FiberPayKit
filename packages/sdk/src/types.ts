/**
 * SDK-local types. The SDK is self-contained (no runtime dependency on the
 * FiberPayKit server package) so it can be published to npm independently.
 */

export type InvoiceStatus = "open" | "paid" | "expired" | "canceled" | "failed";
export type Currency = "CKB" | "RUSD" | "CUSTOM_UDT";

export type WebhookEventType =
  | "invoice.created"
  | "invoice.open"
  | "invoice.paid"
  | "invoice.expired"
  | "invoice.canceled"
  | "invoice.failed"
  | "webhook.delivery.failed"
  | "webhook.delivery.succeeded";

export interface UdtTypeScript {
  code_hash: string;
  hash_type: "type" | "data" | "data1" | "data2";
  args: string;
}

export interface CreateInvoiceParams {
  orderId: string;
  amount: string;
  currency?: Currency;
  description?: string;
  expiresInSeconds?: number;
  customer?: { email?: string; name?: string };
  metadata?: Record<string, unknown>;
  checkout?: { successUrl?: string; cancelUrl?: string };
  udtTypeScript?: UdtTypeScript;
  displayAmount?: string;
  settlementAsset?: string;
}

export interface Invoice {
  id: string;
  object: "invoice";
  status: InvoiceStatus;
  orderId: string;
  amount: string;
  currency: Currency;
  description?: string | null;
  fiber: { invoiceAddress: string | null; paymentHash: string | null };
  metadata?: Record<string, unknown> | null;
  checkoutUrl: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string | null;
  failedReason?: string | null;
}

export interface ListInvoicesParams {
  status?: InvoiceStatus;
  currency?: Currency;
  orderId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export interface Paginated<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
  total?: number;
}

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  createdAt: string;
  data: {
    invoice: {
      id: string;
      orderId: string;
      status: InvoiceStatus;
      amount: string;
      currency: Currency;
      fiber: { paymentHash: string | null; invoiceAddress: string | null };
      metadata?: Record<string, unknown> | null;
    };
  };
}

export interface FiberPayKitOptions {
  apiKey: string;
  baseUrl?: string;
  /** Request timeout in ms. Default 15000. */
  timeoutMs?: number;
  fetch?: typeof fetch;
}
