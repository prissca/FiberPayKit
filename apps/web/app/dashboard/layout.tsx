import { DashboardNav } from "@/components/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Merchant Dashboard</h1>
        <p className="text-sm text-neutral-500">
          Demo merchant · authenticated with the seeded{" "}
          <code className="mono">fpk_test_demo</code> key
        </p>
      </div>
      <DashboardNav />
      <div>{children}</div>
    </div>
  );
}
