import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FiberPayKit — Fiber Network Payment Infrastructure",
  description:
    "Reusable Fiber merchant checkout, webhook relay, and multi-asset payment infrastructure.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white">
                ⚡
              </span>
              FiberPayKit
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/store" className="text-neutral-600 hover:text-neutral-900">
                Demo Store
              </Link>
              <Link
                href="/dashboard"
                className="text-neutral-600 hover:text-neutral-900"
              >
                Dashboard
              </Link>
              <a
                href="https://github.com/prissca/FiberPayKit"
                className="btn-secondary"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-neutral-400">
          FiberPayKit — open-source Fiber Network payment infrastructure. Built
          for the Fiber Network Infrastructure Hackathon.
        </footer>
      </body>
    </html>
  );
}
