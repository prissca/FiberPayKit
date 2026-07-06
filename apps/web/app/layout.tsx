import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

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
        <div className="relative z-10">
          <header className="sticky top-0 z-30 border-b border-edge bg-void/70 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="transition hover:opacity-90">
                <Logo />
              </Link>
              <nav className="flex items-center gap-1.5 text-sm sm:gap-3">
                <Link
                  href="/store"
                  className="hidden rounded-lg px-3 py-1.5 text-[#aab4d8] transition hover:bg-white/5 hover:text-white sm:block"
                >
                  Store
                </Link>
                <Link
                  href="/dashboard"
                  className="hidden rounded-lg px-3 py-1.5 text-[#aab4d8] transition hover:bg-white/5 hover:text-white sm:block"
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
          <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-[#5f6a8c]">
            <div className="mx-auto mb-4 h-px max-w-md bg-gradient-to-r from-transparent via-violet/40 to-transparent" />
            FiberPayKit · open-source Fiber Network payment infrastructure ·
            built for the Fiber Network Infrastructure Hackathon
          </footer>
        </div>
      </body>
    </html>
  );
}
