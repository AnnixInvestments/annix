"use client";

import { HubPage } from "../../components/HubPage";
import { useVisibleNavItems } from "../../hooks/useVisibleNavItems";

const DESCRIPTIONS: Record<string, string> = {
  staff: "Manage staff members, roles and contact details",
  "staff-leave": "Record and track staff leave and availability",
  "inbound-emails": "Monitor and manage documents received via email",
  "boiler-control-docs":
    "Sequence of operations & I/O schedule for the steam boiler LOGO! controller (admin reference)",
  "paint-pricing": "Manage paint cost inputs and sell-price-per-m² calculations",
  "paint-quote": "Quote coating work — sell price per m² and total from a paint, area and tier",
  "rubber-pricing":
    "Manage rubber lining cost inputs and sell-price calculations per m² (plate) and running metre (pipe)",
  "bonding-agents":
    "Manage bonding agents / adhesives — spread rate, cost and sale per m²; feeds the rubber bonding-system pricing",
  labour:
    "Paraffin curing, department hourly rates and per-family throughputs behind the rubber bonding-system labour cost",
  blasting:
    "Grit-blasting cost inputs — wages, electricity, grit and margin — behind the rubber bonding-system cost",
  "rubber-quote":
    "Quote rubber lining work — live sale and MPS price from a rubber, thickness and area or length",
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
