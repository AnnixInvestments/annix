"use client";

import { HubPage } from "../../components/HubPage";
import { useVisibleNavItems } from "../../hooks/useVisibleNavItems";

const DESCRIPTIONS: Record<string, string> = {
  staff: "View, add, and manage staff members, photos, and ID cards",
  "staff-leave": "Track and manage staff leave requests and balances",
};

export default function StaffHubPage() {
  const items = useVisibleNavItems("Staff");

  const hubItems = items.map((item) => {
    const desc = DESCRIPTIONS[item.key];
    return { item, description: desc == null ? "" : desc };
  });

  return (
    <HubPage
      title="Staff"
      description="Staff member management, ID cards, and leave tracking."
      items={hubItems}
    />
  );
}
