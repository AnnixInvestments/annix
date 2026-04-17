"use client";

import { HubPage } from "../../components/HubPage";
import { useVisibleNavItems } from "../../hooks/useVisibleNavItems";

const DESCRIPTIONS: Record<string, string> = {
  certificates: "Manage and analyze supplier certificates of conformance",
  calibration: "Track equipment calibration certificates and expiry dates",
  positector: "PosiTector coating thickness measurement tools",
  "positector-upload": "Upload PosiTector data — auto-detects single or multi-report PDFs",
  "positector-live": "Stream live readings from PosiTector devices",
  "positector-ble": "Connect to PosiTector gauges via Bluetooth",
  "data-books": "Compile and download job card data books",
  "batch-lookup": "Trace material by batch number across certificates and issuances",
  "paint-dfts": "Dry film thickness readings across all job cards",
  "blast-profile": "Surface blast profile measurements across all job cards",
  "shore-hardness": "Rubber shore hardness measurements across all job cards",
  environmental: "Temperature, humidity, and dew point readings across all job cards",
};

export default function QualityHubPage() {
  const DESCRIPTIONSKey = DESCRIPTIONS[item.key];
  const items = useVisibleNavItems("Quality");

  const hubItems = items.map((item) => ({
    item,
    description: DESCRIPTIONSKey || "",
  }));

  return (
    <HubPage
      title="Quality"
      description="Quality management, certificates, calibration, and measurement tools."
      items={hubItems}
    />
  );
}
