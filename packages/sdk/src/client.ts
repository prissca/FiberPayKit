/**
 * FiberPayKit API client.
 *
 * Usage:
 *   const client = new FiberPayKit({ apiKey, baseUrl: "http://localhost:4000" });
 *   const invoice = await client.invoices.create({ ... });
 */
import type {
  CreateInvoiceParams,
  FiberPayKitOptions,
  Invoice,
  ListInvoicesParams,
  Paginated,
} from "./types.js";

export class FiberPayKitError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = "FiberPayKitError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class FiberPayKit {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  readonly invoices: InvoicesResource;

  constructor(options: FiberPayKitOptions) {
    if (!options.apiKey) throw new Error("FiberPayKit: apiKey is required");
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "http://localhost:4000").replace(
      /\/+$/,
      ""
    );
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error(
        "FiberPayKit: global fetch is not available; pass options.fetch"
      );
    }
    this.invoices = new InvoicesResource(this);
  }

  /** Low-level request helper. Exposed for resource classes. */
  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>
  ): Promise<T> {
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await res.text();
      const parsed = text ? safeJson(text) : undefined;

      if (!res.ok) {
        const err = (parsed as { error?: { message?: string; code?: string } })
          ?.error;
        throw new FiberPayKitError(
          err?.message ?? `Request failed with status ${res.status}`,
          res.status,
          err?.code,
          parsed
        );
      }
      return parsed as T;
    } catch (e) {
      if (e instanceof FiberPayKitError) throw e;
      if ((e as Error).name === "AbortError") {
        throw new FiberPayKitError("Request timed out", 0, "timeout");
      }
      throw new FiberPayKitError((e as Error).message, 0, "network_error");
    } finally {
      clearTimeout(timeout);
    }
  }

  /** GET /v1/merchant/me */
  me() {
    return this.request<unknown>("GET", "/v1/merchant/me");
  }

  /** GET /health */
  health() {
    return this.request<unknown>("GET", "/health");
  }
}

class InvoicesResource {
  constructor(private readonly kit: FiberPayKit) {}

  create(params: CreateInvoiceParams): Promise<Invoice> {
    return this.kit.request<Invoice>("POST", "/v1/invoices", params);
  }

  retrieve(id: string): Promise<Invoice> {
    return this.kit.request<Invoice>("GET", `/v1/invoices/${id}`);
  }

  cancel(id: string, reason?: string): Promise<Invoice> {
    return this.kit.request<Invoice>("POST", `/v1/invoices/${id}/cancel`, {
      reason,
    });
  }

  list(params: ListInvoicesParams = {}): Promise<Paginated<Invoice>> {
    return this.kit.request<Paginated<Invoice>>(
      "GET",
      "/v1/invoices",
      undefined,
      {
        status: params.status,
        currency: params.currency,
        orderId: params.orderId,
        from: params.from,
        to: params.to,
        cursor: params.cursor,
        limit: params.limit,
      }
    );
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
