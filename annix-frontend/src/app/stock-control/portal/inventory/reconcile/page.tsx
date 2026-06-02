"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { metricsApi } from "@/app/lib/api/metricsApi";
import type {
  ReconciliationDocumentCheck,
  ReconciliationFlag,
  ReconciliationItemAnalysis,
  ReconciliationReport,
} from "@/app/lib/api/stockControlApi";
import { DateTime, monthEndPeriodOptions } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useAnalyzeStockTakeReconciliation,
  useCreateReconciliationDelivery,
} from "@/app/lib/query/hooks";

const FLAG_LABELS: Record<ReconciliationFlag, { label: string; className: string }> = {
  UNMATCHED_ITEM: { label: "Unmatched", className: "bg-gray-200 text-gray-700" },
  INTAKE_MISMATCH: { label: "Intake ≠ app", className: "bg-amber-100 text-amber-800" },
  ISSUE_MISMATCH: { label: "Issues ≠ app", className: "bg-orange-100 text-orange-800" },
  COUNT_VARIANCE: { label: "Count variance", className: "bg-red-100 text-red-700" },
  SHEET_MATH_MISMATCH: { label: "Sheet maths off", className: "bg-purple-100 text-purple-700" },
};

const DEFAULT_ESTIMATE_MS = 25000;

