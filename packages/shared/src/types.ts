/**
 * Shared domain types for FiberPayKit.
 *
 * These are the canonical, transport-agnostic shapes used across the API,
 * SDK, and web app. They are intentionally decoupled from the Fiber RPC
 * wire format (see apps/api/src/fiber/types.ts for the RPC-facing types)
 * so the internal model stays stable even if the Fiber RPC API changes.
 */

/** Internal, normalized invoice status. */
export type InvoiceStatus =
  | "open"
  | "paid"
  | "expired"
  | "canceled"
  | "failed";

/** Supported settlement currencies / assets. */
export type Currency = "CKB" | "RUSD" | "CUSTOM_UDT";

/** Webhook event types emitted by FiberPayKit. */
export type WebhookEventType =
  | "invoice.created"
  | "invoice.open"
  | "invoice.paid"
  | "invoice.expired"
  | "invoice.canceled"
  | "invoice.failed"
  | "webhook.delivery.failed"
  | "webhook.delivery.succeeded";

/** Delivery status for a single webhook event to a single endpoint. */
export type WebhookDeliveryStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "abandoned";

/** Fiber node integration mode. */
export type FiberMode = "mock" | "fiber-rpc";

/**
 * A CKB-style type script identifying a User Defined Token (UDT).
 * Used for multi-asset (CUSTOM_UDT) invoices.
 */
export interface UdtTypeScript {
  code_hash: string;
  hash_type: "type" | "data" | "data1" | "data2";
  args: string;
}

export interface InvoiceCustomer {
  email?: string;
  name?: string;
}

export interface InvoiceCheckoutUrls {
  successUrl?: string;
  cancelUrl?: string;
}

/** Multi-asset descriptor demonstrating Fiber's multi-asset direction. */
export interface MultiAsset {
  currency: Currency;
  udtTypeScript?: UdtTypeScript;
  /** Human-friendly display amount, e.g. "1.00" for RUSD. Demo-only conversion. */
  displayAmount?: string;
  /** Asset the invoice settles in on the Fiber network. */
  settlementAsset?: string;
}

/** The public invoice shape returned by the API and SDK. */
export interface Invoice {
  id: string;
  object: "invoice";
  status: InvoiceStatus;
  orderId: string;
  amount: string;
  currency: Currency;
  description?: string | null;
  fiber: {
    invoiceAddress: string | null;
    paymentHash: string | null;
  };
  multiAsset?: MultiAsset | null;
  customer?: InvoiceCustomer | null;
  metadata?: Record<string, unknown> | null;
  checkout?: InvoiceCheckoutUrls | null;
  checkoutUrl: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string | null;
  canceledAt?: string | null;
  failedAt?: string | null;
  failedReason?: string | null;
}

export interface WebhookDeliverySummary {
  total: number;
  succeeded: number;
  failed: number;
  pending: number;
}

/** The full invoice detail including webhook delivery summary. */
export interface InvoiceDetail extends Invoice {
  webhookDeliverySummary: WebhookDeliverySummary;
}

export interface Merchant {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

/** Returned once, at merchant creation — the only time the API key is shown. */
export interface MerchantWithSecrets extends Merchant {
  apiKey: string;
  webhookSecret: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: WebhookEventType[];
  status: "active" | "disabled";
  createdAt: string;
}

export interface WebhookEventEnvelope {
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
      fiber: {
        paymentHash: string | null;
        invoiceAddress: string | null;
      };
      metadata?: Record<string, unknown> | null;
    };
  };
}

export interface WebhookDelivery {
  id: string;
  eventId: string;
  endpointId: string;
  eventType: WebhookEventType;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  nextAttemptAt: string | null;
  lastAttemptAt: string | null;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  requestUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthResponse {
  ok: boolean;
  mode: FiberMode;
  fiberNode: {
    reachable: boolean;
    pubkey: string | null;
  };
}

export interface Paginated<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
  total?: number;
}
