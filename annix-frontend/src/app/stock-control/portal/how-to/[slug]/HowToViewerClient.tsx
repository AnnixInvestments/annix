"use client";

import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type { HowToHeading, HowToLink } from "@/app/lib/how-to";
import SharedHowToViewerClient, {
  type ViewerGuide,
} from "@/app/lib/how-to/components/HowToViewerClient";
import { useViewAs } from "@/app/stock-control/context/ViewAsContext";
import { STOCK_CONTROL_HOW_TO_ROLES } from "@/app/stock-control/how-to/types";

interface StockControlHowToViewerClientProps {
  guide: ViewerGuide;
  headings: HowToHeading[];
  prev: HowToLink | null;
  next: HowToLink | null;
}

export default function HowToViewerClient(props: StockControlHowToViewerClientProps) {
  const { user } = useStockControlAuth();
  const { effectiveRole } = useViewAs();
  const role = effectiveRole || user?.role || null;

  return (
    <SharedHowToViewerClient
      guide={props.guide}
      headings={props.headings}
      prev={props.prev}
      next={props.next}
      role={role}
      allRoles={STOCK_CONTROL_HOW_TO_ROLES}
      basePath="/stock-control/portal/how-to"
      recentKey="stock-control-how-to-recent"
      helpfulKeyPrefix="stock-control-how-to-helpful:"
    />
  );
}
