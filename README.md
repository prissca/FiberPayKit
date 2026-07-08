# FiberPayKit ⚡

> Reusable Fiber Network merchant checkout, webhook relay, and multi-asset payment infrastructure.

**Hackathon category:** Merchant, Liquidity, LSP, and Multi-Asset Infrastructure
**Built for:** the Fiber Network Infrastructure Hackathon

FiberPayKit is **infrastructure, not a consumer product**. It gives future Fiber
merchants, wallets, and developers a batteries-included toolkit to accept Fiber
payments: a merchant REST API, a hosted checkout page, a signed webhook relay
with retries, a dashboard with reconciliation exports, and a TypeScript SDK. It
runs out of the box against a built-in **mock Fiber node**, and flips to a real
**Fiber Network JSON-RPC node** with one environment variable.

---

## Table of contents

- [Project summary](#project-summary)
- [Problem statement & the Fiber infrastructure gap](#problem-statement--the-fiber-infrastructure-gap)
- [Features](#features)
- [Architecture](#architecture)
- [How it works](#how-it-works)
- [Local setup](#local-setup)
- [Demo flow](#demo-flow)
- [API reference](#api-reference)
- [Webhook reference](#webhook-reference)
- [SDK usage](#sdk-usage)
- [Mock mode vs. real Fiber node mode](#mock-mode-vs-real-fiber-node-mode)
- [What is fully working / what is mocked](#what-is-fully-working--what-is-mocked)
- [Security notes](#security-notes)
- [Production roadmap](#production-roadmap)
- [Hackathon submission notes](#hackathon-submission-notes)

---

## Project summary

A merchant registers, gets an API key + webhook secret, configures a webhook
URL, and creates a Fiber invoice for an order. The API returns a hosted checkout
URL and Fiber invoice data. The checkout page shows a QR code and live payment
status. A background worker polls the Fiber node (or mock) for invoice status.
On a status change, a webhook worker sends **HMAC-SHA256 signed** events to the
merchant's endpoint with exponential-backoff retries. The dashboard shows
invoices, webhook attempts, node status, and CSV reconciliation exports.

## Problem statement & the Fiber infrastructure gap 

Fiber Network enables fast, low-cost, multi-asset payments — but there is no
standard, reusable "merchant acquiring" layer on top of it. Every team that
wants to accept Fiber payments has to reinvent the same plumbing:

- turning an order into a Fiber invoice,
- hosting a checkout page with a QR + live status,
- polling the node for settlement,
- notifying their backend **securely** when a payment lands,
- reconciling payments against orders.

FiberPayKit fills that gap with a **Stripe-like developer experience for Fiber**:
one API to create invoices, a hosted checkout, and signed webhooks — all generic,
open-source, and reusable by any merchant, wallet, or service.

## Features

- **Merchant REST API** — create/list/cancel invoices, manage webhook endpoints.
- **Hosted checkout page** — QR code, amount, asset, order metadata, expiry
  countdown, and live status refresh (every 3s).
- **Signed webhook relay** — HMAC-SHA256, `t=…,v1=…` signatures, exponential
  backoff (immediate → 30s → 2m → 10m → 30m), full delivery history + retry.
- **Merchant dashboard** — invoices, webhook deliveries, node status,
  webhook success rate, and one-click CSV reconciliation export.
- **TypeScript SDK** (`@fiberpaykit/sdk`) — create invoices + verify webhooks.
- **Mock Fiber mode** — a full in-memory Fiber node simulator so the demo works
  with no real node. Demo controls: mark paid / mark failed / expire.
- **Real Fiber RPC adapter** — `FiberRpcClient` speaks Fiber JSON-RPC 2.0
  (`node_info`, `new_invoice`, `get_invoice`, `cancel_invoice`, `list_payments`,
  `get_payment`, `list_channels`, `list_peers`).
- **Multi-asset ready** — CKB, RUSD, and `CUSTOM_UDT` with `udtTypeScript`,
  `displayAmount`, and `settlementAsset` fields.
- **Built-in webhook tester** — a sample receiver that verifies signatures and
  shows the last 20 received events at `/dashboard/webhook-tester`.

## Architecture

```
  Merchant App ──POST /v1/invoices──▶  FiberPayKit API ──JSON-RPC──▶  Fiber Node
       │                                    │   │                       ▲
       │  redirect                          │   │ persists              │ poll
       ▼                                    ▼   ▼                       │
  Hosted Checkout Page ◀──/checkout/:id── PostgreSQL (Prisma)     Invoice Poller
                                              │                          │
                                              ▼                          ▼
                                     Webhook Event Queue  ──▶  Webhook Worker
                                        (BullMQ + Redis)             │
                                                                     ▼
                                                       Merchant Webhook Endpoint
  Dashboard ──────────────────────────▶  FiberPayKit API
```

- **`apps/api`** — Fastify API + in-process workers (invoice poller, webhook
  worker), Prisma/PostgreSQL, BullMQ/Redis, Fiber client abstraction.
- **`apps/web`** — Next.js hosted checkout + merchant dashboard + demo store.
- **`packages/sdk`** — `@fiberpaykit/sdk` (client + `verifyWebhookSignature`).
- **`packages/shared`** — shared types + Zod schemas.

```
fiberpaykit/
  apps/
    api/     Fastify API, Prisma schema/seed, Fiber clients, workers, services
    web/     Next.js checkout + dashboard + demo store
  packages/
    sdk/     @fiberpaykit/sdk
    shared/  @fiberpaykit/shared (types + zod schemas)
  docker-compose.yml   postgres + redis + api + web
```

## How it works

1. **Invoice creation** calls `FiberClient.createInvoice()` (mock or RPC) and
   stores our internal invoice id, the Fiber invoice address, the payment hash,
   and the **full raw Fiber response as JSON** for debugging/reconciliation.
2. **Checkout** is a public, key-less view model (`GET /checkout/:id`) that also
   returns a server-generated QR data URL. The Fiber RPC URL is never exposed.
3. **The invoice poller** (every `INVOICE_POLL_INTERVAL_MS`, default 5s) finds
   open, non-expired invoices, calls `getInvoice(paymentHash)`, normalizes the
   Fiber status → internal status, expires past-due invoices, and writes status
   history on every change.
4. **On a status change**, a `WebhookEvent` is created plus one
   `WebhookDelivery` per subscribed endpoint, enqueued to BullMQ (or delivered
   inline if Redis is absent). Deliveries are signed and retried with backoff.

## Local setup

**Prerequisites:** Node ≥ 20, pnpm ≥ 9, and Docker (for Postgres + Redis).

```bash
# 1. Install
pnpm install

# 2. Env
cp .env.example .env

# 3. Infra (Postgres + Redis)
docker compose up -d postgres redis

# 4. Database
pnpm db:push        # apply schema (or `pnpm db:migrate` for migration files)
pnpm db:seed        # seed the demo merchant (API key: fpk_test_demo)

# 5. Run everything (API on :4000, web on :3000)
pnpm dev
```

Then open:

- Demo store: <http://localhost:3000/store>
- Dashboard: <http://localhost:3000/dashboard>
- API root: <http://localhost:4000/>
- Health: <http://localhost:4000/health>

> **No Redis?** The API automatically falls back to **inline webhook delivery**
> and drives retries from the poller, so the demo still works. Redis is only
> needed for the durable BullMQ queue.

> **No Postgres/Docker?** You can point `DATABASE_URL` at any PostgreSQL
> instance (e.g. a free hosted one) and run `pnpm db:migrate && pnpm db:seed`.

### Full Docker stack

```bash
docker compose up --build   # postgres + redis + api + web
```

## Live deployment (Vercel + Render)

For a judge-facing demo, deploy the **web app on Vercel** and the **API on
Render** (or Railway). Vercel is serverless and can't run the long-lived Fastify
API + background workers, so the API is hosted separately and the Vercel
frontend points at it. Default demo stays in **mock mode** (no Fiber node, no
Redis needed).

1. **API → Render:** New → Blueprint → pick this repo. [`render.yaml`](render.yaml)
   provisions the API + a free Postgres, runs `prisma db push` + seed. Copy the
   URL (e.g. `https://fiberpaykit-api.onrender.com`).
2. **Web → Vercel:** Import the repo, **set Root Directory to `apps/web`**, and
   add env vars `NEXT_PUBLIC_API_URL` (the Render URL),
   `NEXT_PUBLIC_DEMO_API_KEY=fpk_test_demo`, `NEXT_PUBLIC_WEB_URL` (the Vercel URL).
3. **Wire them:** on Render set `WEB_URL`, `API_URL`, and `CORS_ORIGINS` to your
   real URLs, then redeploy.

👉 Full step-by-step (with troubleshooting): **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

> **Setting Root Directory to `apps/web` is what fixes the Vercel build** — it
> stops Vercel from trying to build the Fastify API (which it can't host).

## Demo flow

1. `pnpm install && docker compose up -d postgres redis`
2. `pnpm db:migrate && pnpm db:seed && pnpm dev`
3. Open the **demo store** → click **"Pay with Fiber"**.
4. The API creates an invoice; you're redirected to the **hosted checkout page**.
5. The checkout page shows the **QR code**, Fiber invoice string, and countdown.
6. In **mock mode**, click **"Mark paid"**.
7. Invoice status flips to **paid**; an `invoice.paid` **event is created**.
8. The **webhook worker** signs and POSTs it to the seeded receiver.
9. `/dashboard/webhook-tester` shows the received event with **signature verified**.
10. `/dashboard` shows the invoice as paid and the webhook as **succeeded**.
11. Click **"Export reconciliation CSV"** — the paid invoice is included.

## API reference

Base URL: `http://localhost:4000`. Authenticated routes require
`Authorization: Bearer <apiKey>` (demo key: `fpk_test_demo`).

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | – | Node/mode health |
| `POST` | `/v1/merchants` | – | Register a merchant (returns key + secret once) |
| `GET` | `/v1/merchant/me` | ✅ | Current merchant |
| `POST` | `/v1/webhook-endpoints` | ✅ | Add a webhook endpoint |
| `GET` | `/v1/webhook-endpoints` | ✅ | List endpoints |
| `POST` | `/v1/invoices` | ✅ | Create an invoice |
| `GET` | `/v1/invoices` | ✅ | List invoices (filters: status, currency, orderId, from, to) |
| `GET` | `/v1/invoices/:id` | ✅ | Invoice detail + webhook delivery summary |
| `POST` | `/v1/invoices/:id/cancel` | ✅ | Cancel invoice (+ Fiber `cancel_invoice`) |
| `GET` | `/v1/webhook-deliveries` | ✅ | List deliveries |
| `GET` | `/v1/webhook-deliveries/:id` | ✅ | Delivery detail (request/response) |
| `POST` | `/v1/webhook-deliveries/:id/retry` | ✅ | Retry a delivery |
| `GET` | `/v1/reconciliation/export.csv` | ✅ | Reconciliation CSV |
| `GET` | `/v1/dashboard/summary` | ✅ | Dashboard metrics |
| `GET` | `/checkout/:id` | – | Public checkout view model (+ QR) |
| `POST` | `/demo/invoices/:id/mark-paid` | – (mock only) | Demo: mark paid |
| `POST` | `/demo/invoices/:id/mark-failed` | – (mock only) | Demo: mark failed |
| `POST` | `/demo/invoices/:id/expire` | – (mock only) | Demo: expire |
| `POST` | `/demo/webhook-receiver` | – | Sample signed-webhook receiver |
| `GET` | `/demo/received-webhooks` | – | Last 20 received webhooks |

### Create invoice (cURL)

```bash
curl -X POST http://localhost:4000/v1/invoices \
  -H "Authorization: Bearer fpk_test_demo" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER-1001",
    "amount": "100000000",
    "currency": "CKB",
    "description": "Demo order",
    "expiresInSeconds": 900,
    "metadata": { "cartId": "cart_123" }
  }'
```

Response:

```json
{
  "id": "inv_...",
  "object": "invoice",
  "status": "open",
  "amount": "100000000",
  "currency": "CKB",
  "orderId": "ORDER-1001",
  "fiber": { "invoiceAddress": "fibt...", "paymentHash": "0x..." },
  "checkoutUrl": "http://localhost:3000/checkout/inv_...",
  "expiresAt": "2026-07-06T12:30:00.000Z",
  "createdAt": "2026-07-06T12:15:00.000Z"
}
```

## Webhook reference

**Event types:** `invoice.created`, `invoice.open`, `invoice.paid`,
`invoice.expired`, `invoice.canceled`, `invoice.failed`,
`webhook.delivery.succeeded`, `webhook.delivery.failed`.

**Headers sent to your endpoint:**

```
FiberPayKit-Event-Id:  evt_...
FiberPayKit-Timestamp: 1751800800
FiberPayKit-Signature: t=1751800800,v1=<hex_hmac_sha256>
FiberPayKit-Event-Type: invoice.paid
```

The signed payload is `` `${timestamp}.${rawBody}` `` signed with your webhook
secret using HMAC-SHA256. Verify with a timing-safe comparison (the SDK does this
for you).

**Payload shape:**

```json
{
  "id": "evt_...",
  "type": "invoice.paid",
  "createdAt": "2026-07-06T12:20:00.000Z",
  "data": {
    "invoice": {
      "id": "inv_...",
      "orderId": "ORDER-1001",
      "status": "paid",
      "amount": "100000000",
      "currency": "CKB",
      "fiber": { "paymentHash": "0x...", "invoiceAddress": "fibt..." },
      "metadata": { "cartId": "cart_123" }
    }
  }
}
```

**Retry schedule:** attempt 1 immediately, then +30s, +2m, +10m, +30m
(`WEBHOOK_MAX_ATTEMPTS`, default 5). Each attempt stores request URL/headers/body,
response status + body snippet, attempt count, next retry time, and final status.

## SDK usage

```ts
import { FiberPayKit } from "@fiberpaykit/sdk";

const client = new FiberPayKit({
  apiKey: process.env.FIBERPAYKIT_API_KEY!,
  baseUrl: "http://localhost:4000",
});

const invoice = await client.invoices.create({
  orderId: "ORDER-1001",
  amount: "100000000",
  currency: "CKB",
  description: "Demo checkout",
  expiresInSeconds: 900,
  metadata: { cartId: "cart_123" },
});

console.log(invoice.checkoutUrl);
```

Verify a webhook:

```ts
import { verifyWebhookSignature } from "@fiberpaykit/sdk/webhook";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("FiberPayKit-Signature");

  const event = verifyWebhookSignature({
    rawBody,
    signatureHeader: signature!,
    secret: process.env.FIBERPAYKIT_WEBHOOK_SECRET!,
  });

  if (event.type === "invoice.paid") {
    // Mark the order as paid in your system.
  }
  return new Response("ok");
}
```

## Mock mode vs. real Fiber node mode

Set with `FIBER_MODE`:

- **`mock` (default):** `MockFiberClient` — an in-memory Fiber node simulator.
  Generates realistic invoice addresses + payment hashes, tracks status, and
  exposes demo controls (mark paid/failed, expire). No node required.
- **`fiber-rpc`:** `FiberRpcClient` — POSTs JSON-RPC 2.0 to `FIBER_RPC_URL`
  (`node_info`, `new_invoice`, `get_invoice`, `cancel_invoice`, …), with request
  timeout, error handling, and response normalization into our internal types.

`new_invoice` supports `amount`, `description`, `currency`, `expiry`,
`fallback_address`, `udt_type_script` (multi-asset), `allow_mpp`, and
`allow_trampoline_routing`.

> ⚠️ The exact Fiber RPC field names are still stabilizing upstream. The RPC
> adapter reads several plausible field names defensively and normalizes them —
> see [`fiberRpcClient.ts`](apps/api/src/fiber/fiberRpcClient.ts). Adjust the
> mappers as the Fiber RPC schema firms up.

## What is fully working / what is mocked

**Fully working (production-grade logic):**

- Merchant registration, hashed API keys, bearer auth.
- Invoice creation, listing, filtering, cancellation, status history.
- Hosted checkout with server-generated QR + live status.
- HMAC-SHA256 webhook signing + timing-safe SDK verification.
- Webhook delivery with exponential-backoff retries + full delivery records.
- Invoice polling + normalized status transitions.
- CSV reconciliation export + dashboard metrics.
- Full Zod validation, CORS, and rate limiting.

**Mocked / demo-only (clearly labelled):**

- `MockFiberClient` simulates the Fiber node when `FIBER_MODE=mock`.
- Demo payment controls (`/demo/invoices/:id/mark-*`) are mock-only.
- Static/demo currency display conversion (`money.ts`) — not a live rate oracle.
- The dashboard authenticates as the seeded demo merchant (no login UI yet).

## Security notes

- **`FIBER_RPC_URL` is never exposed to the browser.** All Fiber RPC calls happen
  server-side; the checkout API returns only non-sensitive fields.
- **API keys are stored hashed** (HMAC-SHA256 keyed with the server secret); the
  full key is returned only once at creation (or in seed output).
- **Webhook secrets** are hashed and additionally AES-256-GCM encrypted so the
  demo settings page can reveal them; in production, reveal once at creation only.
- **Signatures use timing-safe comparison** (`crypto.timingSafeEqual`).
- **All request bodies are validated with Zod.** CORS is allow-listed and basic
  rate limiting is enabled.

## Production roadmap

- Merchant auth (OAuth/session) + multi-merchant dashboard & key rotation UI.
- Live multi-asset rate oracle (replace static demo conversion).
- Idempotency keys on invoice creation; webhook endpoint secrets per-endpoint.
- Horizontal scaling: run workers as separate processes; Redis-backed poller lock.
- Observability: structured logs, metrics, tracing, and alerting.
- Hardened Fiber RPC mappings once the upstream schema stabilizes; channel/LSP
  liquidity views.


## License

MIT — see [LICENSE](LICENSE).