export default function ReconcilePage() {
  const monthEndOptions = useMemo(() => monthEndPeriodOptions(false), []);
  const [file, setFile] = useState<File | null>(null);
  const [period, setPeriod] = useState<string>(monthEndOptions[0].label);
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [issuesOnly, setIssuesOnly] = useState(true);
  const [createdInvoices, setCreatedInvoices] = useState<Set<string>>(new Set());
  const [creatingInvoice, setCreatingInvoice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzeMutation = useAnalyzeStockTakeReconciliation();
  const createDeliveryMutation = useCreateReconciliationDelivery();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const { confirm, ConfirmDialog } = useConfirm();

  const isAnalyzing = analyzeMutation.isPending;

  const handleCreateDelivery = async (doc: ReconciliationDocumentCheck) => {
    if (!file || report === null) return;
    const supplierSuffix = doc.supplier === null ? "" : ` from ${doc.supplier}`;
    const confirmed = await confirm({
      title: `Create delivery ${doc.invoice}?`,
      message: `This records delivery ${doc.invoice}${supplierSuffix} and increases stock for the items received against it on the sheet. Continue?`,
      confirmLabel: "Create delivery",
      variant: "warning",
    });
    if (!confirmed) return;

    setCreatingInvoice(doc.invoice);
    setError(null);
    try {
      const result = await createDeliveryMutation.mutateAsync({
        file,
        invoice: doc.invoice,
        receivedDate: report.periodEnd,
      });
      if (result.created) {
        setCreatedInvoices((prev) => {
          const next = new Set(prev);
          next.add(doc.invoice);
          return next;
        });
        const skippedNote =
          result.skippedItems.length === 0
            ? ""
            : ` ${result.skippedItems.length} item(s) had no stock match and were skipped.`;
        await confirm({
          title: "Delivery created",
          message: `${result.message} Stock increased by ${result.totalQuantity} unit(s) across ${result.lineCount} item(s).${skippedNote}`,
          confirmLabel: "Done",
          hideCancel: true,
          variant: "info",
        });
      } else {
        await confirm({
          title: "Could not create delivery",
          message: result.message,
          confirmLabel: "OK",
          hideCancel: true,
          variant: "warning",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create the delivery");
    } finally {
      setCreatingInvoice(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    const option = monthEndOptions.find((o) => o.label === period);
    if (!option) return;
    const periodEnd = option.isoDate;
    const periodStart = DateTime.fromISO(periodEnd).startOf("month").toISODate() ?? periodEnd;

    setError(null);
    try {
      const stats = await metricsApi
        .extractionStats("stock-take-reconcile", "analyze")
        .catch(() => null);
      const learnedMs = stats == null ? null : stats.averageMs;
      const estimatedDurationMs = learnedMs == null ? DEFAULT_ESTIMATE_MS : learnedMs;
      showExtraction({
        brand: "stock-control",
        label: `Reconciling ${period}…`,
        estimatedDurationMs,
      });
      const result = await analyzeMutation.mutateAsync({
        file,
        periodLabel: period,
        periodStart,
        periodEnd,
      });
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyse the sheet");
    } finally {
      hideExtraction();
    }
  };

  const handleFile = (selected: File | null) => {
    if (selected) {
      setFile(selected);
      setReport(null);
      setError(null);
    }
  };

  const reset = () => {
    setFile(null);
    setReport(null);
    setError(null);
    setCreatedInvoices(new Set());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/stock-control/portal/stock" className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock-Take Reconciliation</h1>
          <p className="mt-1 text-sm text-gray-600">
            Upload your full month-end stock sheet. Nix cross-checks each invoice and issue against
            the app, and explains why your counts differ.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {report === null ? (
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month-End Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="block w-64 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
            >
              {monthEndOptions.map((opt) => (
                <option key={opt.label} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Deliveries and issues recorded in this month are compared against your sheet.
            </p>
          </div>

          <div
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const dropped = e.dataTransfer.files[0];
              handleFile(dropped ?? null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
              isDragging ? "border-teal-500 bg-teal-50" : "border-gray-300 hover:border-teal-400"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                handleFile(selected ?? null);
              }}
              className="hidden"
            />
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-3 text-sm font-medium text-gray-900">
              {file ? file.name : "Drop your stock sheet here, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-gray-500">Excel (.xlsx, .xls) or CSV</p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!file || isAnalyzing}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? "Analysing…" : "Analyse & Reconcile"}
            </button>
          </div>
        </div>
      ) : (
        <ReconciliationResult
          report={report}
          issuesOnly={issuesOnly}
          onToggleIssuesOnly={() => setIssuesOnly((v) => !v)}
          onReset={reset}
          createdInvoices={createdInvoices}
          creatingInvoice={creatingInvoice}
          onCreateDelivery={handleCreateDelivery}
        />
      )}
      {ConfirmDialog}
    </div>
  );
}

interface ResultProps {
  report: ReconciliationReport;
  issuesOnly: boolean;
  onToggleIssuesOnly: () => void;
  onReset: () => void;
  createdInvoices: Set<string>;
  creatingInvoice: string | null;
  onCreateDelivery: (doc: ReconciliationDocumentCheck) => void;
}

function ReconciliationResult(props: ResultProps) {
  const report = props.report;
  const periodLabel = report.periodLabel;
  const periodTitle = periodLabel ?? "Reconciliation";
  const matchedCount = report.itemCount - report.unmatchedItemCount;
  const visibleItems = props.issuesOnly
    ? report.items.filter((item) => item.flags.length > 0)
    : report.items;
  const varianceValue = report.totalCountVarianceValue.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
  });

  return (
    <div className="space-y-4">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">{periodTitle} — Results</h2>
          <button
            type="button"
            onClick={props.onReset}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Analyse Another Sheet
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard label="Items" value={report.itemCount} tone="gray" />
          <SummaryCard label="Matched" value={matchedCount} tone="green" />
          <SummaryCard label="Unmatched" value={report.unmatchedItemCount} tone="gray" />
          <SummaryCard label="Missing docs" value={report.missingDocumentCount} tone="red" />
          <SummaryCard label="Intake gaps" value={report.intakeMismatchCount} tone="amber" />
          <SummaryCard label="Issue gaps" value={report.issueMismatchCount} tone="orange" />
        </div>
        <div className="mt-3 text-sm text-gray-600">
          Count variances: <span className="font-semibold">{report.countVarianceCount}</span> items
          · estimated variance value <span className="font-semibold">{varianceValue}</span>
        </div>
        {report.warnings.length > 0 && (
          <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            {report.warnings.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
        )}
      </div>

      {report.missingDocuments.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Invoices/deliveries on the sheet but NOT in the app ({report.missingDocuments.length})
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            These documents are referenced on your stock sheet but have no matching delivery or
            supplier invoice captured in the app — likely the source of intake shortfalls. Click
            "Create delivery" to record one from the sheet's quantities.
          </p>
          <div className="flex flex-wrap gap-2">
            {report.missingDocuments.map((doc) => {
              const supplier = doc.supplier;
              const isCreated = props.createdInvoices.has(doc.invoice);
              const isCreating = props.creatingInvoice === doc.invoice;
              return (
                <div
                  key={`${doc.invoice}-${supplier ?? ""}`}
                  className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs ${
                    isCreated
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  <span className="font-medium">{doc.invoice}</span>
                  {supplier ? <span className="opacity-70">· {supplier}</span> : null}
                  {isCreated ? (
                    <span className="font-semibold">✓ created</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => props.onCreateDelivery(doc)}
                      disabled={isCreating}
                      className="rounded bg-teal-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {isCreating ? "Creating…" : "Create delivery"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Item analysis ({visibleItems.length})
          </h3>
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={props.issuesOnly}
              onChange={props.onToggleIssuesOnly}
              className="h-4 w-4 rounded border-gray-300 text-teal-600"
            />
            Show only items with discrepancies
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Item</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Category</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Open</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">
                  Intake (sheet/app)
                </th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">
                  Issues (sheet/app)
                </th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Close</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Count</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Diff</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleItems.map((item) => (
                <ItemRow key={item.rowIndex} item={item} />
              ))}
            </tbody>
          </table>
          {visibleItems.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">
              No discrepancies — every item reconciles against the app.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ItemRow(props: { item: ReconciliationItemAnalysis }) {
  const item = props.item;
  const intakeMismatch = item.flags.includes("INTAKE_MISMATCH");
  const issueMismatch = item.flags.includes("ISSUE_MISMATCH");
  const diff =
    item.sheetActualCount === null ? null : item.sheetActualCount - item.sheetStatedClosing;
  const diffClass =
    diff === null
      ? "text-gray-400"
      : diff < 0
        ? "text-red-600"
        : diff > 0
          ? "text-amber-700"
          : "text-gray-500";
  const itemName = item.name;
  const matchedName = item.matchedName;
  const name = itemName ?? matchedName ?? "—";
  const sku = item.sku;
  const skuLabel = sku ?? "no code";
  const category = item.category;
  const categoryLabel = category ?? "—";
  const countDisplay = item.sheetActualCount === null ? "—" : item.sheetActualCount;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-2 py-1.5">
        <div className="font-medium text-gray-900">{name}</div>
        <div className="text-[10px] text-gray-400">
          {skuLabel}
          {item.matchedStockItemId === null ? " · unmatched" : ""}
        </div>
      </td>
      <td className="px-2 py-1.5 text-gray-600">{categoryLabel}</td>
      <td className="px-2 py-1.5 text-right font-mono">{item.sheetOpening}</td>
      <td
        className={`px-2 py-1.5 text-right font-mono ${intakeMismatch ? "text-amber-700 font-semibold" : ""}`}
      >
        {item.sheetIntake} / {item.appDeliveryTotal}
      </td>
      <td
        className={`px-2 py-1.5 text-right font-mono ${issueMismatch ? "text-orange-700 font-semibold" : ""}`}
      >
        {item.sheetIssues} / {item.appIssueTotal}
      </td>
      <td className="px-2 py-1.5 text-right font-mono">{item.sheetStatedClosing}</td>
      <td className="px-2 py-1.5 text-right font-mono">{countDisplay}</td>
      <td className={`px-2 py-1.5 text-right font-mono font-semibold ${diffClass}`}>
        {diff === null ? "—" : diff > 0 ? `+${diff}` : diff}
      </td>
      <td className="px-2 py-1.5">
        <div className="flex flex-wrap gap-1">
          {item.flags.map((flag) => {
            const meta = FLAG_LABELS[flag];
            return (
              <span
                key={flag}
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.className}`}
              >
                {meta.label}
              </span>
            );
          })}
        </div>
      </td>
    </tr>
  );
}

function SummaryCard(props: { label: string; value: number; tone: string }) {
  const toneClass =
    props.tone === "green"
      ? "bg-green-50 text-green-700"
      : props.tone === "red"
        ? "bg-red-50 text-red-700"
        : props.tone === "amber"
          ? "bg-amber-50 text-amber-700"
          : props.tone === "orange"
            ? "bg-orange-50 text-orange-700"
            : "bg-gray-50 text-gray-700";
  return (
    <div className={`rounded-lg p-3 text-center ${toneClass}`}>
      <div className="text-xl font-bold">{props.value}</div>
      <div className="text-xs">{props.label}</div>
    </div>
  );
}
