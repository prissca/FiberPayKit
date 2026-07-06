const STYLES: Record<string, string> = {
  open: "text-cyan-soft border-cyan/30 bg-cyan/10 shadow-[0_0_14px_rgba(45,212,255,0.25)]",
  paid: "text-lime border-lime/30 bg-lime/10 shadow-[0_0_14px_rgba(84,247,192,0.3)]",
  expired: "text-amber-300 border-amber-400/30 bg-amber-400/10",
  canceled: "text-[#8a90ab] border-white/10 bg-white/5",
  failed: "text-red-300 border-red-400/30 bg-red-400/10 shadow-[0_0_14px_rgba(255,92,106,0.25)]",
  pending: "text-cyan-soft border-cyan/30 bg-cyan/10",
  succeeded: "text-lime border-lime/30 bg-lime/10",
  abandoned: "text-red-300 border-red-400/30 bg-red-400/10",
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? STYLES.canceled;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
