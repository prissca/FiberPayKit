# FiberPayKit Architecture

## Components

| Component | Package | Responsibility |
| --- | --- | --- |
| API | `apps/api` | Fastify HTTP API, auth, invoice/webhook services, Fiber clients, in-process workers |
| Web | `apps/web` | Next.js hosted checkout, merchant dashboard, demo store |
| SDK | `packages/sdk` | `@fiberpaykit/sdk` — API client + webhook verification |
| Shared | `packages/shared` | Types + Zod schemas shared across packages |

## Data flow

```
             ┌──────────────┐   POST /v1/invoices    ┌───────────────────────┐
             │ Merchant App │ ─────────────────────▶ │   FiberPayKit API      │
             │  (or SDK)    │ ◀───────────────────── │  (Fastify)             │
             └──────┬───────┘   invoice + checkoutUrl └───────┬───────────────┘
                    │ redirect user                          │
                    ▼                                         │ createInvoice()
             ┌──────────────┐   GET /checkout/:id     ┌───────▼───────────────┐
             │   Checkout   │ ◀───────────────────── │   FiberClient         │
             │   (Next.js)  │   view model + QR       │  mock | fiber-rpc     │
             └──────────────┘                         └───────┬───────────────┘
                                                              │ JSON-RPC 2.0
                                                              ▼
                                                     ┌───────────────────────┐
                                                     │   Fiber Network Node   │
                                                     └───────────────────────┘

   ┌──────────────────┐   every 5s     ┌───────────────┐   status change
   │  Invoice Poller  │ ─────────────▶ │  FiberClient  │ ───────────────┐
   │  (in-process)    │   getInvoice() └───────────────┘                │
   └──────────────────┘                                                 ▼
                                                       ┌────────────────────────────┐
                                                       │ emitInvoiceEvent()          │
                                                       │  → WebhookEvent             │
                                                       │  → WebhookDelivery (per ep) │
                                                       └───────────┬────────────────┘
                                                                   │ enqueue (BullMQ)
                                                                   ▼
                                        ┌───────────────┐   signed POST   ┌────────────────────┐
                                        │ Webhook Worker │ ─────────────▶ │ Merchant Endpoint  │
                                        │ (retries)      │ ◀───────────── │ (verify signature) │
                                        └───────────────┘    2xx / fail   └────────────────────┘
```

## Key design decisions

- **Internal types are decoupled from the Fiber RPC wire format.** Everything
  the app touches uses `packages/shared` + `apps/api/src/fiber/types.ts`. The
  RPC adapter normalizes responses so upstream Fiber schema churn stays isolated.
- **Money is always an integer string in base units.** Arithmetic uses `BigInt`.
  No floats anywhere in the money path.
- **Workers run in-process for the demo** (`pnpm dev` = one command) but are
  written so they can be split into standalone processes for scale.
- **Graceful degradation:** if Redis is unavailable, webhooks deliver inline and
  the poller sweeps due retries — the demo still works end to end.
- **The Fiber RPC URL and secrets never reach the browser.** The checkout view
  model is a curated, non-sensitive projection.

## Status normalization

| Fiber status | Internal status | Webhook event |
| --- | --- | --- |
| OPEN | `open` | `invoice.open` |
| PAID / Settled | `paid` | `invoice.paid` |
| EXPIRED | `expired` | `invoice.expired` |
| CANCELED | `canceled` | `invoice.canceled` |
| FAILED | `failed` | `invoice.failed` |

Terminal states (`paid`/`expired`/`canceled`/`failed`) are never moved away from,
making transitions idempotent under repeated polling.
