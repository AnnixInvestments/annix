"use client";

import { HubPage } from "../../components/HubPage";
import { useVisibleNavItems } from "../../hooks/useVisibleNavItems";

const DESCRIPTIONS: Record<string, string> = {
  deliveries: "Track and manage incoming supplier deliveries",
  requisitions: "Create and manage stock requisition orders",
  invoices: "View and process supplier invoices",
};

export default function SupplierHubPage() {
  const items = useVisibleNavItems("Supplier");

  const hubItems = items.map((item) => ({
    item,
    description: DESCRIPTIONS[item.key] ?? "",
  }));

  return (
    <HubPage
      title="Supplier"
      description="Manage supplier deliveries, requisitions, and invoices."
      items={hubItems}
    />
  );
}
