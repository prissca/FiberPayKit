"use client";

import { useState } from "react";
import { apiAuthed } from "@/lib/api";
import { LogoMark } from "@/components/Logo";

interface Product {
  sku: string;
  name: string;
  blurb: string;
  emoji: string;
  amount: string; // base units
  currency: "CKB" | "RUSD" | "CUSTOM_UDT";
  accent: string; // tailwind gradient classes
  tag?: string;
}

const PRODUCTS: Product[] = [
  {
    sku: "fiber-test-mug",
    name: "Fiber Test Mug",
    blurb: "Ceramic mug for testing Fiber payments.",
    emoji: "☕",
    amount: "100000000",
    currency: "CKB",
    accent: "from-violet/30 to-cyan/10",
    tag: "Popular",
  },
  {
    sku: "node-sticker-pack",
    name: "Node Sticker Pack",
    blurb: "Holographic Fiber node stickers ×12.",
    emoji: "✦",
    amount: "35000000",
    currency: "CKB",
    accent: "from-cyan/30 to-violet/10",
  },
  {
    sku: "lightning-tee",
    name: "Lightning Tee",
    blurb: "Glow-in-the-dark payment bolt tee.",
    emoji: "👕",
    amount: "250000000",
    currency: "CKB",
    accent: "from-magenta/30 to-violet/10",
  },
  {
    sku: "rusd-gift-card",
    name: "RUSD Gift Card",
    blurb: "Stablecoin gift card — settles in RUSD.",
    emoji: "💳",
    amount: "500000000",
    currency: "RUSD",
    accent: "from-lime/30 to-cyan/10",
    tag: "Stablecoin",
  },
  {
    sku: "hardware-node-kit",
    name: "Hardware Node Kit",
    blurb: "Raspberry-Pi Fiber node starter kit.",
    emoji: "🛰️",
    amount: "1500000000",
    currency: "CKB",
    accent: "from-cyan/30 to-violet/20",
  },
  {
    sku: "channel-credits",
    name: "Channel Credits",
    blurb: "Prepaid liquidity credits (custom UDT).",
    emoji: "⚡",
    amount: "750000000",
    currency: "CUSTOM_UDT",
    accent: "from-violet/30 to-magenta/10",
    tag: "Multi-asset",
  },
  {
    sku: "dev-hoodie",
    name: "Builder Hoodie",
    blurb: "Cozy hoodie for late-night node ops.",
    emoji: "🧥",
    amount: "420000000",
    currency: "CKB",
    accent: "from-magenta/20 to-cyan/10",
  },
  {
    sku: "coffee-subscription",
    name: "Fiber Coffee (Monthly)",
    blurb: "Single-origin beans, paid over Fiber.",
    emoji: "🫘",
    amount: "180000000",
    currency: "RUSD",
    accent: "from-lime/20 to-violet/10",
  },
];

const CURRENCIES = ["All", "CKB", "RUSD", "CUSTOM_UDT"] as const;

function displayPrice(amount: string, currency: string): string {
  // Demo display: 8 decimals for CKB/RUSD-style base units.
  const n = BigInt(amount);
  const whole = n / 100000000n;
  const frac = (n % 100000000n).toString().padStart(8, "0").replace(/0+$/, "");
  return `${whole}${frac ? "." + frac : ""} ${currency}`;
}

export default function StorePage() {
  const [filter, setFilter] = useState<(typeof CURRENCIES)[number]>("All");
  const [busySku, setBusySku] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const products =
    filter === "All"
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.currency === filter);

  const buy = async (p: Product) => {
    setBusySku(p.sku);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        orderId: `ORDER-${Math.floor(Math.random() * 9000 + 1000)}`,
        amount: p.amount,
        currency: p.currency,
        description: p.name,
        expiresInSeconds: 900,
        metadata: { source: "demo-store", sku: p.sku },
        checkout: {
          successUrl: `${window.location.origin}/store?paid=1`,
          cancelUrl: `${window.location.origin}/store`,
        },
      };
      // CUSTOM_UDT invoices require a udtTypeScript (demo values).
      if (p.currency === "CUSTOM_UDT") {
        body.udtTypeScript = {
          code_hash:
            "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
          hash_type: "type",
          args: "0xfiberpaykit0000000000000000000000000000",
        };
        body.settlementAsset = "CUSTOM_UDT";
        body.displayAmount = displayPrice(p.amount, "UDT");
      }
      const invoice = await apiAuthed<{ id: string }>("/v1/invoices", {
        method: "POST",
        body: JSON.stringify(body),
      });
      window.location.href = `/checkout/${invoice.id}`;
    } catch (e) {
      setError((e as Error).message);
      setBusySku(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="panel scanline relative overflow-hidden px-6 py-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-cyan/10 blur-3xl" />
        <div className="flex items-center gap-4">
          <LogoMark size={44} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Fiber <span className="holo-text">Storefront</span>
            </h1>
            <p className="text-sm text-[#93a0c4]">
              A demo merchant powered by FiberPayKit · pick anything and pay over
              the Fiber Network (mock mode)
            </p>
          </div>
        </div>

        {/* Currency filter */}
        <div className="mt-6 flex flex-wrap gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                filter === c
                  ? "btn-primary"
                  : "chip hover:border-cyan/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="panel-inset px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      {/* Product grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <div
            key={p.sku}
            className="panel group relative flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1.5"
          >
            {/* Product image tile */}
            <div
              className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${p.accent}`}
            >
              <span className="text-6xl drop-shadow-[0_6px_16px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-110">
                {p.emoji}
              </span>
              {p.tag && (
                <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-soft backdrop-blur">
                  {p.tag}
                </span>
              )}
              <span className="absolute right-3 top-3 chip !px-2 !py-0.5 text-[10px]">
                {p.currency}
              </span>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col p-4">
              <h3 className="font-semibold text-white">{p.name}</h3>
              <p className="mt-1 flex-1 text-xs text-[#93a0c4]">{p.blurb}</p>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-lg font-bold holo-text">
                  {displayPrice(p.amount, p.currency)}
                </span>
              </div>
              <button
                className="btn-primary mt-3 w-full"
                disabled={busySku === p.sku}
                onClick={() => buy(p)}
              >
                {busySku === p.sku ? "Creating…" : "⚡ Pay with Fiber"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-[#5f6a8c]">
        Prices are demo values in base units. CUSTOM_UDT items showcase Fiber’s
        multi-asset direction with a sample UDT type script.
      </p>
    </div>
  );
}
