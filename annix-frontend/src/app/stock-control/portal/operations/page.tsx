"use client";

import { HubPage } from "../../components/HubPage";
import { useVisibleNavItems } from "../../hooks/useVisibleNavItems";

const DESCRIPTIONS: Record<string, string> = {
  "issue-stock": "Issue stock items to job cards and projects",
  staff: "Manage staff members and assignments",
};

export default function OperationsHubPage() {
  const items = useVisibleNavItems("Operations");

  const hubItems = items.map((item) => {
    const description = DESCRIPTIONS[item.key];
    return {
      item,
      description: description || "",
    };
  });

  return (
    <HubPage
      title="Operations"
      description="Manage stock issuance and staff operations."
      items={hubItems}
    />
  );
}
