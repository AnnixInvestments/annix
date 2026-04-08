"use client";

import { useState } from "react";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface CpoDataBookSectionProps {
  cpoId: number;
}

export function CpoDataBookSection(props: CpoDataBookSectionProps) {
  const cpoId = props.cpoId;

  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfPreview = usePdfPreview();

  const handleCompile = async (force: boolean) => {
    try {
      setIsCompiling(true);
      setError(null);
      const blob = await stockControlApiClient.compileCpoDataBook(cpoId, force);
      const url = URL.createObjectURL(blob);
      pdfPreview.open(url, `DataBook-CPO${cpoId}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compile data book");
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">CPO Data Book</h3>
      <p className="text-sm text-gray-500 mb-4">
        Compile a combined data book across all child job cards. This merges QC data, supplier
        certificates, calibration certificates, and PosiTector reports from every JC.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => handleCompile(false)}
          disabled={isCompiling}
          className="rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isCompiling ? "Compiling..." : "Compile Data Book"}
        </button>
        <button
          onClick={() => handleCompile(true)}
          disabled={isCompiling}
          className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed"
        >
          Force Recompile
        </button>
      </div>

      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
    </div>
  );
}
