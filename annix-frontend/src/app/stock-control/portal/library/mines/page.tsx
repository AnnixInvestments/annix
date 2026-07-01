"use client";

import { useCoreAwareHref } from "@/app/core/portal/lib/coreAwareHref";
import { MineLibraryIndex } from "@/app/lib/nix/components/library";

export default function StockControlMineLibraryPage() {
  const coreHref = useCoreAwareHref();
  return <MineLibraryIndex basePath={coreHref("/stock-control/portal/library/mines")} />;
}
