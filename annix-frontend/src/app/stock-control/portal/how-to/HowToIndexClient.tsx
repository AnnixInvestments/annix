"use client";

import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import SharedHowToIndexClient, {
  type HowToIndexClientProps as SharedProps,
} from "@/app/lib/how-to/components/HowToIndexClient";
import { useViewAs } from "@/app/stock-control/context/ViewAsContext";
import {
  STOCK_CONTROL_ADMIN_ROLE,
  STOCK_CONTROL_HOW_TO_ROLES,
} from "@/app/stock-control/how-to/types";

type IndexGuideProp = SharedProps["guides"][number];

interface StockControlHowToIndexClientProps {
  guides: IndexGuideProp[];
}

export default function HowToIndexClient(props: StockControlHowToIndexClientProps) {
  const { user } = useStockControlAuth();
  const { effectiveRole } = useViewAs();
  const role = effectiveRole || user?.role || null;

  return (
    <SharedHowToIndexClient
      guides={props.guides}
      role={role}
      allRoles={STOCK_CONTROL_HOW_TO_ROLES}
      adminRole={STOCK_CONTROL_ADMIN_ROLE}
      basePath="/stock-control/portal/how-to"
      recentKey="stock-control-how-to-recent"
      subheading="Step-by-step guides for using ASCA Stock Control. Tailored to your role."
    />
  );
}
