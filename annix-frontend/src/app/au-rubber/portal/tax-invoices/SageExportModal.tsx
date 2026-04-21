"use client";

import SageExportModal from "@/app/components/shared/SageExportModal";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";

interface SupplierSageExportModalProps {
  onClose: () => void;
  onSuccess: () => void;
  invoiceOptions?: Array<{ id: number; label: string }>;
}

export default function SupplierSageExportModal(props: SupplierSageExportModalProps) {
  return (
    <SageExportModal
      onClose={props.onClose}
      onSuccess={props.onSuccess}
      invoiceOptions={props.invoiceOptions}
      title="Export to Sage"
      description="Export approved supplier invoices as CSV for Sage Business Cloud import"
      csvFilename="sage-export.csv"
      excludeLabel="Exclude previously exported invoices"
      entityName="invoice"
      accentColor="orange"
      fetchPreview={(params) => auRubberApiClient.sageExportPreview(params)}
      exportCsv={(params) => auRubberApiClient.sageExportCsv(params)}
      formatPreview={(data) => {
        const d = data as { invoiceCount: number; lineItemCount: number; totalAmount: number };
        return [
          { label: "Invoices", value: String(d.invoiceCount) },
          { label: "Line Items", value: String(d.lineItemCount) },
          {
            label: "Total",
            value: `R${d.totalAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
          },
        ];
      }}
      extractCount={(data) => (data as { invoiceCount: number }).invoiceCount}
    />
  );
}
