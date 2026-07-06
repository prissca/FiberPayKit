/**
 * FiberRpcClient — talks to a real Fiber Network Node over JSON-RPC 2.0.
 *
 * IMPORTANT: this runs on the backend ONLY. FIBER_RPC_URL must never reach the
 * browser. Responses are normalized into our internal Fiber types because the
 * Fiber RPC API surface may evolve.
 *
 * The exact field names of the Fiber RPC are still stabilizing upstream, so
 * every mapping below is defensive: it reads several plausible field names and
 * falls back gracefully. Adjust `mapInvoiceStatus` / field readers as the
 * upstream Fiber RPC schema firms up.
 */
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

interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: number | string;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export interface FiberRpcClientOptions {
  rpcUrl: string;
  timeoutMs: number;
  fallbackAddress?: string;
  allowMpp?: boolean;
  allowTrampolineRouting?: boolean;
  fetchImpl?: typeof fetch;
}

export class FiberRpcError extends Error {
  readonly rpcCode?: number;
  constructor(message: string, rpcCode?: number) {
    super(message);
    this.name = "FiberRpcError";
    this.rpcCode = rpcCode;
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return (v ?? {}) as Record<string, unknown>;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export class FiberRpcClient implements FiberClient {
  private idCounter = 0;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: FiberRpcClientOptions) {
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  }

  /** Perform a single JSON-RPC 2.0 call with timeout + error handling. */
  private async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.opts.timeoutMs
    );
    try {
      const res = await this.fetchImpl(this.opts.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: ++this.idCounter,
          method,
          params,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new FiberRpcError(
          `Fiber RPC ${method} HTTP ${res.status}`,
          res.status
        );
      }
      const body = (await res.json()) as JsonRpcResponse<T>;
      if (body.error) {
        throw new FiberRpcError(
          `Fiber RPC ${method} error: ${body.error.message}`,
          body.error.code
        );
      }
      return body.result as T;
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        throw new FiberRpcError(`Fiber RPC ${method} timed out`);
      }
      if (e instanceof FiberRpcError) throw e;
      throw new FiberRpcError(
        `Fiber RPC ${method} failed: ${(e as Error).message}`
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async getNodeInfo(): Promise<FiberNodeInfo> {
    try {
      const raw = await this.call<unknown>("node_info");
      const r = asRecord(raw);
      return {
        reachable: true,
        pubkey:
          str(r.node_id) ??
          str(r.public_key) ??
          str(r.pubkey) ??
          str(r.peer_id) ??
          null,
        version: str(r.version) ?? null,
        chainHash: str(r.chain_hash) ?? null,
        raw,
      };
    } catch (e) {
      return {
        reachable: false,
        pubkey: null,
        raw: { error: (e as Error).message },
      };
    }
  }

  async createInvoice(
    input: CreateFiberInvoiceInput
  ): Promise<CreateFiberInvoiceResult> {
    const params = {
      amount: input.amount,
      description: input.description,
      currency: input.currency,
      expiry: input.expiry,
      fallback_address: input.fallbackAddress ?? this.opts.fallbackAddress,
      udt_type_script: input.udtTypeScript,
      allow_mpp: input.allowMpp ?? this.opts.allowMpp,
      allow_trampoline_routing:
        input.allowTrampolineRouting ?? this.opts.allowTrampolineRouting,
    };
    const raw = await this.call<unknown>("new_invoice", [params]);
    const r = asRecord(raw);
    const invoiceAddress =
      str(r.invoice_address) ??
      str(r.invoice) ??
      str(r.address) ??
      str(asRecord(r.invoice).invoice_address) ??
      "";
    const paymentHash =
      str(r.payment_hash) ??
      str(asRecord(r.invoice).payment_hash) ??
      str(r.hash) ??
      "";
    const now = Date.now();
    return {
      invoiceAddress,
      paymentHash,
      amount: input.amount,
      currency: input.currency,
      status: "OPEN",
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + input.expiry * 1000).toISOString(),
      raw,
    };
  }

