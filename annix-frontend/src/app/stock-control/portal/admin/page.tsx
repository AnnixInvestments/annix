"use client";

import { HubPage } from "../../components/HubPage";
import { useVisibleNavItems } from "../../hooks/useVisibleNavItems";

const DESCRIPTIONS: Record<string, string> = {
  "inbound-emails": "Monitor and manage documents received via email",
  reports: "View stock, delivery, and financial reports",
  glossary: "Browse coating, lining, and industry term definitions",
};

export default function AdminHubPage() {
  const items = useVisibleNavItems("Resources");

  const hubItems = items.map((item) => {
    const description = DESCRIPTIONS[item.key];
    return {
      item,
      description: description || "",
    };
  });

  return (
    <HubPage
      title="Resources"
      description="Access reports and reference information."
      items={hubItems}
    />
  );
}
