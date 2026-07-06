/**
 * MockFiberClient — an in-memory Fiber node simulator used for the default
 * demo so the whole system works without a real Fiber node.
 *
 * It generates realistic invoice addresses and payment hashes, tracks status,
 * and exposes helpers (markPaid / markFailed / expire) that the /demo routes
 * call so a presenter can drive the demo interactively.
 */
import { randomBytes } from "node:crypto";
import type {
  CancelFiberInvoiceInput,
  CreateFiberInvoiceInput,
  CreateFiberInvoiceResult,
  FiberChannel,
  FiberClient,
  FiberInvoiceStatus,
  FiberInvoiceStatusResult,
  FiberNodeInfo,
  FiberPaymentResult,
  FiberPeer,
  GetFiberInvoiceInput,
  GetFiberPaymentInput,
  ListFiberPaymentsInput,
  ListFiberPaymentsResult,
} from "./types.js";

interface MockInvoiceRecord {
  paymentHash: string;
  invoiceAddress: string;
  amount: string;
  currency: string;
  status: FiberInvoiceStatus;
  createdAt: string;
  expiresAt: string;
  settledAt: string | null;
  fee: string | null;
  referenceId?: string;
}

function hex(bytes: number): string {
  return "0x" + randomBytes(bytes).toString("hex");
}

function fiberAddress(): string {
  // Resembles a bech32-ish Fiber invoice string for realism.
  return "fibt" + randomBytes(24).toString("hex");
}

export class MockFiberClient implements FiberClient {
  private readonly invoices = new Map<string, MockInvoiceRecord>();
  private readonly pubkey = "0x" + randomBytes(33).toString("hex");

  async getNodeInfo(): Promise<FiberNodeInfo> {
    return {
      reachable: true,
      pubkey: this.pubkey,
      version: "mock-fiber-0.1.0",
      chainHash: hex(32),
      raw: { mock: true, node_name: "FiberPayKit Mock Node" },
    };
  }

  async createInvoice(
    input: CreateFiberInvoiceInput
  ): Promise<CreateFiberInvoiceResult> {
    const now = Date.now();
    const record: MockInvoiceRecord = {
      paymentHash: hex(32),
      invoiceAddress: fiberAddress(),
      amount: input.amount,
      currency: input.currency,
      status: "OPEN",
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + input.expiry * 1000).toISOString(),
      settledAt: null,
      fee: null,
      referenceId: input.referenceId,
    };
    this.invoices.set(record.paymentHash, record);
    return {
      invoiceAddress: record.invoiceAddress,
      paymentHash: record.paymentHash,
      amount: record.amount,
      currency: record.currency,
      status: record.status,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      raw: {
        mock: true,
        allow_mpp: input.allowMpp ?? false,
        allow_trampoline_routing: input.allowTrampolineRouting ?? false,
        udt_type_script: input.udtTypeScript ?? null,
        fallback_address: input.fallbackAddress ?? null,
        description: input.description ?? null,
        ...record,
      },
    };
  }

  private touchExpiry(record: MockInvoiceRecord): void {
    if (
      record.status === "OPEN" &&
      new Date(record.expiresAt).getTime() < Date.now()
    ) {
      record.status = "EXPIRED";
    }
  }

  async getInvoice(
    input: GetFiberInvoiceInput
  ): Promise<FiberInvoiceStatusResult> {
    const record = this.invoices.get(input.paymentHash);
    if (!record) {
      // Unknown to the mock node — report FAILED so the poller can react.
      return {
        paymentHash: input.paymentHash,
        invoiceAddress: input.invoiceAddress ?? null,
        status: "FAILED",
        raw: { mock: true, error: "invoice_not_found" },
      };
    }
    this.touchExpiry(record);
    return this.toStatusResult(record);
  }

  async cancelInvoice(
    input: CancelFiberInvoiceInput
  ): Promise<FiberInvoiceStatusResult> {
    const record = this.invoices.get(input.paymentHash);
    if (!record) {
      return {
        paymentHash: input.paymentHash,
        invoiceAddress: input.invoiceAddress ?? null,
        status: "CANCELED",
        raw: { mock: true, note: "canceled_unknown_invoice" },
      };
    }
    if (record.status === "OPEN") record.status = "CANCELED";
    return this.toStatusResult(record);
  }

  async listPayments(
    input?: ListFiberPaymentsInput
  ): Promise<ListFiberPaymentsResult> {
    const all = [...this.invoices.values()]
      .filter((r) => r.status === "PAID")
      .slice(0, input?.limit ?? 100)
      .map((r) => this.toPaymentResult(r));
    return { payments: all };
  }

  async getPayment(input: GetFiberPaymentInput): Promise<FiberPaymentResult> {
    const record = this.invoices.get(input.paymentHash);
    if (!record) {
      return {
        paymentHash: input.paymentHash,
        status: "FAILED",
        raw: { mock: true, error: "payment_not_found" },
      };
    }
    return this.toPaymentResult(record);
  }

  async listChannels(): Promise<FiberChannel[]> {
    return [
      {
        channelId: hex(32),
        peerId: this.pubkey,
        state: "CHANNEL_READY",
        localBalance: "500000000000",
        remoteBalance: "500000000000",
        raw: { mock: true },
      },
    ];
  }

  async listPeers(): Promise<FiberPeer[]> {
    return [
      {
        peerId: this.pubkey,
        address: "/ip4/127.0.0.1/tcp/8228",
        connected: true,
        raw: { mock: true },
      },
    ];
  }

  // --- Demo controls (called by /demo routes) --------------------------------

  markPaid(paymentHash: string): FiberInvoiceStatusResult | null {
    const record = this.invoices.get(paymentHash);
    if (!record) return null;
    record.status = "PAID";
    record.settledAt = new Date().toISOString();
    record.fee = "1000"; // demo fee in base units
    return this.toStatusResult(record);
  }

  markFailed(paymentHash: string): FiberInvoiceStatusResult | null {
    const record = this.invoices.get(paymentHash);
    if (!record) return null;
    record.status = "FAILED";
    return this.toStatusResult(record);
  }

  expire(paymentHash: string): FiberInvoiceStatusResult | null {
    const record = this.invoices.get(paymentHash);
    if (!record) return null;
    if (record.status === "OPEN") record.status = "EXPIRED";
    return this.toStatusResult(record);
  }

  private toStatusResult(record: MockInvoiceRecord): FiberInvoiceStatusResult {
    return {
      paymentHash: record.paymentHash,
      invoiceAddress: record.invoiceAddress,
      status: record.status,
      amount: record.amount,
      currency: record.currency,
      settledAt: record.settledAt,
      fee: record.fee,
      raw: { mock: true, ...record },
    };
  }

  private toPaymentResult(record: MockInvoiceRecord): FiberPaymentResult {
    return {
      paymentHash: record.paymentHash,
      status: record.status,
      amount: record.amount,
      fee: record.fee,
      raw: { mock: true, ...record },
    };
  }
}

/**
 * The mock client is a process-wide singleton so the /demo routes and the
 * invoice poller share the same in-memory state.
 */
let singleton: MockFiberClient | null = null;
export function getMockFiberClient(): MockFiberClient {
  if (!singleton) singleton = new MockFiberClient();
  return singleton;
}
