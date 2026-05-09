"use client";

import { useParams, useSearchParams } from "next/navigation";
import { MineDocumentRevisions } from "@/app/lib/nix/components/library";

export default function StockControlMineDocumentRevisionsPage() {
  const params = useParams<{ documentNumber: string }>();
  const search = useSearchParams();
  const rawDocNumber = params ? params.documentNumber : "";
  const documentNumber = rawDocNumber ? decodeURIComponent(rawDocNumber) : "";
  const mineIdParam = search ? search.get("mineId") : null;
  const parsedMineId = mineIdParam ? Number.parseInt(mineIdParam, 10) : Number.NaN;
  const mineId = Number.isFinite(parsedMineId) ? parsedMineId : null;
  const backHref = mineId
    ? `/stock-control/portal/library/mines/${mineId}`
    : "/stock-control/portal/library/mines";

  if (documentNumber.length === 0) {
    return <div className="p-6 text-sm text-red-600">Missing document number.</div>;
  }

  return (
    <MineDocumentRevisions documentNumber={documentNumber} mineId={mineId} backHref={backHref} />
  );
}
