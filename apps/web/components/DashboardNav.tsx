"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Overview", icon: "▦" },
  { href: "/dashboard/invoices", label: "Invoices", icon: "▤" },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: "⇄" },
  { href: "/dashboard/webhook-tester", label: "Tester", icon: "◎" },
  { href: "/dashboard/settings", label: "Settings", icon: "❖" },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="glass flex flex-wrap gap-1 p-1.5">
      {LINKS.map((l) => {
        const active =
          l.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              active
                ? "btn-primary"
                : "text-[#aab4d8] hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className="text-xs opacity-80">{l.icon}</span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
