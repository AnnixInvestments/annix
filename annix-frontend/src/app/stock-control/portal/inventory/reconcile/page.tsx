"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { metricsApi } from "@/app/lib/api/metricsApi";
import type {
  DocVerificationGroup,
  IssuanceFixMode,
  IssueDateColumn,
  ReconciliationDocumentCheck,
  ReconciliationFlag,
  ReconciliationItemAnalysis,
  ReconciliationReport,
} from "@/app/lib/api/stockControlApi";
import { DateTime, formatDateTimeZA, monthEndPeriodOptions } from "@/app/lib/datetime";
import { useAdaptiveExtractionProgress } from "@/app/lib/hooks/useAdaptiveExtractionProgress";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useAnalyzeStockTakeReconciliation,
  useCreateReconciliationDelivery,
  useCreateReconciliationIssuance,
  useIssueStockStaffMembers,
  useJobCards,
  useReconciliationIssuanceDetail,
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
  const [fixingItem, setFixingItem] = useState<ReconciliationItemAnalysis | null>(null);
  const [fixedRows, setFixedRows] = useState<Set<number>>(new Set());
  const [drillCell, setDrillCell] = useState<{
    item: ReconciliationItemAnalysis;
    column: IssueDateColumn;
    manual: number;
    app: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzeMutation = useAnalyzeStockTakeReconciliation();
  const createDeliveryMutation = useCreateReconciliationDelivery();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const { runBulk } = useAdaptiveExtractionProgress();
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
        periodLabel: report.periodLabel,
        sheetName: report.selectedSheet,
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

  const handleCreateAllDeliveries = async () => {
    if (!file || report === null) return;
    const pending = report.missingDocuments.filter((doc) => !createdInvoices.has(doc.invoice));
    if (pending.length === 0) return;
    const confirmed = await confirm({
      title: `Create ${pending.length} deliveries?`,
      message: `This records ${pending.length} missing delivery note(s) from the sheet and increases stock for each one's items. Continue?`,
      confirmLabel: "Create all",
      variant: "warning",
    });
    if (!confirmed) return;

    setError(null);
    const receivedDate = report.periodEnd;
    const periodLabel = report.periodLabel;
    const sheetName = report.selectedSheet;
    const result = await runBulk({
      brand: "stock-control",
      metricCategory: "stock-take-reconcile",
      metricOperation: "create-delivery",
      items: pending,
      itemId: (doc) => doc.invoice,
      itemLabel: (doc, i, t) => `Creating delivery ${i + 1} of ${t}: ${doc.invoice}…`,
      run: async (doc) => {
        const res = await createDeliveryMutation.mutateAsync({
          file,
          invoice: doc.invoice,
          receivedDate,
          periodLabel,
          sheetName,
        });
        if (!res.created) {
          throw new Error(res.message);
        }
        setCreatedInvoices((prev) => {
          const next = new Set(prev);
          next.add(doc.invoice);
          return next;
        });
      },
    });

    const failedNote =
      result.failed.length === 0
        ? ""
        : ` ${result.failed.length} could not be created (see the remaining red entries).`;
    await confirm({
      title: "Deliveries created",
      message: `Created ${result.succeeded.length} of ${pending.length} delivery note(s).${failedNote}`,
      confirmLabel: "Done",
      hideCancel: true,
      variant: result.failed.length === 0 ? "info" : "warning",
    });
  };

  const handleAnalyze = async (overrideSheet?: string | null) => {
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
        sheetName: overrideSheet ?? null,
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
    setFixedRows(new Set());
    setFixingItem(null);
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
              onClick={() => handleAnalyze()}
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
          onCreateAllDeliveries={handleCreateAllDeliveries}
          fixedRows={fixedRows}
          onFixIssuance={(item) => setFixingItem(item)}
          onChooseSheet={(sheet) => handleAnalyze(sheet)}
          onIssueCellClick={(item, column, manual, app) =>
            setDrillCell({ item, column, manual, app })
          }
        />
      )}
      {drillCell !== null ? (
        <IssuanceDetailModal
          item={drillCell.item}
          column={drillCell.column}
          manual={drillCell.manual}
          app={drillCell.app}
          onClose={() => setDrillCell(null)}
        />
      ) : null}
      {fixingItem !== null && report !== null ? (
        <IssuanceFixModal
          item={fixingItem}
          periodLabel={report.periodLabel}
          onClose={() => setFixingItem(null)}
          onFixed={(rowIndex) => {
            setFixedRows((prev) => {
              const next = new Set(prev);
              next.add(rowIndex);
              return next;
            });
            setFixingItem(null);
          }}
        />
      ) : null}
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
  onCreateAllDeliveries: () => void;
  fixedRows: Set<number>;
  onFixIssuance: (item: ReconciliationItemAnalysis) => void;
  onChooseSheet: (sheet: string) => void;
  onIssueCellClick: (
    item: ReconciliationItemAnalysis,
    column: IssueDateColumn,
    manual: number,
    app: number,
  ) => void;
}

