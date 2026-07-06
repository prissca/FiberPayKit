import { apiPublic, type CheckoutView } from "@/lib/api";
import { CheckoutCard } from "@/components/CheckoutCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: { invoiceId: string };
}) {
  let invoice: CheckoutView | null = null;
  let error: string | null = null;
  try {
    invoice = await apiPublic<CheckoutView>(`/checkout/${params.invoiceId}`);
  } catch (e) {
    error = (e as Error).message;
  }

  if (error || !invoice) {
    return (
      <div className="panel mx-auto max-w-md p-8 text-center">
        <h1 className="text-lg font-semibold text-white">Invoice not found</h1>
        <p className="mt-2 text-sm text-[#7f8bb0]">{error}</p>
        <Link href="/store" className="btn-secondary mt-4">
          Back to store
        </Link>
      </div>
    );
  }

  return (
    <div className="py-4">
      <CheckoutCard initial={invoice} />
    </div>
  );
}
