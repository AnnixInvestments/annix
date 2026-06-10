"use client";

import { isString, keys, values } from "es-toolkit/compat";
import React, { useCallback, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useOptionalAdminAuth } from "@/app/context/AdminAuthContext";
import { useOptionalCustomerAuth } from "@/app/context/CustomerAuthContext";
import { nowISO } from "@/app/lib/datetime";
import {
  useAllBnwSetWeights,
  useAllFlangeTypeWeights,
  useAllGasketWeights,
} from "@/app/lib/query/hooks";
import { detectClarificationRequirements } from "@/app/lib/rfq/preQuoteRequirements";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";
import { buildBoqConsolidation } from "./buildConsolidation";
import {
  consolidatedToRows,
  formatQty,
  formatWeight,
  safeFilename,
  triggerDownload,
} from "./helpers";
import type { ConsolidatedItem, ExportableSubsection, ExportFormat } from "./types";

export interface BOQStepProps {
  onPrevStep?: () => void;
  onSubmit?: () => void;
  onResubmit?: () => void;
  onResendBoq?: () => void;
  isEditing?: boolean;
  clarificationsSkipped?: boolean;
}

export function useBOQLogic(props: BOQStepProps) {
  const { onPrevStep, onSubmit, onResubmit, onResendBoq, isEditing, clarificationsSkipped } = props;
  const rfqData = useRfqWizardStore((s) => s.rfqData);
  const masterData = useRfqWizardStore((s) => s.masterData);
  const loading = useRfqWizardStore((s) => s.isSubmitting);
  const pendingDocuments = useRfqWizardStore((s) => s.pendingDocuments);
  const pendingTenderDocuments = useRfqWizardStore((s) => s.pendingTenderDocuments);
  const { data: allWeights = [] } = useAllFlangeTypeWeights();
  const { data: allBnwSets = [] } = useAllBnwSetWeights();
  const { data: allGaskets = [] } = useAllGasketWeights();
  const allEntries: any[] = rfqData.items.length > 0 ? rfqData.items : rfqData.straightPipeEntries;
  // Detection runs at render time off the live items + uploaded
  // filenames. The PreQuoteClarificationsStep does the same compute
  // but the BOQ step doing it independently means jumping straight
  // to BOQ via the step pill still applies the omissions — no need
  // to threaad omittedItemIds through props.
  const omittedItemIds = useMemo(() => {
    const pendingDocsArray = pendingDocuments || [];
    const pendingTenderArray = pendingTenderDocuments || [];
    const filenames = [...pendingDocsArray, ...pendingTenderArray].map((d) => d.file.name);
    const requirements = detectClarificationRequirements(
      allEntries,
      filenames,
      rfqData.globalSpecs,
    );
    return requirements.flaggedItemIds;
  }, [allEntries, pendingDocuments, pendingTenderDocuments, rfqData.globalSpecs]);

  // Skip flagged rows from consolidation — they're listed in the
  // "Items omitted — pending drawings" panel above the BOQ tables
  // instead so the customer sees what's missing without polluting
  // the supplier-bound output.
  const entries: any[] = allEntries.filter((entry) => !omittedItemIds.has(entry.id));
  const omittedEntries: any[] = allEntries.filter((entry) => omittedItemIds.has(entry.id));
  // Admin-only traceability: map each clientItemNumber back to the
  // source sheet + row the item was extracted from so the BOQ
  // tables can show a "Source" column. Manual entries (no Nix
  // extraction) won't appear in this map and render as "—".
  // Lookup keyed by entry.id (unique per item) rather than
  // clientItemNumber (which collides across sheets — the same "a.1"
  // can appear on three different enquiry tabs and resolve to three
  // different rows). The consolidation pipeline tracks entryIds in
  // parallel to entries so the render can pull each source out
  // independently.
  //
  // Built in three passes so legacy entries (extracted before v1.5.32
  // when the sheet name was first written) inherit the sheet from
  // any newer entry that points to the same row. Without that
  // backfill, a re-extracted RFQ that left old items in the wizard
  // state shows duplicate labels: "R6, HDPE ENQ 1!R6" for the same
  // source row.
  const sourceLookup = useMemo(() => {
    const raw = new Map<string, { row: number; sheet?: string }>();
    allEntries.forEach((entry) => {
      const entryId = entry.id;
      if (!entryId) return;
      const sourceLocation = entry.sourceLocation;
      if (sourceLocation) {
        raw.set(entryId, { row: sourceLocation.rowNumber, sheet: sourceLocation.sheetName });
        return;
      }
      const rawNotes = entry.notes;
      if (!isString(rawNotes)) return;
      const match = rawNotes.match(/Extracted by Nix from(?: Sheet '([^']+)')? Row (\d+)/);
      const matchedSheet = match?.[1];
      const matchedRow = match?.[2];
      if (!matchedRow) return;
      raw.set(entryId, { row: Number.parseInt(matchedRow, 10), sheet: matchedSheet });
    });
    const sheetByRow = new Map<number, string>();
    raw.forEach(({ row, sheet }) => {
      if (sheet && !sheetByRow.has(row)) {
        sheetByRow.set(row, sheet);
      }
    });
    const lookup = new Map<string, string>();
    raw.forEach(({ row, sheet }, entryId) => {
      const finalSheet = sheet ?? sheetByRow.get(row);
      const sheetPrefix = finalSheet ? `${finalSheet}!` : "";
      lookup.set(entryId, `${sheetPrefix}R${row}`);
    });
    return lookup;
  }, [allEntries]);
  // Render the Source column whenever at least one entry was
  // extracted from a tender document — covers Nix uploads (admin or
  // customer) and hides the column for purely manual entry where the
  // column would just show "—" for every row.
  const hasAnySourceLocations = sourceLookup.size > 0;
  const globalSpecs = rfqData.globalSpecs;
  const rawRequiredProducts = rfqData.requiredProducts;
  const requiredProducts = rawRequiredProducts || [];
  // Authentication status for unregistered customer restrictions
  // Don't apply restrictions while auth is still loading to prevent flash of restricted state
  const { isAuthenticated: isCustomerAuthenticated, isLoading: isCustomerAuthLoading } =
    useOptionalCustomerAuth();
  const { isAuthenticated: isAdminAuthenticated, isLoading: isAdminAuthLoading } =
    useOptionalAdminAuth();
  const isAuthLoading = isCustomerAuthLoading || isAdminAuthLoading;
  const isUnregisteredCustomer =
    !isAuthLoading && !isCustomerAuthenticated && !isAdminAuthenticated;

  // Restriction popup state
  type RestrictionPopupType = "export";
  const [restrictionPopup, setRestrictionPopup] = useState<{
    type: RestrictionPopupType;
    x: number;
    y: number;
  } | null>(null);

  const showRestrictionPopup = useCallback(
    (type: RestrictionPopupType) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setRestrictionPopup({ type, x: e.clientX, y: e.clientY });
    },
    [],
  );
  const {
    consolidatedPipes,
    consolidatedBends,
    consolidatedFittings,
    consolidatedFlanges,
    consolidatedBnwSets,
    consolidatedGaskets,
    consolidatedBlankFlanges,
    consolidatedValves,
    consolidatedTanks,
    consolidatedFasteners,
    consolidatedUnidentified,
    consolidatedHdpeOther,
    consolidatedSteelOther,
    consolidatedPvcOther,
    consolidatedHdpeStubs,
    consolidatedPvcStubs,
    totalWeight,
  } = buildBoqConsolidation({
    entries,
    globalSpecs,
    masterData,
    allWeights,
    allBnwSets,
    allGaskets,
  });

  // Dark mode background mapping for header rows
  const darkBgMap: Record<string, string> = {
    "bg-blue-50": "dark:bg-blue-900/30",
    "bg-purple-50": "dark:bg-purple-900/30",
    "bg-green-50": "dark:bg-green-900/30",
    "bg-cyan-50": "dark:bg-cyan-900/30",
    "bg-gray-50": "dark:bg-gray-800/50",
    "bg-orange-50": "dark:bg-orange-900/30",
    "bg-teal-50": "dark:bg-teal-900/30",
  };

  // Dark mode text color mapping
  const darkTextMap: Record<string, string> = {
    "text-blue-700": "dark:text-blue-300",
    "text-purple-700": "dark:text-purple-300",
    "text-green-700": "dark:text-green-300",
    "text-cyan-700": "dark:text-cyan-300",
    "text-gray-700": "dark:text-gray-300",
    "text-orange-700": "dark:text-orange-300",
    "text-teal-700": "dark:text-teal-300",
  };

  // Filter a consolidated map to only items tagged with the given
  // material. Untagged items are skipped — flanges/BNW/gaskets always
  // sit in the Steel section in v1.1.35; v1.1.36 will introduce
  // proper HDPE-stub-end + steel-backing-flange line items so they
  // route correctly per supplier.

  // Helper that decides whether to render a consolidated section
  // table only if it has any rows, then forwards to the existing
  // renderer. Trims the JSX clutter from the material-grouped
  // layout below.
  const maybeRenderTable = (
    title: string,
    map: Map<string, ConsolidatedItem>,
    bgColor: string,
    textColor: string,
    showWeldColumns: boolean = false,
    showAreaColumns: boolean = false,
  ): React.ReactNode => {
    if (map.size === 0) return null;
    return renderConsolidatedTable(
      title,
      map,
      bgColor,
      textColor,
      showWeldColumns,
      showAreaColumns,
    );
  };

  const boqSourceContext = useMemo(
    () => ({ hasAnySourceLocations, sourceLookup }),
    [hasAnySourceLocations, sourceLookup],
  );

  // Trigger download of `data` as `filename` with the given MIME
  // type. Browser Blob + ObjectURL pattern.
  // Per-section exporters. The section name is used both as the
  // filename stem (via safeFilename) and the sheet name in xlsx.

  // Group exporter — bundles every sub-section of a material/category
  // group into a single download. Excel uses one workbook with a
  // sheet per sub-section. CSV concatenates with section headers and
  // blank-line separators. PDF/Word emit one HTML document with each
  // sub-section as an h2 + table.
  const exportGroup = useCallback(
    (format: ExportFormat, groupName: string, subsections: ExportableSubsection[]) => {
      const populated = subsections.filter((s) => s.items.size > 0);
      if (populated.length === 0) return;
      const stem = safeFilename(groupName);

      if (format === "excel") {
        const workbook = XLSX.utils.book_new();
        populated.forEach((sub) => {
          const rows = consolidatedToRows(
            sub.items,
            sub.showWeldColumns,
            sub.showAreaColumns,
            boqSourceContext,
          );
          if (rows.length === 0) return;
          const sheet = XLSX.utils.json_to_sheet(rows);
          // Sheet names capped at 31 chars by Excel — strip illegal
          // chars too (\, /, ?, *, [, ]).
          const sheetName = sub.title.replace(/[\\/?*[\]:]/g, "-").substring(0, 31);
          XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
        });
        XLSX.writeFile(workbook, `${stem}.xlsx`);
        return;
      }

      if (format === "csv") {
        const escapeCell = (v: string | number) => {
          const s = String(v ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const blocks = populated.map((sub) => {
          const rows = consolidatedToRows(
            sub.items,
            sub.showWeldColumns,
            sub.showAreaColumns,
            boqSourceContext,
          );
          if (rows.length === 0) return "";
          const headers = keys(rows[0]);
          const lines = [
            `# ${sub.title}`,
            headers.join(","),
            ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(",")),
          ];
          return lines.join("\n");
        });
        const csv = blocks.filter((b) => b.length > 0).join("\n\n");
        triggerDownload(csv, `${stem}.csv`, "text/csv;charset=utf-8");
        return;
      }

      // PDF + Word both serialise to HTML — PDF opens a print window
      // so the customer's browser handles the rendering; Word saves a
      // .doc file that Word opens directly.
      const sectionsHtml = populated
        .map((sub) => {
          const rows = consolidatedToRows(
            sub.items,
            sub.showWeldColumns,
            sub.showAreaColumns,
            boqSourceContext,
          );
          if (rows.length === 0) return "";
          const headers = keys(rows[0]);
          const tableRows = rows
            .map(
              (r) =>
                `<tr>${headers
                  .map((h) => `<td style="border:1px solid #ccc;padding:4px 6px;">${r[h]}</td>`)
                  .join("")}</tr>`,
            )
            .join("");
          const headerRow = `<tr>${headers.map((h) => `<th style="border:1px solid #ccc;padding:6px 8px;background:#f3f4f6;text-align:left;">${h}</th>`).join("")}</tr>`;
          return `<h2 style="margin-top:24px">${sub.title}</h2><table style="border-collapse:collapse;width:100%;margin-bottom:16px">${headerRow}${tableRows}</table>`;
        })
        .join("");
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${groupName}</title></head><body style="font-family:sans-serif;font-size:12px"><h1>${groupName}</h1>${sectionsHtml}</body></html>`;

      if (format === "word") {
        triggerDownload(html, `${stem}.doc`, "application/msword");
        return;
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    },
    [boqSourceContext],
  );

  // Render consolidated BOQ table with consistent columns
  const renderConsolidatedTable = (
    title: string,
    items: Map<string, ConsolidatedItem>,
    bgColor: string,
    textColor: string,
    showWeldColumns: boolean = false,
    showAreaColumns: boolean = false,
  ) => {
    if (items.size === 0) return null;

    const itemsArray = Array.from(items.values());
    const sectionWeight = itemsArray.reduce((sum, item) => sum + item.weight, 0);
    const sectionTotalQty = itemsArray.reduce((sum, item) => sum + item.qty, 0);

    // Collect all unique weld types across items
    const allWeldTypes = new Set<string>();
    if (showWeldColumns) {
      itemsArray.forEach((item) => {
        if (item.welds) {
          keys(item.welds).forEach((wt) => allWeldTypes.add(wt));
        }
      });
    }
    const weldTypesList = Array.from(allWeldTypes);

    // Check if any items have area data
    const hasAreaData =
      showAreaColumns &&
      itemsArray.some(
        (item) => (item.intAreaM2 && item.intAreaM2 > 0) || (item.extAreaM2 && item.extAreaM2 > 0),
      );

    const rawBgColor = darkBgMap[bgColor];

    // Get dark mode variants
    const darkBg = rawBgColor || "dark:bg-gray-800/50";
    const rawTextColor = darkTextMap[textColor];
    const darkText = rawTextColor || "dark:text-gray-300";

    return (
      <div className="mb-6">
        <h4
          className={`text-md font-semibold ${textColor} ${darkText} mb-2 flex items-center justify-between`}
        >
          <span>
            {title} ({sectionTotalQty} total, {items.size} {items.size === 1 ? "type" : "types"})
          </span>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            Section Weight: {formatWeight(sectionWeight)}
          </span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse table-fixed">
            <thead>
              <tr
                className={`${bgColor} ${darkBg} border-b-2 border-gray-300 dark:border-gray-600`}
              >
                <th
                  className={`text-left py-2 px-2 font-semibold text-xs ${textColor} ${darkText} w-20`}
                >
                  From
                </th>
                {hasAnySourceLocations && (
                  <th
                    className={`text-left py-2 px-2 font-semibold text-xs ${textColor} ${darkText} w-24`}
                    title={
                      "Source location in the uploaded BOQ document.\n" +
                      "Format: SheetName!Rn (e.g. HDPE ENQ 1!R62).\n" +
                      "Multiple rows are comma-separated when items consolidate.\n" +
                      "Note: the row refers to where Nix found the quantity line; " +
                      "the human-readable item description may sit on the row above it in SANS/SABS-style BOQs."
                    }
                  >
                    Source
                  </th>
                )}
                <th className={`text-center py-2 px-2 font-semibold ${textColor} ${darkText} w-10`}>
                  #
                </th>
                <th className={`text-left py-2 px-2 font-semibold ${textColor} ${darkText}`}>
                  Description
                </th>
                <th className={`text-center py-2 px-2 font-semibold ${textColor} ${darkText} w-14`}>
                  Qty
                </th>
                <th className={`text-center py-2 px-2 font-semibold ${textColor} ${darkText} w-14`}>
                  Unit
                </th>
                {showWeldColumns && (
                  <th
                    className={`text-right py-2 px-2 font-semibold text-xs ${textColor} ${darkText} w-20`}
                  >
                    Weld (m)
                  </th>
                )}
                {showAreaColumns && (
                  <>
                    <th
                      className={`text-right py-2 px-2 font-semibold text-xs ${textColor} ${darkText} w-16`}
                    >
                      Int m²
                    </th>
                    <th
                      className={`text-right py-2 px-2 font-semibold text-xs ${textColor} ${darkText} w-16`}
                    >
                      Ext m²
                    </th>
                  </>
                )}
                <th
                  className={`text-right py-2 px-2 font-semibold ${textColor} ${darkText} w-32 whitespace-nowrap`}
                >
                  Weight
                </th>
              </tr>
            </thead>
            <tbody>
              {itemsArray.map((item, idx) => {
                const totalWeld = item.welds
                  ? values(item.welds).reduce((sum, v) => sum + v, 0)
                  : 0;
                const rowBg = idx % 2 === 0 ? "bg-transparent" : "bg-gray-50 dark:bg-gray-800/30";
                const sourceLabelSet = new Set<string>();
                item.entryIds.forEach((id) => {
                  const label = sourceLookup.get(id);
                  if (label) sourceLabelSet.add(label);
                });
                const sourceLabels = Array.from(sourceLabelSet).join(", ");
                const sourceCell = sourceLabels || "—";
                return (
                  <tr
                    key={idx}
                    className={`border-b border-gray-200 dark:border-gray-700 ${rowBg} hover:bg-gray-100 dark:hover:bg-gray-700/50`}
                  >
                    <td
                      className="py-2 px-2 text-xs text-gray-600 dark:text-gray-400 truncate"
                      title={item.entries.join(", ")}
                    >
                      {item.entries.join(", ")}
                    </td>
                    {hasAnySourceLocations && (
                      <td
                        className="py-2 px-2 text-xs text-gray-600 dark:text-gray-400 truncate font-mono"
                        title={sourceCell}
                      >
                        {sourceCell}
                      </td>
                    )}
                    <td className="py-2 px-2 text-center text-gray-900 dark:text-gray-100">
                      {idx + 1}
                    </td>
                    <td
                      className="py-2 px-2 text-gray-900 dark:text-gray-100 truncate"
                      title={item.description}
                    >
                      {item.description}
                    </td>
                    <td className="py-2 px-2 text-center font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {formatQty(item.qty)}
                    </td>
                    <td className="py-2 px-2 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.unit}
                    </td>
                    {showWeldColumns && (
                      <td className="py-2 px-2 text-right text-xs text-gray-700 dark:text-gray-300">
                        {totalWeld > 0 ? totalWeld.toFixed(1) : "-"}
                      </td>
                    )}
                    {showAreaColumns && (
                      <>
                        <td className="py-2 px-2 text-right text-xs text-gray-700 dark:text-gray-300">
                          {item.intAreaM2 ? item.intAreaM2.toFixed(2) : "-"}
                        </td>
                        <td className="py-2 px-2 text-right text-xs text-gray-700 dark:text-gray-300">
                          {item.extAreaM2 ? item.extAreaM2.toFixed(2) : "-"}
                        </td>
                      </>
                    )}
                    <td className="py-2 px-2 text-right text-gray-900 dark:text-gray-100 tabular-nums whitespace-nowrap">
                      {formatWeight(item.weight)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Excel Export function
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Helper to convert Map to array for Excel (for individual sheets)
    const mapToExcelData = (
      items: Map<string, ConsolidatedItem>,
      sectionName: string,
      includeWelds: boolean = false,
      includeAreas: boolean = false,
    ) => {
      const data: any[] = [];
      let rowNum = 1;

      // Collect all weld types if needed
      const allWeldTypes = new Set<string>();
      if (includeWelds) {
        Array.from(items.values()).forEach((item) => {
          if (item.welds) {
            keys(item.welds).forEach((wt) => allWeldTypes.add(wt));
          }
        });
      }
      const weldTypesList = Array.from(allWeldTypes);

      Array.from(items.values()).forEach((item) => {
        const row: any = {
          "From Items": item.entries.join(", "),
          "#": rowNum++,
          Description: item.description,
          Qty: item.qty,
          Unit: item.unit,
        };

        // Add weld columns
        if (includeWelds) {
          weldTypesList.forEach((wt) => {
            row[`${wt} (m)`] = item.welds?.[wt]?.toFixed(2) || "";
          });
        }

        // Add area columns
        if (includeAreas) {
          row["Int m²"] = item.intAreaM2?.toFixed(2) || "";
          row["Ext m²"] = item.extAreaM2?.toFixed(2) || "";
        }

        row["Weight (kg)"] = item.weight.toFixed(2);
        data.push(row);
      });

      return data;
    };

    // Create combined BOQ sheet with all items
    const combinedData: any[] = [];
    let globalRowNum = 1;

    const addToCombined = (items: Map<string, ConsolidatedItem>, category: string) => {
      Array.from(items.values()).forEach((item) => {
        const totalWeld = item.welds ? values(item.welds).reduce((sum, v) => sum + v, 0) : 0;
        combinedData.push({
          "#": globalRowNum++,
          Category: category,
          Description: item.description,
          Qty: item.qty,
          Unit: item.unit,
          "Weld (m)": totalWeld > 0 ? totalWeld.toFixed(2) : "",
          "Int m²": item.intAreaM2?.toFixed(2) || "",
          "Ext m²": item.extAreaM2?.toFixed(2) || "",
          "Weight (kg)": item.weight.toFixed(2),
          "From Items": item.entries.join(", "),
        });
      });
    };

    // Add all categories to combined sheet
    addToCombined(consolidatedPipes, "Straight Pipes");
    addToCombined(consolidatedBends, "Bends");
    addToCombined(consolidatedFittings, "Fittings");
    addToCombined(consolidatedFlanges, "Flanges");
    addToCombined(consolidatedBlankFlanges, "Blank Flanges");
    addToCombined(consolidatedBnwSets, "BNW Sets");
    addToCombined(consolidatedGaskets, "Gaskets");
    addToCombined(consolidatedHdpeOther, "HDPE Other");
    addToCombined(consolidatedHdpeStubs, "HDPE Stub Ends");
    addToCombined(consolidatedPvcStubs, "PVC Stub-flange Adapters");
    addToCombined(consolidatedSteelOther, "Steel Other");
    addToCombined(consolidatedPvcOther, "PVC Other");
    addToCombined(consolidatedValves, "Valves");
    addToCombined(consolidatedTanks, "Tanks, Chutes & Vessels");
    addToCombined(consolidatedFasteners, "Fasteners");
    addToCombined(consolidatedUnidentified, "Unidentified");

    // Add Combined BOQ as first sheet
    if (combinedData.length > 0) {
      const combinedWs = XLSX.utils.json_to_sheet(combinedData);
      XLSX.utils.book_append_sheet(workbook, combinedWs, "Combined BOQ");
    }

    // Add sheets for each category
    if (consolidatedPipes.size > 0) {
      const pipesData = mapToExcelData(consolidatedPipes, "Straight Pipes", true, true);
      const ws = XLSX.utils.json_to_sheet(pipesData);
      XLSX.utils.book_append_sheet(workbook, ws, "Straight Pipes");
    }

    if (consolidatedBends.size > 0) {
      const bendsData = mapToExcelData(consolidatedBends, "Bends", true, true);
      const ws = XLSX.utils.json_to_sheet(bendsData);
      XLSX.utils.book_append_sheet(workbook, ws, "Bends");
    }

    if (consolidatedFittings.size > 0) {
      const fittingsData = mapToExcelData(consolidatedFittings, "Fittings", true, true);
      const ws = XLSX.utils.json_to_sheet(fittingsData);
      XLSX.utils.book_append_sheet(workbook, ws, "Fittings");
    }

    if (consolidatedFlanges.size > 0) {
      const flangesData = mapToExcelData(consolidatedFlanges, "Flanges");
      const ws = XLSX.utils.json_to_sheet(flangesData);
      XLSX.utils.book_append_sheet(workbook, ws, "Flanges");
    }

    if (consolidatedBlankFlanges.size > 0) {
      const blankFlangesData = mapToExcelData(
        consolidatedBlankFlanges,
        "Blank Flanges",
        false,
        true,
      );
      const ws = XLSX.utils.json_to_sheet(blankFlangesData);
      XLSX.utils.book_append_sheet(workbook, ws, "Blank Flanges");
    }

    if (consolidatedBnwSets.size > 0) {
      const bnwData = mapToExcelData(consolidatedBnwSets, "BNW Sets");
      const ws = XLSX.utils.json_to_sheet(bnwData);
      XLSX.utils.book_append_sheet(workbook, ws, "BNW Sets");
    }

    if (consolidatedGaskets.size > 0) {
      const gasketsData = mapToExcelData(consolidatedGaskets, "Gaskets");
      const ws = XLSX.utils.json_to_sheet(gasketsData);
      XLSX.utils.book_append_sheet(workbook, ws, "Gaskets");
    }

    // Calculate total quantities for summary
    const totalPipeQty = Array.from(consolidatedPipes.values()).reduce(
      (sum, item) => sum + item.qty,
      0,
    );
    const totalBendQty = Array.from(consolidatedBends.values()).reduce(
      (sum, item) => sum + item.qty,
      0,
    );
    const totalFittingQty = Array.from(consolidatedFittings.values()).reduce(
      (sum, item) => sum + item.qty,
      0,
    );
    const totalFlangeQty = Array.from(consolidatedFlanges.values()).reduce(
      (sum, item) => sum + item.qty,
      0,
    );
    const totalBlankFlangeQty = Array.from(consolidatedBlankFlanges.values()).reduce(
      (sum, item) => sum + item.qty,
      0,
    );
    const totalBnwSetQty = Array.from(consolidatedBnwSets.values()).reduce(
      (sum, item) => sum + item.qty,
      0,
    );
    const totalGasketQty = Array.from(consolidatedGaskets.values()).reduce(
      (sum, item) => sum + item.qty,
      0,
    );

    const rawProjectName = rfqData.projectName;
    const rawCustomerName = rfqData.customerName;

    // Add a summary sheet
    const summaryData = [
      { Category: "Project", Value: rawProjectName || "Untitled" },
      { Category: "Customer", Value: rawCustomerName || "-" },
      { Category: "Total Items", Value: entries.length },
      { Category: "Total Estimated Weight (kg)", Value: totalWeight.toFixed(2) },
      { Category: "", Value: "" },
      { Category: "Section", Value: "Total Qty" },
      { Category: "Straight Pipes", Value: totalPipeQty },
      { Category: "Bends", Value: totalBendQty },
      { Category: "Fittings", Value: totalFittingQty },
      { Category: "Flanges", Value: totalFlangeQty },
      { Category: "Blank Flanges", Value: totalBlankFlangeQty },
      { Category: "BNW Sets", Value: totalBnwSetQty },
      { Category: "Gaskets", Value: totalGasketQty },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWs, "Summary");

    const rawProjectName2 = rfqData.projectName;

    // Generate filename with project name and date
    const projectName = (rawProjectName2 || "BOQ").replace(/[^a-zA-Z0-9]/g, "_");
    const dateStr = nowISO().split("T")[0];
    const filename = `${projectName}_BOQ_${dateStr}.xlsx`;

    // Write and download
    XLSX.writeFile(workbook, filename);
  };

  const rawProjectName3 = rfqData.projectName;
  const rawCustomerName2 = rfqData.customerName;
  const rawGasketType = globalSpecs?.gasketType;

  return {
    consolidatedBends,
    consolidatedBlankFlanges,
    consolidatedBnwSets,
    consolidatedFasteners,
    consolidatedFittings,
    consolidatedFlanges,
    consolidatedGaskets,
    consolidatedHdpeOther,
    consolidatedHdpeStubs,
    consolidatedPipes,
    consolidatedPvcOther,
    consolidatedPvcStubs,
    consolidatedSteelOther,
    consolidatedTanks,
    consolidatedUnidentified,
    consolidatedValves,
    entries,
    exportGroup,
    exportToExcel,
    globalSpecs,
    isUnregisteredCustomer,
    loading,
    masterData,
    maybeRenderTable,
    omittedEntries,
    rawCustomerName2,
    rawGasketType,
    rawProjectName3,
    renderConsolidatedTable,
    requiredProducts,
    restrictionPopup,
    setRestrictionPopup,
    showRestrictionPopup,
    totalWeight,
  };
}