function ReconciliationResult(props: ResultProps) {
  const report = props.report;
  const periodLabel = report.periodLabel;
  const periodTitle = periodLabel ?? "Reconciliation";
  const matchedCount = report.itemCount - report.unmatchedItemCount;
  const pendingMissingCount = report.missingDocuments.filter(
    (doc) => !props.createdInvoices.has(doc.invoice),
  ).length;
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
        {report.selectedSheet !== null && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
            <span>
              Reading tab: <span className="font-semibold">{report.selectedSheet}</span>
            </span>
            {report.availableSheets.length > 1 && (
              <select
                value={report.selectedSheet}
                onChange={(e) => props.onChooseSheet(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1 text-xs bg-white"
              >
                {report.availableSheets.map((sheet) => (
                  <option key={sheet} value={sheet}>
                    {sheet}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
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

      {report.documentGroups.length > 0 && (
        <DocumentVerificationTable
          groups={report.documentGroups}
          createdInvoices={props.createdInvoices}
          creatingInvoice={props.creatingInvoice}
          onCreateDelivery={props.onCreateDelivery}
          onCreateAllDeliveries={props.onCreateAllDeliveries}
          pendingMissingCount={pendingMissingCount}
        />
      )}

      {report.issueDateColumns.length > 0 && (
        <IssuedStockMatrix
          items={report.items}
          columns={report.issueDateColumns}
          onCellClick={props.onIssueCellClick}
        />
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
                <th className="px-2 py-2 text-right font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleItems.map((item) => (
                <ItemRow
                  key={item.rowIndex}
                  item={item}
                  isFixed={props.fixedRows.has(item.rowIndex)}
                  onFixIssuance={props.onFixIssuance}
                />
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

function ItemRow(props: {
  item: ReconciliationItemAnalysis;
  isFixed: boolean;
  onFixIssuance: (item: ReconciliationItemAnalysis) => void;
}) {
  const item = props.item;
  const intakeMismatch = item.flags.includes("INTAKE_MISMATCH");
  const issueMismatch = item.flags.includes("ISSUE_MISMATCH");
  const canFixIssuance = issueMismatch && item.matchedStockItemId !== null;
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
      <td className="px-2 py-1.5 text-right">
        {props.isFixed ? (
          <span className="text-[11px] font-semibold text-green-700">✓ fixed</span>
        ) : canFixIssuance ? (
          <button
            type="button"
            onClick={() => props.onFixIssuance(item)}
            className="rounded bg-orange-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-orange-700"
          >
            Fix issues
          </button>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
    </tr>
  );
}

function DocumentVerificationTable(props: {
  groups: DocVerificationGroup[];
  createdInvoices: Set<string>;
  creatingInvoice: string | null;
  onCreateDelivery: (doc: ReconciliationDocumentCheck) => void;
  onCreateAllDeliveries: () => void;
  pendingMissingCount: number;
}) {
  const rows = props.groups.flatMap((g) => g.rows);
  const presentCount = rows.filter((r) => r.status === "present").length;
  const missingInAppCount = rows.filter((r) => r.status === "missing_in_app").length;
  const notOnManualCount = rows.filter((r) => r.status === "missing_on_manual").length;

  const headCell =
    "sticky top-0 z-10 bg-gray-100 px-3 py-2 text-left font-medium text-gray-600 border-b border-gray-200";
  const firstHead =
    "sticky top-0 left-0 z-20 bg-gray-100 px-3 py-2 text-left font-medium text-gray-600 border-b border-r border-gray-200";
  const firstCell =
    "sticky left-0 z-[5] bg-white px-3 py-1.5 font-medium text-gray-700 border-r border-gray-200 whitespace-nowrap";

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Document verification ({rows.length})
        </h3>
        {props.pendingMissingCount > 1 ? (
          <button
            type="button"
            onClick={props.onCreateAllDeliveries}
            className="shrink-0 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
          >
            Create all missing ({props.pendingMissingCount})
          </button>
        ) : null}
      </div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-gray-600">
        <span>
          <span className="font-semibold text-green-600">✓</span> on system ({presentCount})
        </span>
        <span>
          <span className="font-semibold text-red-600">✗</span> missing from system (
          {missingInAppCount})
        </span>
        <span>
          <span className="font-semibold text-amber-600">⚠</span> on system, not on manual (
          {notOnManualCount})
        </span>
      </div>
      <div className="max-h-[28rem] overflow-auto rounded border border-gray-200">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={firstHead}>Supplier</th>
              <th className={headCell}>Document No.</th>
              <th className={headCell}>Status</th>
              <th className={`${headCell} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => {
              const created = props.createdInvoices.has(row.invoice);
              const creating = props.creatingInvoice === row.invoice;
              return (
                <tr key={`${row.supplier}-${row.invoice}-${i}`} className="hover:bg-gray-50">
                  <td className={firstCell}>{row.supplier}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-gray-900">
                    {row.invoice}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5">
                    {row.status === "present" ? (
                      <span className="text-green-700">
                        <span className="font-semibold">✓</span> On system
                      </span>
                    ) : row.status === "missing_in_app" ? (
                      <span className="text-red-700">
                        <span className="font-semibold">✗</span> Missing in app
                      </span>
                    ) : (
                      <span className="text-amber-700">
                        <span className="font-semibold">⚠</span> Not on manual
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right">
                    {row.status === "missing_in_app" ? (
                      created ? (
                        <span className="text-[11px] font-semibold text-green-700">✓ created</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            props.onCreateDelivery({
                              invoice: row.invoice,
                              supplier: row.supplier,
                              foundAs: null,
                              foundId: null,
                              status: "missing",
                            })
                          }
                          disabled={creating}
                          className="rounded bg-teal-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                        >
                          {creating ? "Creating…" : "Create delivery"}
                        </button>
                      )
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IssuedStockMatrix(props: {
  items: ReconciliationItemAnalysis[];
  columns: IssueDateColumn[];
  onCellClick: (
    item: ReconciliationItemAnalysis,
    column: IssueDateColumn,
    manual: number,
    app: number,
  ) => void;
}) {
  const activeItems = props.items.filter(
    (item) => item.issuesByDate.some((q) => q !== 0) || item.appIssuesByDate.some((q) => q !== 0),
  );

  const headCell =
    "sticky top-0 z-10 bg-gray-100 px-2 py-1.5 text-center font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap";
  const firstHead =
    "sticky top-0 left-0 z-20 bg-gray-100 px-3 py-1.5 text-left font-medium text-gray-600 border-b border-r border-gray-200";
  const firstCell =
    "sticky left-0 z-[5] bg-white px-3 py-1 font-medium text-gray-700 border-r border-gray-200 whitespace-nowrap";

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="mb-1 text-sm font-semibold text-gray-900">
        Issued-stock verification ({activeItems.length})
      </h3>
      <p className="mb-3 text-xs text-gray-500">
        Each cell shows <span className="font-mono">manual / app</span> issued that day. Red means
        they differ. Click any day to see the app's recorded issuances for that item.
      </p>
      {activeItems.length === 0 ? (
        <p className="text-sm text-gray-600">
          No issues recorded on the sheet or in the app for this month.
        </p>
      ) : (
        <div className="max-h-[32rem] overflow-auto rounded border border-gray-200">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className={firstHead}>Item</th>
                <th className={headCell}>Total</th>
                {props.columns.map((col, i) => (
                  <th key={`${col.label}-${i}`} className={headCell}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeItems.map((item) => {
                const itemName = item.name;
                const matchedName = item.matchedName;
                const name = itemName ?? matchedName ?? "—";
                const manualTotal = item.sheetIssues;
                const appTotal = item.appIssueTotal;
                const totalMismatch = Math.abs(manualTotal - appTotal) > 0.001;
                return (
                  <tr key={item.rowIndex} className="hover:bg-gray-50">
                    <td className={firstCell}>
                      <div className="max-w-[14rem] truncate" title={name}>
                        {name}
                      </div>
                      {item.matchedStockItemId === null && (
                        <div className="text-[10px] text-gray-400">unmatched</div>
                      )}
                    </td>
                    <td
                      className={`px-2 py-1 text-center font-mono ${totalMismatch ? "bg-red-50 font-semibold text-red-700" : "text-gray-500"}`}
                    >
                      {manualTotal}/{appTotal}
                    </td>
                    {props.columns.map((col, c) => {
                      const mRaw = item.issuesByDate[c];
                      const aRaw = item.appIssuesByDate[c];
                      const m = mRaw == null ? 0 : mRaw;
                      const a = aRaw == null ? 0 : aRaw;
                      const empty = m === 0 && a === 0;
                      const mismatch = Math.abs(m - a) > 0.001;
                      return (
                        <td key={`${item.rowIndex}-${c}`} className="px-1 py-1 text-center">
                          {empty ? (
                            <span className="text-gray-200">·</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => props.onCellClick(item, col, m, a)}
                              className={`min-w-[2.5rem] rounded px-1 font-mono ${mismatch ? "bg-red-100 font-semibold text-red-700 hover:bg-red-200" : "text-gray-700 hover:bg-gray-100"}`}
                              title="Click for issuance detail"
                            >
                              {m}/{a}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function IssuanceDetailModal(props: {
  item: ReconciliationItemAnalysis;
  column: IssueDateColumn;
  manual: number;
  app: number;
  onClose: () => void;
}) {
  const detailMutation = useReconciliationIssuanceDetail();
  const stockItemId = props.item.matchedStockItemId;
  const isoDate = props.column.isoDate;
  const mutate = detailMutation.mutate;

  useEffect(() => {
    if (stockItemId !== null && isoDate !== "") {
      mutate({ stockItemId, isoDate });
    }
  }, [stockItemId, isoDate, mutate]);

  const data = detailMutation.data;
  const rows = data ?? [];
  const sheetName = props.item.name;
  const matchedName = props.item.matchedName;
  const itemName = sheetName ?? matchedName ?? "this item";
  const mismatch = Math.abs(props.manual - props.app) > 0.001;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            Issuances — {props.column.label}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">{itemName}</p>
        </div>
        <div className="border-b border-gray-200 px-5 py-2 text-xs">
          <span className={mismatch ? "font-semibold text-red-700" : "text-gray-700"}>
            Manual: {props.manual} · App: {props.app}
            {mismatch ? " — differ" : " — match"}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {stockItemId === null ? (
            <p className="text-sm text-gray-600">
              This item isn't matched to a stock item, so the app has no issuance records for it.
            </p>
          ) : isoDate === "" ? (
            <p className="text-sm text-gray-600">
              This column's date couldn't be read, so issuances can't be looked up.
            </p>
          ) : detailMutation.isPending ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-600">
              The app has no issuances recorded for this item on this day.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b border-gray-200 text-gray-500">
                <tr>
                  <th className="px-2 py-1 text-left">Time</th>
                  <th className="px-2 py-1 text-right">Qty</th>
                  <th className="px-2 py-1 text-left">By</th>
                  <th className="px-2 py-1 text-left">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => {
                  const by = r.by;
                  const notes = r.notes;
                  return (
                    <tr key={`${r.date}-${i}`}>
                      <td className="px-2 py-1 font-mono text-gray-600">
                        {r.date === "" ? "—" : formatDateTimeZA(r.date)}
                      </td>
                      <td className="px-2 py-1 text-right font-mono">{r.quantity}</td>
                      <td className="px-2 py-1 text-gray-700">{by ?? "—"}</td>
                      <td className="px-2 py-1 text-gray-500">{notes ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex justify-end border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
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

interface IssuanceFixModalProps {
  item: ReconciliationItemAnalysis;
  periodLabel: string | null;
  onClose: () => void;
  onFixed: (rowIndex: number) => void;
}

function IssuanceFixModal(props: IssuanceFixModalProps) {
  const item = props.item;
  const delta = item.sheetIssues - item.appIssueTotal;
  const direction: "out" | "in" = delta >= 0 ? "out" : "in";
  const quantity = Math.abs(delta);
  const [mode, setMode] = useState<IssuanceFixMode>("adjustment");
  const [staffName, setStaffName] = useState<string>("");
  const [jobCardId, setJobCardId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const staffQuery = useIssueStockStaffMembers();
  const jobCardsQuery = useJobCards("all");
  const mutation = useCreateReconciliationIssuance();
  const staffData = staffQuery.data;
  const staff = staffData ?? [];
  const jobCardsData = jobCardsQuery.data;
  const jobCards = jobCardsData ?? [];

  const sheetName = item.name;
  const fallbackName = item.matchedName;
  const itemName = sheetName ?? fallbackName ?? "this item";
  const directionLabel =
    direction === "out"
      ? "The sheet shows more issues than the app recorded — record the shortfall as stock going OUT."
      : "The app recorded more issues than the sheet — record a reversal bringing stock back IN.";

  const submit = async () => {
    setError(null);
    if (mode === "staff" && staffName === "") {
      setError("Choose a staff member.");
      return;
    }
    if (mode === "jobcard" && jobCardId === "") {
      setError("Choose a job card.");
      return;
    }
    const chosenJobCard = jobCards.find((jc) => String(jc.id) === jobCardId);
    const jobCardLabel =
      chosenJobCard === undefined
        ? null
        : `JC ${chosenJobCard.jobNumber} — ${chosenJobCard.jobName}`;
    try {
      await mutation.mutateAsync({
        stockItemId: item.matchedStockItemId as number,
        quantity,
        direction,
        mode,
        staffName: mode === "staff" ? staffName : null,
        jobCardId: mode === "jobcard" && chosenJobCard !== undefined ? chosenJobCard.id : null,
        jobCardLabel: mode === "jobcard" ? jobCardLabel : null,
        periodLabel: props.periodLabel,
      });
      props.onFixed(item.rowIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record the issuance");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Record missing issuance</h2>
          <p className="mt-1 text-xs text-gray-500">{itemName}</p>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
            Sheet issues <span className="font-mono font-semibold">{item.sheetIssues}</span> · app
            issues <span className="font-mono font-semibold">{item.appIssueTotal}</span> ·{" "}
            <span className="font-semibold">
              {quantity} unit(s) {direction === "out" ? "OUT" : "back IN"}
            </span>
            <div className="mt-1 text-gray-500">{directionLabel}</div>
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-gray-700">Record as</span>
            <div className="space-y-1.5">
              {(
                [
                  ["adjustment", "Stock adjustment (no recipient)"],
                  ["staff", "Issuance to a staff member"],
                  ["jobcard", "Issuance to a job card"],
                ] as Array<[IssuanceFixMode, string]>
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="issuance-mode"
                    checked={mode === value}
                    onChange={() => setMode(value)}
                    className="h-4 w-4 text-teal-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {mode === "staff" ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Staff member</label>
              <select
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {mode === "jobcard" ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Job card</label>
              <select
                value={jobCardId}
                onChange={(e) => setJobCardId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {jobCards.map((jc) => (
                  <option key={jc.id} value={String(jc.id)}>
                    {jc.jobNumber} — {jc.jobName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {error !== null ? (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={mutation.isPending}
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Recording…" : "Record issuance"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
