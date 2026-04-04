"use client";

import SageExportModal from "@/app/components/shared/SageExportModal";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface StockControlSageExportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockControlSageExportModal(props: StockControlSageExportModalProps) {
  return (
    <SageExportModal
      onClose={props.onClose}
      onSuccess={props.onSuccess}
      title="Export to Sage"
      description="Export approved invoices as CSV for Sage Business Cloud import"
      csvFilename="sage-export.csv"
      excludeLabel="Exclude previously exported invoices"
      entityName="invoice"
      accentColor="teal"
      fetchPreview={(params) => stockControlApiClient.sageExportPreview(params)}
      exportCsv={(params) => stockControlApiClient.sageExportCsv(params)}
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
