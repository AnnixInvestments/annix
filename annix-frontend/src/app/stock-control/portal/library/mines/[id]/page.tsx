"use client";

import { useParams } from "next/navigation";
import { MineLibraryDetail } from "@/app/lib/nix/components/library";

export default function StockControlMineLibraryDetailPage() {
  const params = useParams<{ id: string }>();
  const rawId = params ? params.id : "";
  const idParam = rawId || "";
  const idValue = idParam ? Number.parseInt(idParam, 10) : Number.NaN;
  if (Number.isNaN(idValue)) {
    return <div className="p-6 text-sm text-red-600">Invalid mine id.</div>;
  }
  return <MineLibraryDetail mineId={idValue} backHref="/stock-control/portal/library/mines" />;
}
