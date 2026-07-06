import Link from "next/link";

const FEATURES = [
  {
    title: "Merchant REST API",
    body: "Create Fiber payment invoices with a single authenticated POST. Amounts as strings, multi-asset ready.",
  },
  {
    title: "Hosted Checkout",
    body: "A drop-in checkout page with QR code, expiry timer, and live status — no frontend work for merchants.",
  },
  {
    title: "Signed Webhook Relay",
    body: "HMAC-SHA256 signed events with exponential-backoff retries and full delivery history.",
  },
  {
    title: "TypeScript SDK",
    body: "@fiberpaykit/sdk to create invoices and verify webhooks in a few lines.",
  },
  {
    title: "Mock + Real Fiber Modes",
    body: "Demo works with a built-in mock Fiber node; flip to fiber-rpc to talk to a real Fiber Network node.",
  },
  {
    title: "Dashboard & Reconciliation",
    body: "Invoices, webhook deliveries, node status, and CSV reconciliation exports out of the box.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="text-center">
        <span className="inline-block rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
          Merchant, Liquidity, LSP &amp; Multi-Asset Infrastructure
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Accept Fiber Network payments with a few lines of code
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
          FiberPayKit is reusable infrastructure — a merchant API, hosted
          checkout, signed webhook relay, dashboard, and SDK — so future Fiber
          merchants, wallets, and developers can integrate payments fast.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/store" className="btn-primary">
            Try the demo store
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            Open dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-5">
            <h3 className="font-semibold text-neutral-900">{f.title}</h3>
            <p className="mt-2 text-sm text-neutral-600">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold">Create an invoice</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-neutral-900 p-4 text-xs text-neutral-100">
          {`curl -X POST http://localhost:4000/v1/invoices \\
  -H "Authorization: Bearer fpk_test_demo" \\
  -H "Content-Type: application/json" \\
  -d '{
    "orderId": "ORDER-1001",
    "amount": "100000000",
    "currency": "CKB",
    "description": "Demo order",
    "expiresInSeconds": 900,
    "metadata": { "cartId": "cart_123" }
  }'`}
        </pre>
      </section>
    </div>
  );
}
