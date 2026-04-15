"use client";

import { HubPage } from "../../components/HubPage";
import { useVisibleNavItems } from "../../hooks/useVisibleNavItems";

const DESCRIPTIONS: Record<string, string> = {
  deliveries: "Track and manage incoming supplier deliveries",
  requisitions: "Create and manage stock requisition orders",
  invoices: "View and process supplier invoices",
  "supplier-purchase-orders": "Issue and track purchase orders sent to suppliers",
  grns: "Goods received notes and receiving records",
  "supplier-scorecard": "On-time delivery, quality and price performance by supplier",
  "supplier-documents": "BEE, tax clearance, ISO and insurance certificates with expiry alerts",
};

export default function SupplierHubPage() {
  const items = useVisibleNavItems("Supplier");

  const hubItems = items.map((item) => ({
    item,
    description: (() => {
      const description = DESCRIPTIONS[item.key];
      return description ?? "";
    })(),
  }));

  return (
    <HubPage
      title="Supplier"
      description="Manage supplier deliveries, requisitions, and invoices."
      items={hubItems}
    />
  );
}
