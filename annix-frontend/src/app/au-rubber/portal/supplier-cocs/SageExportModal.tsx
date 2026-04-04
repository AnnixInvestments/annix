"use client";

import SageExportModal from "@/app/components/shared/SageExportModal";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";

interface CocSageExportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CocSageExportModal(props: CocSageExportModalProps) {
  return (
    <SageExportModal
      onClose={props.onClose}
      onSuccess={props.onSuccess}
      title="Export CoCs to Sage"
      description="Export supplier CoCs as CSV for Sage Business Cloud import"
      csvFilename="sage-coc-export.csv"
      excludeLabel="Exclude previously exported CoCs"
      entityName="CoC"
      accentColor="orange"
      fetchPreview={(params) => auRubberApiClient.cocSageExportPreview(params)}
      exportCsv={(params) => auRubberApiClient.cocSageExportCsv(params)}
      formatPreview={(data) => {
        const d = data as { cocCount: number; batchCount: number; totalBatches: number };
        return [
          { label: "CoCs", value: String(d.cocCount) },
          { label: "Batches", value: String(d.batchCount) },
          { label: "Total Batches", value: String(d.totalBatches) },
        ];
      }}
      extractCount={(data) => (data as { cocCount: number }).cocCount}
    />
  );
}
