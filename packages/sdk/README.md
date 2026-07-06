# @fiberpaykit/sdk

Official TypeScript SDK for [FiberPayKit](https://github.com/prissca/FiberPayKit) — reusable Fiber Network merchant payment infrastructure.

## Install

```bash
pnpm add @fiberpaykit/sdk
```

## Create an invoice

```ts
import { FiberPayKit } from "@fiberpaykit/sdk";

const client = new FiberPayKit({
  apiKey: process.env.FIBERPAYKIT_API_KEY!,
  baseUrl: "http://localhost:4000",
});

const invoice = await client.invoices.create({
  orderId: "ORDER-1001",
  amount: "100000000", // base units, string (never a float)
  currency: "CKB",
  description: "Demo checkout",
  expiresInSeconds: 900,
  metadata: { cartId: "cart_123" },
});

console.log(invoice.checkoutUrl);
```

## Verify a webhook

```ts
import { verifyWebhookSignature } from "@fiberpaykit/sdk/webhook";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("FiberPayKit-Signature");

  const event = verifyWebhookSignature({
    rawBody,
    signatureHeader: signature!,
    secret: process.env.FIBERPAYKIT_WEBHOOK_SECRET!,
    toleranceSeconds: 300, // optional replay protection
  });

  if (event.type === "invoice.paid") {
    // Mark the order as paid in your system.
  }

  return new Response("ok");
}
```

## API

- `client.invoices.create(params)`
- `client.invoices.retrieve(id)`
- `client.invoices.cancel(id, reason?)`
- `client.invoices.list(params)`
- `client.health()`
- `client.me()`
- `verifyWebhookSignature({ rawBody, signatureHeader, secret, toleranceSeconds? })`

MIT licensed.
