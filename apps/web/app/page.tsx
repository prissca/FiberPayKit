import Link from "next/link";
import { LogoMark } from "@/components/Logo";

const FEATURES = [
  {
    icon: "◈",
    title: "Merchant REST API",
    body: "Create Fiber payment invoices with one authenticated POST. String amounts, multi-asset ready.",
    glow: "shadow-glow-violet",
  },
  {
    icon: "▣",
    title: "Hosted Checkout",
    body: "Drop-in checkout with QR, expiry timer, and live status — zero frontend work for merchants.",
    glow: "shadow-glow-cyan",
  },
  {
    icon: "⇄",
    title: "Signed Webhook Relay",
    body: "HMAC-SHA256 signed events, exponential-backoff retries, full delivery history.",
    glow: "shadow-glow-lime",
  },
  {
    icon: "❖",
    title: "TypeScript SDK",
    body: "@fiberpaykit/sdk to create invoices and verify webhooks in a few lines.",
    glow: "shadow-glow-violet",
  },
  {
    icon: "⬡",
    title: "Mock + Real Fiber",
    body: "Demo runs on a built-in mock node; flip to fiber-rpc for a real Fiber Network node.",
    glow: "shadow-glow-cyan",
  },
  {
    icon: "▦",
    title: "Dashboard + Reconciliation",
    body: "Invoices, webhook deliveries, node telemetry, and CSV exports out of the box.",
    glow: "shadow-glow-lime",
  },
];

const STATS = [
  { k: "8", v: "Fiber RPC methods normalized" },
  { k: "5", v: "retry backoff stages" },
  { k: "3", v: "settlement assets" },
  { k: "1", v: "npm install" },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl">
        <div className="panel scanline relative overflow-hidden px-6 py-16 text-center sm:px-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-cyan/10 blur-3xl" />

          <div className="mb-6 flex justify-center">
            <div className="animate-float">
              <LogoMark size={76} />
            </div>
          </div>

          <span className="chip mx-auto">
            <span className="dot dot-live animate-pulseGlow" />
            Merchant · Liquidity · LSP · Multi-Asset Infrastructure
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Accept <span className="holo-text">Fiber Network</span> payments in a
            few lines of code
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[#aab4d8]">
            Reusable payment infrastructure — merchant API, hosted checkout,
            signed webhook relay, dashboard, and SDK — so future Fiber merchants,
            wallets, and developers integrate payments fast.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/store" className="btn-primary px-6 py-3 text-base">
              ⚡ Launch demo store
            </Link>
            <Link href="/dashboard" className="btn-secondary px-6 py-3 text-base">
              Open dashboard
            </Link>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.v} className="panel-inset px-4 py-4">
                <div className="holo-text text-3xl font-bold">{s.k}</div>
                <div className="mt-1 text-[11px] leading-tight text-[#7f8bb0]">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="mb-6 text-center text-sm font-semibold uppercase tracking-[0.2em] text-[#7f8bb0]">
          The full payment stack
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="panel group relative overflow-hidden p-6 transition-transform duration-200 hover:-translate-y-1"
            >
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet/30 to-cyan/10 text-lg text-cyan-soft ${f.glow}`}
              >
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-[#93a0c4]">{f.body}</p>
              <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </section>

      {/* Code sample */}
      <section className="panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-edge px-5 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-xs text-[#7f8bb0]">create-invoice.sh</span>
        </div>
        <pre className="overflow-x-auto p-5 text-xs leading-relaxed text-[#c9d2f0]">
          <span className="text-[#7f8bb0]"># One POST creates a Fiber invoice + hosted checkout URL</span>
          {`
curl -X POST `}
          <span className="text-cyan">https://your-api/v1/invoices</span>
          {` \\
  -H `}
          <span className="text-lime">&quot;Authorization: Bearer fpk_test_demo&quot;</span>
          {` \\
  -H "Content-Type: application/json" \\
  -d '{
    "orderId": "ORDER-1001",
    "amount": "100000000",
    "currency": "CKB",
    "expiresInSeconds": 900,
    "metadata": { "cartId": "cart_123" }
  }'`}
        </pre>
      </section>
    </div>
  );
}
