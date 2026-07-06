"use client";

import { reconciliationCsvUrl, DEMO_API_KEY } from "@/lib/api";
import { useState } from "react";

export function ReconciliationExportButton() {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch(reconciliationCsvUrl(), {
        headers: { Authorization: `Bearer ${DEMO_API_KEY}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fiberpaykit-reconciliation-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className="btn-secondary" onClick={download} disabled={busy}>
      {busy ? "Exporting…" : "Export reconciliation CSV"}
    </button>
  );
}
