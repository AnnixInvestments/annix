"use client";

import { Building2, CalendarDays, Download, HeartPulse, Loader2, Printer } from "lucide-react";
import { useState } from "react";
import { formatDateLongZA, nowISO } from "@/app/lib/datetime";
import { useHealthReport } from "@/app/lib/query/hooks";

export default function HealthReportPage() {
  const [html, setHtml] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const reportMutation = useHealthReport();

  function handleGenerate() {
    reportMutation.mutate(undefined, {
      onSuccess: (result) => {
        setHtml(result.html);
        setGeneratedAt(formatDateLongZA(nowISO()));
      },
    });
  }

  function handlePrint() {
    window.print();
  }

  function handleDownloadPdf() {
    if (!html) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(html);
    printWindow.document.close();
    const handleAfterPrint = () => {
      printWindow.removeEventListener("afterprint", handleAfterPrint);
      printWindow.close();
    };
    printWindow.addEventListener("afterprint", handleAfterPrint);
    printWindow.print();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <HeartPulse className="h-7 w-7 text-teal-400" />
            Compliance Health Report
          </h1>
          <p className="text-slate-400 mt-1">Annual compliance health assessment</p>
        </div>
        {!html && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={reportMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
          >
            {reportMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Report"
            )}
          </button>
        )}
      </div>

      {reportMutation.error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
          {reportMutation.error.message ?? "Failed to generate report"}
        </div>
      )}

      {reportMutation.isPending && !html && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 text-teal-400 animate-spin" />
          <p className="text-slate-400 text-sm">Analyzing your compliance data...</p>
        </div>
      )}

      {html && (
        <>
          <div className="flex items-center justify-between print:hidden">
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Company Health Report
              </span>
              {generatedAt && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {generatedAt}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={reportMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
              >
                Regenerate
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl overflow-hidden print:rounded-none print:shadow-none">
            <div
              className="p-8 text-slate-900 prose prose-sm max-w-none"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: AI-generated report preview
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </>
      )}

      {!html && !reportMutation.isPending && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <HeartPulse className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            Generate a comprehensive compliance health report for your company
          </p>
          <p className="text-slate-500 text-xs mt-1">
            The report analyses all your compliance requirements, documents, and deadlines
          </p>
        </div>
      )}
    </div>
  );
}
