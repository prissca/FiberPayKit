/**
 * Fiber integration types.
 *
 * The `FiberClient` interface is the internal contract used by services and
 * workers. Both MockFiberClient and FiberRpcClient implement it. The RPC-wire
 * shapes are normalized into these types so the rest of the codebase never
 * depends on the exact Fiber JSON-RPC response format (which may change).
 */

export type FiberInvoiceStatus =
  | "OPEN"
  | "PAID"
  | "EXPIRED"
  | "CANCELED"
  | "FAILED";

export interface FiberNodeInfo {
  reachable: boolean;
  pubkey: string | null;
  version?: string | null;
  chainHash?: string | null;
  raw?: unknown;
}

export interface UdtTypeScript {
  code_hash: string;
  hash_type: "type" | "data" | "data1" | "data2";
  args: string;
}

export interface CreateFiberInvoiceInput {
  /** Base-unit amount as a string. */
  amount: string;
  description?: string;
  currency: string;
  /** Expiry in seconds. */
  expiry: number;
  fallbackAddress?: string;
  /** Present for multi-asset (CUSTOM_UDT) invoices. */
  udtTypeScript?: UdtTypeScript;
  allowMpp?: boolean;
  allowTrampolineRouting?: boolean;
  /** Our internal invoice id, passed through for correlation in mock mode. */
  referenceId?: string;
}

export interface CreateFiberInvoiceResult {
  invoiceAddress: string;
  paymentHash: string;
  amount: string;
  currency: string;
  status: FiberInvoiceStatus;
  createdAt: string;
  expiresAt: string;
  /** Full raw provider response, stored for debugging. */
  raw: unknown;
}

export interface GetFiberInvoiceInput {
  paymentHash: string;
  invoiceAddress?: string;
}

export interface FiberInvoiceStatusResult {
  paymentHash: string;
  invoiceAddress: string | null;
  status: FiberInvoiceStatus;
  amount?: string;
  currency?: string;
  settledAt?: string | null;
  fee?: string | null;
  raw: unknown;
}

export interface CancelFiberInvoiceInput {
  paymentHash: string;
  invoiceAddress?: string;
}

export interface ListFiberPaymentsInput {
  limit?: number;
}

export interface FiberPaymentResult {
  paymentHash: string;
  status: FiberInvoiceStatus;
  amount?: string;
  fee?: string | null;
  raw: unknown;
}

export interface ListFiberPaymentsResult {
  payments: FiberPaymentResult[];
}

export interface GetFiberPaymentInput {
  paymentHash: string;
}

export interface FiberChannel {
  channelId: string;
  peerId?: string;
  state?: string;
  localBalance?: string;
  remoteBalance?: string;
  raw?: unknown;
}

export interface FiberPeer {
  peerId: string;
  address?: string;
  connected?: boolean;
  raw?: unknown;
}

export interface FiberClient {
  getNodeInfo(): Promise<FiberNodeInfo>;
  createInvoice(
    input: CreateFiberInvoiceInput
  ): Promise<CreateFiberInvoiceResult>;
  getInvoice(input: GetFiberInvoiceInput): Promise<FiberInvoiceStatusResult>;
  cancelInvoice(
    input: CancelFiberInvoiceInput
  ): Promise<FiberInvoiceStatusResult>;
  listPayments(
    input?: ListFiberPaymentsInput
  ): Promise<ListFiberPaymentsResult>;
  getPayment(input: GetFiberPaymentInput): Promise<FiberPaymentResult>;
  listChannels(): Promise<FiberChannel[]>;
  listPeers(): Promise<FiberPeer[]>;
}

/** Map a Fiber status to our internal invoice status. */
export function normalizeFiberStatus(
  status: FiberInvoiceStatus
):
  | "open"
  | "paid"
  | "expired"
  | "canceled"
  | "failed" {
  switch (status) {
    case "OPEN":
      return "open";
    case "PAID":
      return "paid";
    case "EXPIRED":
      return "expired";
    case "CANCELED":
      return "canceled";
    case "FAILED":
      return "failed";
    default:
      return "open";
  }
}
