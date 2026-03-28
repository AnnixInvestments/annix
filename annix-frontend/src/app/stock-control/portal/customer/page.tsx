"use client";

import { HubPage } from "../../components/HubPage";
import { useVisibleNavItems } from "../../hooks/useVisibleNavItems";

const DESCRIPTIONS: Record<string, string> = {
  "job-cards": "View and manage customer job cards",
  "customer-deliveries": "Create and track customer delivery notes",
  "purchase-orders": "Manage customer purchase orders",
};

export default function CustomerHubPage() {
  const items = useVisibleNavItems("Customer");

  const hubItems = items.map((item) => ({
    item,
    description: DESCRIPTIONS[item.key] ?? "",
  }));

  return (
    <HubPage
      title="Customer"
      description="Manage purchase orders, job cards, and delivery notes."
      items={hubItems}
    />
  );
}
