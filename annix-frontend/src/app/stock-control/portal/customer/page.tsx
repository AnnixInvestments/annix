"use client";

import { HubPage } from "../../components/HubPage";
import { useVisibleNavItems } from "../../hooks/useVisibleNavItems";

const DESCRIPTIONS: Record<string, string> = {
  "job-cards": "View and manage customer job cards",
  "customer-deliveries": "Create and track customer delivery notes",
  "purchase-orders": "Manage customer purchase orders",
  quotations: "Quotes and RFQ responses sent to customers",
  "customer-invoices": "Sales invoices raised against delivery notes",
  "customer-scorecard": "Payment, order frequency and dispute metrics per customer",
  "customer-documents": "NDAs, vendor forms and customer-supplied specifications",
};

export default function CustomerHubPage() {
  const items = useVisibleNavItems("Customer");

  const hubItems = items.map((item) => {
    const description = DESCRIPTIONS[item.key];
    return {
      item,
      description: description || "",
    };
  });

  return (
    <HubPage
      title="Customer"
      description="Manage purchase orders, job cards, and delivery notes."
      items={hubItems}
    />
  );
}