  async getInvoice(
    input: GetFiberInvoiceInput
  ): Promise<FiberInvoiceStatusResult> {
    const raw = await this.call<unknown>("get_invoice", [
      { payment_hash: input.paymentHash },
    ]);
    const r = asRecord(raw);
    return {
      paymentHash: input.paymentHash,
      invoiceAddress:
        str(r.invoice_address) ?? input.invoiceAddress ?? null,
      status: this.mapInvoiceStatus(str(r.status) ?? str(r.state)),
      amount: str(r.amount),
      currency: str(r.currency),
      settledAt: str(r.settled_at) ?? null,
      fee: str(r.fee) ?? null,
      raw,
    };
  }

  async cancelInvoice(
    input: CancelFiberInvoiceInput
  ): Promise<FiberInvoiceStatusResult> {
    const raw = await this.call<unknown>("cancel_invoice", [
      { payment_hash: input.paymentHash },
    ]);
    const r = asRecord(raw);
    return {
      paymentHash: input.paymentHash,
      invoiceAddress:
        str(r.invoice_address) ?? input.invoiceAddress ?? null,
      status: this.mapInvoiceStatus(str(r.status) ?? "CANCELED"),
      raw,
    };
  }

  async listPayments(
    input?: ListFiberPaymentsInput
  ): Promise<ListFiberPaymentsResult> {
    const raw = await this.call<unknown>("list_payments", [
      { limit: input?.limit ?? 100 },
    ]);
    const r = asRecord(raw);
    const list = Array.isArray(r.payments)
      ? (r.payments as unknown[])
      : Array.isArray(raw)
        ? (raw as unknown[])
        : [];
    return {
      payments: list.map((p) => this.mapPayment(p)),
    };
  }

  async getPayment(input: GetFiberPaymentInput): Promise<FiberPaymentResult> {
    const raw = await this.call<unknown>("get_payment", [
      { payment_hash: input.paymentHash },
    ]);
    return this.mapPayment(raw);
  }

  async listChannels(): Promise<FiberChannel[]> {
    const raw = await this.call<unknown>("list_channels");
    const r = asRecord(raw);
    const list = Array.isArray(r.channels)
      ? (r.channels as unknown[])
      : Array.isArray(raw)
        ? (raw as unknown[])
        : [];
    return list.map((c) => {
      const cr = asRecord(c);
      return {
        channelId:
          str(cr.channel_id) ?? str(cr.id) ?? str(cr.channel_outpoint) ?? "",
        peerId: str(cr.peer_id),
        state: str(cr.state),
        localBalance: str(cr.local_balance),
        remoteBalance: str(cr.remote_balance),
        raw: c,
      };
    });
  }

  async listPeers(): Promise<FiberPeer[]> {
    const raw = await this.call<unknown>("list_peers");
    const r = asRecord(raw);
    const list = Array.isArray(r.peers)
      ? (r.peers as unknown[])
      : Array.isArray(raw)
        ? (raw as unknown[])
        : [];
    return list.map((p) => {
      const pr = asRecord(p);
      return {
        peerId: str(pr.peer_id) ?? str(pr.pubkey) ?? "",
        address: str(pr.address),
        connected: Boolean(pr.connected),
        raw: p,
      };
    });
  }

  private mapPayment(raw: unknown): FiberPaymentResult {
    const r = asRecord(raw);
    return {
      paymentHash: str(r.payment_hash) ?? str(r.hash) ?? "",
      status: this.mapInvoiceStatus(str(r.status) ?? str(r.state)),
      amount: str(r.amount),
      fee: str(r.fee) ?? null,
      raw,
    };
  }

  /** Normalize the many possible Fiber status spellings into our enum. */
  private mapInvoiceStatus(status?: string): FiberInvoiceStatus {
    const s = (status ?? "").toLowerCase();
    if (["paid", "settled", "complete", "success", "succeeded"].includes(s)) {
      return "PAID";
    }
    if (["expired", "timeout"].includes(s)) return "EXPIRED";
    if (["canceled", "cancelled"].includes(s)) return "CANCELED";
    if (["failed", "error"].includes(s)) return "FAILED";
    return "OPEN";
  }
}
