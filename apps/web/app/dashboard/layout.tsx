import { DashboardNav } from "@/components/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Merchant <span className="holo-text">Console</span>
          </h1>
          <p className="mt-1 text-sm text-[#93a0c4]">
            Demo merchant · authenticated with the seeded{" "}
            <code className="mono text-cyan-soft">fpk_test_demo</code> key
          </p>
        </div>
        <span className="chip">
          <span className="dot dot-live animate-pulseGlow" />
          live telemetry
        </span>
      </div>
      <DashboardNav />
      <div>{children}</div>
    </div>
  );
}
