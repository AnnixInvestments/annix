"use client";

import { HubPage } from "../../components/HubPage";
import { useVisibleNavItems } from "../../hooks/useVisibleNavItems";

const DESCRIPTIONS: Record<string, string> = {
  certificates: "Manage and analyze supplier certificates of conformance",
  calibration: "Track equipment calibration certificates and expiry dates",
  positector: "PosiTector coating thickness measurement tools",
  "positector-upload": "Upload PosiTector measurement data files",
  "positector-live": "Stream live readings from PosiTector devices",
  "positector-ble": "Connect to PosiTector gauges via Bluetooth",
  "data-books": "Compile and download job card data books",
  "batch-lookup": "Trace material by batch number across certificates and issuances",
  environmental: "Temperature, humidity, and dew point readings across all job cards",
};

export default function QualityHubPage() {
  const items = useVisibleNavItems("Quality");

  const hubItems = items.map((item) => ({
    item,
    description: DESCRIPTIONS[item.key] ?? "",
  }));

  return (
    <HubPage
      title="Quality"
      description="Quality management, certificates, calibration, and measurement tools."
      items={hubItems}
    />
  );
}
