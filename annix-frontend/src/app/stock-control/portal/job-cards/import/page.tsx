"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type {
  DeliveryMatchResult,
  ImportMappingConfig,
  JobCardImportMapping,
  JobCardImportResult,
  JobCardImportRow,
  M2Result,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { nowMillis } from "@/app/lib/datetime";
import { stockControlKeys } from "@/app/lib/query/keys";
import { correctLineItemsEndRow, validItemRows } from "../../../lib/lineItemsEndRow";
import { consumePendingImportFile } from "./pending-file";

type ImportStep = "upload" | "mapping" | "preview" | "delivery-matching" | "result";

interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  color: string;
  group: "details" | "lineItems";
}

const FIELD_GROUPS: { key: string; label: string; fields: FieldDef[] }[] = [
  {
    key: "details",
    label: "Job Card Details",
    fields: [
      { key: "jobNumber", label: "Job Number", required: true, color: "teal", group: "details" },
      { key: "jcNumber", label: "JC Number", required: false, color: "slate", group: "details" },
      {
        key: "pageNumber",
        label: "Page Number",
        required: false,
        color: "zinc",
        group: "details",
      },
      { key: "jobName", label: "Job Name", required: true, color: "blue", group: "details" },
      {
        key: "customerName",
        label: "Customer Name",
        required: false,
        color: "purple",
        group: "details",
      },
      {
        key: "description",
        label: "Description",
        required: false,
        color: "amber",
        group: "details",
      },
      { key: "poNumber", label: "PO Number", required: false, color: "rose", group: "details" },
      {
        key: "siteLocation",
        label: "Site / Location",
        required: false,
        color: "cyan",
        group: "details",
      },
      {
        key: "contactPerson",
        label: "Contact Person",
        required: false,
        color: "lime",
        group: "details",
      },
      { key: "dueDate", label: "Due Date", required: false, color: "orange", group: "details" },
      { key: "notes", label: "Notes", required: false, color: "fuchsia", group: "details" },
      { key: "reference", label: "Reference", required: false, color: "sky", group: "details" },
    ],
  },
  {
    key: "lineItems",
    label: "Line Item Columns",
    fields: [
      {
        key: "itemCode",
        label: "Item Code",
        required: false,
        color: "emerald",
        group: "lineItems",
      },
      {
        key: "itemDescription",
        label: "Item Description",
        required: false,
        color: "violet",
        group: "lineItems",
      },
      { key: "itemNo", label: "Item No", required: false, color: "pink", group: "lineItems" },
      { key: "quantity", label: "Quantity", required: false, color: "indigo", group: "lineItems" },
      { key: "jtNo", label: "JT No", required: false, color: "stone", group: "lineItems" },
    ],
  },
];

const ALL_FIELDS: FieldDef[] = FIELD_GROUPS.flatMap((g) => g.fields);

interface CellRegion {
  col: number;
  startRow: number;
  endRow: number;
}

interface CustomFieldDef {
  id: string;
  fieldName: string;
  color: string;
}

const FIELD_COLORS: Record<
  string,
  { bg: string; border: string; text: string; headerBg: string; badge: string }
> = {
  teal: {
    bg: "bg-teal-50",
    border: "border-teal-500",
    text: "text-teal-700",
    headerBg: "bg-teal-100",
    badge: "bg-teal-600",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-500",
    text: "text-blue-700",
    headerBg: "bg-blue-100",
    badge: "bg-blue-600",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-500",
    text: "text-purple-700",
    headerBg: "bg-purple-100",
    badge: "bg-purple-600",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-500",
    text: "text-amber-700",
    headerBg: "bg-amber-100",
    badge: "bg-amber-600",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-500",
    text: "text-rose-700",
    headerBg: "bg-rose-100",
    badge: "bg-rose-600",
  },
  cyan: {
    bg: "bg-cyan-50",
    border: "border-cyan-500",
    text: "text-cyan-700",
    headerBg: "bg-cyan-100",
    badge: "bg-cyan-600",
  },
  lime: {
    bg: "bg-lime-50",
    border: "border-lime-500",
    text: "text-lime-700",
    headerBg: "bg-lime-100",
    badge: "bg-lime-600",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-500",
    text: "text-orange-700",
    headerBg: "bg-orange-100",
    badge: "bg-orange-600",
  },
  fuchsia: {
    bg: "bg-fuchsia-50",
    border: "border-fuchsia-500",
    text: "text-fuchsia-700",
    headerBg: "bg-fuchsia-100",
    badge: "bg-fuchsia-600",
  },
  sky: {
    bg: "bg-sky-50",
    border: "border-sky-500",
    text: "text-sky-700",
    headerBg: "bg-sky-100",
    badge: "bg-sky-600",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-500",
    text: "text-emerald-700",
    headerBg: "bg-emerald-100",
    badge: "bg-emerald-600",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-500",
    text: "text-violet-700",
    headerBg: "bg-violet-100",
    badge: "bg-violet-600",
  },
  pink: {
    bg: "bg-pink-50",
    border: "border-pink-500",
    text: "text-pink-700",
    headerBg: "bg-pink-100",
    badge: "bg-pink-600",
  },
  indigo: {
    bg: "bg-indigo-50",
    border: "border-indigo-500",
    text: "text-indigo-700",
    headerBg: "bg-indigo-100",
    badge: "bg-indigo-600",
  },
  stone: {
    bg: "bg-stone-50",
    border: "border-stone-500",
    text: "text-stone-700",
    headerBg: "bg-stone-100",
    badge: "bg-stone-600",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-500",
    text: "text-red-700",
    headerBg: "bg-red-100",
    badge: "bg-red-600",
  },
  yellow: {
    bg: "bg-yellow-50",
    border: "border-yellow-500",
    text: "text-yellow-700",
    headerBg: "bg-yellow-100",
    badge: "bg-yellow-600",
  },
  slate: {
    bg: "bg-slate-50",
    border: "border-slate-500",
    text: "text-slate-700",
    headerBg: "bg-slate-100",
    badge: "bg-slate-600",
  },
  zinc: {
    bg: "bg-zinc-50",
    border: "border-zinc-500",
    text: "text-zinc-700",
    headerBg: "bg-zinc-100",
    badge: "bg-zinc-600",
  },
};

const CUSTOM_FIELD_COLORS = ["red", "yellow", "cyan", "lime", "fuchsia", "sky", "orange", "violet"];

const LINE_ITEM_KEYS = new Set(["itemCode", "itemDescription", "itemNo", "quantity", "jtNo"]);

const DETAIL_META_KEYS = new Set([
  "poNumber",
  "siteLocation",
  "contactPerson",
  "dueDate",
  "notes",
  "reference",
]);

function extractMappedRows(
  grid: string[][],
  regions: Record<string, CellRegion | null>,
  customFields: CustomFieldDef[],
  customRegions: Record<string, CellRegion | null>,
): JobCardImportRow[] {
  const allRegions = [...Object.values(regions), ...Object.values(customRegions)].filter(
    Boolean,
  ) as CellRegion[];
  if (allRegions.length === 0) return [];

  const minRow = Math.min(...allRegions.map((r) => r.startRow));
  const maxRow = Math.max(...allRegions.map((r) => r.endRow));

  const hasLineItems = Array.from(LINE_ITEM_KEYS).some((k) => regions[k] !== null);

  const liRegion = regions["itemCode"] || regions["itemDescription"];
  const validRows = liRegion ? validItemRows(grid, liRegion.startRow) : new Set<number>();

  if (hasLineItems) {
    type GroupEntry = {
      meta: Record<string, string>;
      notesList: string[];
      lines: Record<string, string>[];
    };

    const { grouped } = Array.from({ length: maxRow - minRow + 1 }, (_, i) => minRow + i).reduce<{
      grouped: Map<string, GroupEntry>;
      lastJobNumber: string;
    }>(
      (acc, r) => {
        const gridRow = grid[r] ?? [];
        const cellVal = (key: string): string => {
          const region = regions[key];
          return region ? (gridRow[region.col] ?? "").trim() : "";
        };
        const metaCellVal = (key: string): string => {
          const region = regions[key];
          if (!region) return "";
          if (r >= region.startRow && r <= region.endRow) {
            return (gridRow[region.col] ?? "").trim();
          }
          return ((grid[region.startRow] ?? [])[region.col] ?? "").trim();
        };

        const jobNumberRegion = regions["jobNumber"];
        const inJobNumberRange =
          jobNumberRegion && r >= jobNumberRegion.startRow && r <= jobNumberRegion.endRow;
        const jobNumber = inJobNumberRange ? cellVal("jobNumber") : "";

        const currentJobNumber = jobNumber || acc.lastJobNumber;

        if (jobNumber && !acc.grouped.has(jobNumber)) {
          const meta = ALL_FIELDS.filter((f) => !LINE_ITEM_KEYS.has(f.key)).reduce<
            Record<string, string>
          >((m, f) => {
            const val = metaCellVal(f.key);
            return val ? { ...m, [f.key]: val } : m;
          }, {});

          const cfValues = customFields.reduce<Record<string, string>>((cv, cf) => {
            const cfRegion = customRegions[cf.id];
            if (cfRegion) {
              const val = (gridRow[cfRegion.col] ?? "").trim();
              return val ? { ...cv, [cf.fieldName]: val } : cv;
            }
            return cv;
          }, {});

          acc.grouped.set(jobNumber, {
            meta: { ...meta, customFieldsJson: JSON.stringify(cfValues) },
            notesList: meta.notes ? [meta.notes] : [],
            lines: [],
          });
        }

        if (!currentJobNumber || !acc.grouped.has(currentJobNumber)) {
          return { ...acc, lastJobNumber: currentJobNumber };
        }

        const inValidSection = validRows.size === 0 || validRows.has(r);
        const lineItem = inValidSection
          ? Array.from(LINE_ITEM_KEYS).reduce<Record<string, string>>((li, key) => {
              const region = regions[key];
              if (region && r >= region.startRow && r <= region.endRow) {
                const val = (gridRow[region.col] ?? "").trim();
                if (val) {
                  return { ...li, [key]: val };
                }
              }
              return li;
            }, {})
          : {};

        if (Object.keys(lineItem).length > 0) {
          acc.grouped.get(currentJobNumber)!.lines.push(lineItem);
        }

        return { ...acc, lastJobNumber: currentJobNumber };
      },
      { grouped: new Map<string, GroupEntry>(), lastJobNumber: "" },
    );

    const SPEC_NOTE_PATTERN =
      /^(EXT\s*:|INT\s*:|R\/L\b|CERAMIC|RUBBER|LINING|LAGGING|SHORE|PAINT|BLAST|COAT|PRIMER|OXIDE|EPOXY|POLYURETHANE|ZINC|SILICATE|NITRILE|NEOPRENE)/i;
    const JUNK_ROW_PATTERN =
      /^(production|foreman?\s*sign|forman\s*sign|material\s*spec|job\s*comp|completion\s*date|supervisor|quality\s*control|qc\s*sign|inspector|approved\s*by|checked\s*by|signature|remarks|comments|date\s+date|notes|sign|date)\b|^Sage\s*\d{3}\s*Evolution|\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}/i;
    if (grouped.size > 0) {
      grouped.forEach((entry) => {
        const cleanedLines: Record<string, string>[] = [];
        const pendingNotes: string[] = [];
        let sectionStartIdx = 0;

        entry.lines.forEach((li) => {
          const code = (li.itemCode || "").trim();
          const desc = (li.itemDescription || "").trim();
          const hasRealData = desc || li.itemNo || li.quantity || li.jtNo;

          if (!hasRealData && code && SPEC_NOTE_PATTERN.test(code)) {
            const cleanedSpec = code.replace(/\s+PRODUCTION\s*$/i, "").trim();
            pendingNotes.push(cleanedSpec);
            return;
          }
          if (JUNK_ROW_PATTERN.test(code)) return;
          if (!hasRealData && !code) return;

          if (pendingNotes.length > 0 && cleanedLines.length > 0) {
            const specText = pendingNotes.join("\n");
            cleanedLines.slice(sectionStartIdx).forEach((_sectionItem, i) => {
              const idx = sectionStartIdx + i;
              cleanedLines[idx] = {
                ...cleanedLines[idx],
                notes: cleanedLines[idx].notes
                  ? `${cleanedLines[idx].notes}\n${specText}`
                  : specText,
              };
            });
            pendingNotes.length = 0;
            sectionStartIdx = cleanedLines.length;
          }

          cleanedLines.push({ ...li });
        });

        if (pendingNotes.length > 0 && cleanedLines.length > 0) {
          const specText = pendingNotes.join("\n");
          cleanedLines.slice(sectionStartIdx).forEach((_sectionItem, i) => {
            const idx = sectionStartIdx + i;
            cleanedLines[idx] = {
              ...cleanedLines[idx],
              notes: cleanedLines[idx].notes ? `${cleanedLines[idx].notes}\n${specText}` : specText,
            };
          });
        }

        const allSpecs = cleanedLines.map((li) => li.notes || "").filter(Boolean);

        entry.lines = cleanedLines;
        if (allSpecs.length > 0) {
          entry.notesList = [...allSpecs, ...entry.notesList];
        }
      });
    }

    return Array.from(grouped.entries()).map(([, { meta, notesList, lines }]) => {
      const cfParsed = meta.customFieldsJson
        ? (JSON.parse(meta.customFieldsJson) as Record<string, string>)
        : undefined;
      const cleanedNotesList = notesList
        .flatMap((n) => n.split("\n"))
        .map((n) => n.replace(/\s+PRODUCTION\s*$/i, "").trim())
        .filter((n) => Boolean(n) && !/^PRODUCTION$/i.test(n));
      const combinedNotes = cleanedNotesList.length > 0 ? cleanedNotesList.join("\n") : undefined;
      return {
        jobNumber: meta.jobNumber,
        jcNumber: meta.jcNumber,
        pageNumber: meta.pageNumber,
        jobName: meta.jobName,
        customerName: meta.customerName,
        description: meta.description,
        poNumber: meta.poNumber,
        siteLocation: meta.siteLocation,
        contactPerson: meta.contactPerson,
        dueDate: meta.dueDate,
        notes: combinedNotes,
        reference: meta.reference,
        customFields: cfParsed && Object.keys(cfParsed).length > 0 ? cfParsed : undefined,
        lineItems: lines.length > 0 ? lines : undefined,
      };
    });
  }

  return Array.from({ length: maxRow - minRow + 1 }, (_, i) => minRow + i).map((r) => {
    const gridRow = grid[r] ?? [];
    const cellVal = (key: string): string | undefined => {
      const region = regions[key];
      return region ? (gridRow[region.col] ?? "").trim() || undefined : undefined;
    };

    const cfValues: Record<string, string> = {};
    customFields.forEach((cf) => {
      const cfRegion = customRegions[cf.id];
      if (cfRegion) {
        const val = (gridRow[cfRegion.col] ?? "").trim();
        if (val) cfValues[cf.fieldName] = val;
      }
    });

    return {
      jobNumber: cellVal("jobNumber"),
      jcNumber: cellVal("jcNumber"),
      pageNumber: cellVal("pageNumber"),
      jobName: cellVal("jobName"),
      customerName: cellVal("customerName"),
      description: cellVal("description"),
      poNumber: cellVal("poNumber"),
      siteLocation: cellVal("siteLocation"),
      contactPerson: cellVal("contactPerson"),
      dueDate: cellVal("dueDate"),
      notes: cellVal("notes"),
      reference: cellVal("reference"),
      customFields: Object.keys(cfValues).length > 0 ? cfValues : undefined,
    };
  });
}

function savedMappingToRegions(
  mapping: JobCardImportMapping,
  grid: string[][],
): {
  regions: Record<string, CellRegion | null>;
  customFields: CustomFieldDef[];
  customRegions: Record<string, CellRegion | null>;
} {
  const config = mapping.mappingConfig;
  if (!config) {
    return { regions: emptyRegions(), customFields: [], customRegions: {} };
  }

  const lastRow = grid.length - 1;

  const liStartRow = config.lineItems?.itemCode?.startRow
    || config.lineItems?.itemDescription?.startRow
    || 0;
  const liEndRow = config.lineItems?.itemCode?.endRow
    || config.lineItems?.itemDescription?.endRow
    || lastRow;
  const correctedLiEndRow = correctLineItemsEndRow(grid, liStartRow, liEndRow);

  const toRegion = (
    fm: { column: number; startRow: number; endRow: number } | null,
  ): CellRegion | null => {
    if (!fm) return null;
    return { col: fm.column, startRow: fm.startRow, endRow: Math.min(fm.endRow, lastRow) };
  };

  const toLineItemRegion = (
    fm: { column: number; startRow: number; endRow: number } | null,
  ): CellRegion | null => {
    if (!fm) return null;
    return { col: fm.column, startRow: fm.startRow, endRow: Math.min(correctedLiEndRow, lastRow) };
  };

  const regions: Record<string, CellRegion | null> = {
    jobNumber: toRegion(config.jobNumber),
    jcNumber: toRegion(config.jcNumber ?? null),
    pageNumber: toRegion(config.pageNumber ?? null),
    jobName: toRegion(config.jobName),
    customerName: toRegion(config.customerName),
    description: toRegion(config.description),
    poNumber: toRegion(config.poNumber),
    siteLocation: toRegion(config.siteLocation),
    contactPerson: toRegion(config.contactPerson),
    dueDate: toRegion(config.dueDate),
    notes: toRegion(config.notes),
    reference: toRegion(config.reference),
    itemCode: toLineItemRegion(config.lineItems ? config.lineItems.itemCode : null),
    itemDescription: toLineItemRegion(config.lineItems ? config.lineItems.itemDescription : null),
    itemNo: toLineItemRegion(config.lineItems ? config.lineItems.itemNo : null),
    quantity: toLineItemRegion(config.lineItems ? config.lineItems.quantity : null),
    jtNo: toLineItemRegion(config.lineItems ? config.lineItems.jtNo : null),
  };

  const customFields: CustomFieldDef[] = (config.customFields ?? []).map((cf, idx) => ({
    id: `custom_${idx}`,
    fieldName: cf.fieldName,
    color: CUSTOM_FIELD_COLORS[idx % CUSTOM_FIELD_COLORS.length],
  }));

  const customRegions: Record<string, CellRegion | null> = {};
  (config.customFields ?? []).forEach((cf, idx) => {
    customRegions[`custom_${idx}`] = toRegion(cf);
  });

  return { regions, customFields, customRegions };
}

function emptyRegions(): Record<string, CellRegion | null> {
  const regions: Record<string, CellRegion | null> = {};
  ALL_FIELDS.forEach((f) => {
    regions[f.key] = null;
  });
  return regions;
}

function regionsToMappingConfig(
  regions: Record<string, CellRegion | null>,
  customFields: CustomFieldDef[],
  customRegions: Record<string, CellRegion | null>,
): ImportMappingConfig {
  const toFieldMapping = (region: CellRegion | null) =>
    region ? { column: region.col, startRow: region.startRow, endRow: region.endRow } : null;

  return {
    jobNumber: toFieldMapping(regions.jobNumber),
    jcNumber: toFieldMapping(regions.jcNumber),
    pageNumber: toFieldMapping(regions.pageNumber),
    jobName: toFieldMapping(regions.jobName),
    customerName: toFieldMapping(regions.customerName),
    description: toFieldMapping(regions.description),
    poNumber: toFieldMapping(regions.poNumber),
    siteLocation: toFieldMapping(regions.siteLocation),
    contactPerson: toFieldMapping(regions.contactPerson),
    dueDate: toFieldMapping(regions.dueDate),
    notes: toFieldMapping(regions.notes),
    reference: toFieldMapping(regions.reference),
    customFields: customFields
      .filter((cf) => customRegions[cf.id])
      .map((cf) => {
        const region = customRegions[cf.id]!;
        return {
          fieldName: cf.fieldName,
          column: region.col,
          startRow: region.startRow,
          endRow: region.endRow,
        };
      }),
    lineItems: {
      itemCode: toFieldMapping(regions.itemCode),
      itemDescription: toFieldMapping(regions.itemDescription),
      itemNo: toFieldMapping(regions.itemNo),
      quantity: toFieldMapping(regions.quantity),
      jtNo: toFieldMapping(regions.jtNo),
    },
  };
}

function fieldForCell(
  row: number,
  col: number,
  regions: Record<string, CellRegion | null>,
  customFields: CustomFieldDef[],
  customRegions: Record<string, CellRegion | null>,
): { key: string; label: string; color: string } | null {
  const found = ALL_FIELDS.find((f) => {
    const region = regions[f.key];
    return region && region.col === col && row >= region.startRow && row <= region.endRow;
  });
  if (found) return found;

  const cfFound = customFields.find((cf) => {
    const region = customRegions[cf.id];
    return region && region.col === col && row >= region.startRow && row <= region.endRow;
  });
  if (cfFound) return { key: cfFound.id, label: cfFound.fieldName, color: cfFound.color };

  return null;
}

export default function JobCardImportPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [grid, setGrid] = useState<string[][]>([]);
  const [regions, setRegions] = useState<Record<string, CellRegion | null>>(emptyRegions);
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  const [customRegions, setCustomRegions] = useState<Record<string, CellRegion | null>>({});
  const [activeField, setActiveField] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ row: number; col: number } | null>(null);
  const [mappedRows, setMappedRows] = useState<JobCardImportRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSavingMapping, setIsSavingMapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobCardImportResult | null>(null);
  const [pendingDeliveryMatches, setPendingDeliveryMatches] = useState<DeliveryMatchResult[]>([]);
  const [deliverySelections, setDeliverySelections] = useState<
    Record<number, Record<number, boolean>>
  >({});
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [customFieldInput, setCustomFieldInput] = useState("");
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [m2Results, setM2Results] = useState<Record<string, M2Result>>({});
  const [isCalculatingM2, setIsCalculatingM2] = useState(false);
  const [manualM2, setManualM2] = useState<Record<string, number>>({});
  const [documentNumber, setDocumentNumber] = useState<string | null>(null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [isDrawingImport, setIsDrawingImport] = useState(false);
  const [drawingFiles, setDrawingFiles] = useState<File[]>([]);
  const [micronPrompts, setMicronPrompts] = useState<
    { rowIdx: number; specNote: string; microns: string }[]
  >([]);
  const [showMicronModal, setShowMicronModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawingInputRef = useRef<HTMLInputElement>(null);
  const hasCheckedPending = useRef(false);

  const handleAutoDetect = async () => {
    if (grid.length === 0) return;
    setIsAutoDetecting(true);
    try {
      const detectedMapping = await stockControlApiClient.autoDetectJobCardMapping(grid);
      const newRegions: Record<string, CellRegion | null> = {};

      const fieldKeys = [
        "jobNumber",
        "jcNumber",
        "pageNumber",
        "jobName",
        "customerName",
        "description",
        "poNumber",
        "siteLocation",
        "contactPerson",
        "dueDate",
        "notes",
        "reference",
      ] as const;

      fieldKeys.forEach((key) => {
        const mapping = detectedMapping[key];
        if (mapping) {
          newRegions[key] = {
            col: mapping.column,
            startRow: mapping.startRow,
            endRow: mapping.endRow,
          };
        } else {
          newRegions[key] = null;
        }
      });

      const lineItemKeys = ["itemCode", "itemDescription", "itemNo", "quantity", "jtNo"] as const;

      lineItemKeys.forEach((key) => {
        const mapping = detectedMapping.lineItems?.[key];
        if (mapping) {
          newRegions[key] = {
            col: mapping.column,
            startRow: mapping.startRow,
            endRow: mapping.endRow,
          };
        } else {
          newRegions[key] = null;
        }
      });

      setRegions(newRegions);
    } catch (err) {
      console.error("Auto-detect failed:", err);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    try {
      setIsUploading(true);
      const response = await stockControlApiClient.uploadJobCardImportFile(selectedFile);
      setGrid(response.grid);
      setDocumentNumber(response.documentNumber);

      if (response.drawingRows && response.drawingRows.length > 0) {
        setIsDrawingImport(true);
        setMappedRows(response.drawingRows);
        setExpandedJobs(new Set(response.drawingRows.map((r) => r.jobNumber ?? "")));
        setStep("preview");
        return;
      }

      if (response.savedMapping?.mappingConfig && response.grid.length > 1) {
        const {
          regions: savedRegions,
          customFields: savedCf,
          customRegions: savedCfRegions,
        } = savedMappingToRegions(response.savedMapping, response.grid);
        const hasRequired = savedRegions.jobNumber !== null && savedRegions.jobName !== null;

        if (hasRequired) {
          setRegions(savedRegions);
          setCustomFields(savedCf);
          setCustomRegions(savedCfRegions);
          const rows = extractMappedRows(response.grid, savedRegions, savedCf, savedCfRegions);
          setMappedRows(rows);
          setStep("preview");
          calculateM2ForRows(rows);
        } else {
          setRegions(savedRegions);
          setCustomFields(savedCf);
          setCustomRegions(savedCfRegions);
          setStep("mapping");
        }
      } else {
        setStep("mapping");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrawingFilesUpload = async (files: File[]) => {
    setError(null);
    setDrawingFiles(files);

    try {
      setIsUploading(true);
      const response = await stockControlApiClient.uploadDrawingFiles(files);
      setDocumentNumber(response.documentNumber);

      if (response.drawingRows && response.drawingRows.length > 0) {
        setIsDrawingImport(true);
        setMappedRows(response.drawingRows);
        setExpandedJobs(new Set(response.drawingRows.map((r) => r.jobNumber ?? "")));
        setStep("preview");
      } else {
        setError(
          "Could not extract job card data from the drawing PDFs. Try uploading tabular job card files instead.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process drawing files");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (hasCheckedPending.current) return;
    hasCheckedPending.current = true;
    const pending = consumePendingImportFile();
    if (pending) {
      handleFileSelect(pending);
    }
  }, []);

  const calculateM2ForRows = useCallback(async (rows: JobCardImportRow[]) => {
    const descriptions = rows.flatMap((r) =>
      r.lineItems
        ? r.lineItems.map((li) => li.itemDescription).filter((d): d is string => Boolean(d))
        : [],
    );
    if (descriptions.length === 0) return;

    setIsCalculatingM2(true);
    try {
      const results = await stockControlApiClient.calculateM2(descriptions);
      const resultsMap: Record<string, M2Result> = {};
      results.forEach((r) => {
        resultsMap[r.description] = r;
      });
      setM2Results(resultsMap);
    } catch {
      setM2Results({});
    } finally {
      setIsCalculatingM2(false);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const dragRegion =
    dragStart && dragEnd
      ? {
          col: dragStart.col,
          startRow: Math.min(dragStart.row, dragEnd.row),
          endRow: Math.max(dragStart.row, dragEnd.row),
        }
      : null;

  const isCellInDrag = useCallback(
    (row: number, col: number): boolean => {
      if (!dragRegion) return false;
      return col === dragRegion.col && row >= dragRegion.startRow && row <= dragRegion.endRow;
    },
    [dragRegion],
  );

  const handleCellMouseDown = (row: number, col: number) => {
    if (!activeField) return;
    setDragStart({ row, col });
    setDragEnd({ row, col });
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!dragStart || !activeField) return;
    setDragEnd({ row, col: dragStart.col });
  };

  const isCustomField = (key: string) => key.startsWith("custom_");

  const handleCellMouseUp = () => {
    if (!dragStart || !dragEnd || !activeField) return;

    const col = dragStart.col;
    const startRow = Math.min(dragStart.row, dragEnd.row);
    const endRow = Math.max(dragStart.row, dragEnd.row);
    const newRegion: CellRegion = { col, startRow, endRow };
    const field = activeField;

    if (isCustomField(field)) {
      setCustomRegions((prev) => ({ ...prev, [field]: newRegion }));
    } else {
      setRegions((prev) => ({ ...prev, [field]: newRegion }));
    }

    const allFieldKeys = [...ALL_FIELDS.map((f) => f.key), ...customFields.map((cf) => cf.id)];
    const currentIndex = allFieldKeys.indexOf(field);
    const allAssigned = { ...regions, ...customRegions, [field]: newRegion };
    const nextUnassigned = allFieldKeys.find((k, i) => i > currentIndex && !allAssigned[k]);
    setActiveField(nextUnassigned ?? null);

    setDragStart(null);
    setDragEnd(null);
  };

  const handleClearField = (fieldKey: string) => {
    if (isCustomField(fieldKey)) {
      setCustomRegions((prev) => ({ ...prev, [fieldKey]: null }));
    } else {
      setRegions((prev) => ({ ...prev, [fieldKey]: null }));
    }
  };

  const handleAddCustomField = () => {
    const name = customFieldInput.trim();
    if (!name) return;
    const id = `custom_${nowMillis()}`;
    const colorIdx = customFields.length % CUSTOM_FIELD_COLORS.length;
    setCustomFields([
      ...customFields,
      { id, fieldName: name, color: CUSTOM_FIELD_COLORS[colorIdx] },
    ]);
    setCustomRegions({ ...customRegions, [id]: null });
    setCustomFieldInput("");
  };

  const handleRemoveCustomField = (cfId: string) => {
    setCustomFields(customFields.filter((cf) => cf.id !== cfId));
    const { [cfId]: _, ...rest } = customRegions;
    setCustomRegions(rest);
    if (activeField === cfId) setActiveField(null);
  };

  const handleSaveMapping = async () => {
    if (!regions.jobNumber || !regions.jobName) {
      setError("Job Number and Job Name regions are required");
      return;
    }

    try {
      setIsSavingMapping(true);
      setError(null);
      const config = regionsToMappingConfig(regions, customFields, customRegions);
      await stockControlApiClient.saveJobCardImportMapping(config);
      const rows = extractMappedRows(grid, regions, customFields, customRegions);
      setMappedRows(rows);
      setStep("preview");
      calculateM2ForRows(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save mapping");
    } finally {
      setIsSavingMapping(false);
    }
  };

  const PAINT_SPEC_PATTERN =
    /paint|coat|primer|oxide|epoxy|polyurethane|zinc|silicate|enamel|lacquer|varnish|FBE|fusion\s*bond/i;
  const MICRON_PATTERN = /\d+\s*(?:um|µm|μm|micron|mic)\b|\bDFT\s*[:=]?\s*\d+|\d+\s*(?:mil)\b/i;

  const detectMissingMicrons = (): { rowIdx: number; specNote: string }[] => {
    const seen = new Set<string>();
    const missing: { rowIdx: number; specNote: string }[] = [];
    mappedRows.forEach((row, rowIdx) => {
      const notes = (row.notes || "").trim();
      const lineNotes = (row.lineItems || []).map((li) => (li.notes || "").trim()).filter(Boolean);
      const allSpecs = [notes, ...lineNotes].filter(Boolean);

      allSpecs.forEach((spec) => {
        if (PAINT_SPEC_PATTERN.test(spec) && !MICRON_PATTERN.test(spec) && !seen.has(spec)) {
          seen.add(spec);
          missing.push({ rowIdx, specNote: spec });
        }
      });
    });
    return missing;
  };

  const handleConfirmWithMicronCheck = () => {
    const missing = detectMissingMicrons();
    if (missing.length > 0) {
      setMicronPrompts(missing.map((m) => ({ ...m, microns: "" })));
      setShowMicronModal(true);
      return;
    }
    handleConfirm();
  };

  const applyMicronsAndConfirm = () => {
    const updates = micronPrompts.filter((p) => p.microns.trim());
    if (updates.length > 0) {
      const specToMicron = new Map(updates.map((u) => [u.specNote, u.microns.trim()]));
      const updatedRows = mappedRows.map((row) => {
        const rowNotes = (row.notes || "").trim();
        const rowMicron = specToMicron.get(rowNotes);
        const updatedNotes = rowMicron ? `${rowNotes} ${rowMicron}um` : row.notes;

        const updatedLineItems = (row.lineItems || []).map((li) => {
          const liNotes = (li.notes || "").trim();
          const liMicron = specToMicron.get(liNotes);
          if (liMicron) {
            return { ...li, notes: `${liNotes} ${liMicron}um` };
          }
          return li;
        });

        return { ...row, notes: updatedNotes, lineItems: updatedLineItems };
      });
      setMappedRows(updatedRows);
    }
    setShowMicronModal(false);
    handleConfirm();
  };

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      setError(null);
      const rowsWithM2 = mappedRows.map((row, rowIdx) => ({
        ...row,
        reference: row.reference || documentNumber || null,
        lineItems: row.lineItems?.map((li, liIdx) => {
          const manualKey = `${rowIdx}-${liIdx}`;
          const manualVal = manualM2[manualKey];
          if (manualVal != null) return { ...li, m2: manualVal };
          const m2r = li.itemDescription ? m2Results[li.itemDescription] : null;
          const autoM2 = m2r ? m2r.externalM2 || m2r.totalM2 : undefined;
          return autoM2 != null ? { ...li, m2: autoM2 } : li;
        }),
      }));
      const importResult = await stockControlApiClient.confirmJobCardImport(rowsWithM2);
      setResult(importResult);
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCards.all });

      if (importResult.deliveryMatches && importResult.deliveryMatches.length > 0) {
        setPendingDeliveryMatches(importResult.deliveryMatches);
        const initialSelections = importResult.deliveryMatches.reduce<
          Record<number, Record<number, boolean>>
        >((acc, dm) => {
          const matchSelections = dm.matches.reduce<Record<number, boolean>>(
            (mAcc, match) => ({
              ...mAcc,
              [match.deliveryItemId]: match.preSelected,
            }),
            {},
          );
          return { ...acc, [dm.jobCardId]: matchSelections };
        }, {});
        setDeliverySelections(initialSelections);
        setStep("delivery-matching");
      } else if (importResult.createdJobCardIds && importResult.createdJobCardIds.length === 1) {
        router.push(`/stock-control/portal/job-cards/${importResult.createdJobCardIds[0]}`);
      } else {
        setStep("result");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import job cards");
    } finally {
      setIsConfirming(false);
    }
  };

  const resetImport = () => {
    setStep("upload");
    setFile(null);
    setGrid([]);
    setRegions(emptyRegions());
    setCustomFields([]);
    setCustomRegions({});
    setActiveField(null);
    setDragStart(null);
    setDragEnd(null);
    setMappedRows([]);
    setResult(null);
    setError(null);
    setCollapsedGroups({});
    setExpandedJobs(new Set());
    setM2Results({});
    setIsCalculatingM2(false);
    setManualM2({});
    setDocumentNumber(null);
    setIsDrawingImport(false);
    setDrawingFiles([]);
  };

  const maxCols = grid.reduce((max, row) => Math.max(max, row.length), 0);
  const allFieldDefs = [
    ...ALL_FIELDS,
    ...customFields.map((cf) => ({
      key: cf.id,
      label: cf.fieldName,
      color: cf.color,
      required: false,
      group: "custom" as const,
    })),
  ];
  const mappedCount = allFieldDefs.filter((f) => {
    if (isCustomField(f.key)) return customRegions[f.key] !== null;
    return regions[f.key] !== null;
  }).length;
  const requiredMapped = regions.jobNumber && regions.jobName;
  const hasLineItemMapped =
    isDrawingImport || Array.from(LINE_ITEM_KEYS).some((k) => regions[k] !== null);
  const hasAnyLineItems = mappedRows.some((r) => r.lineItems && r.lineItems.length > 0);

  const toggleJobExpanded = (jobNumber: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobNumber)) {
        next.delete(jobNumber);
      } else {
        next.add(jobNumber);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {showMicronModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No microns detected</h3>
            <p className="text-sm text-gray-600 mb-4">
              The following paint specifications have no micron thickness specified. Please enter
              the required DFT (dry film thickness) in microns.
            </p>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {micronPrompts.map((prompt, idx) => (
                <div
                  key={`${prompt.rowIdx}-${prompt.specNote}`}
                  className="flex items-center gap-3"
                >
                  <p className="text-sm text-gray-700 flex-1 font-medium">{prompt.specNote}</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={prompt.microns}
                      onChange={(e) => {
                        setMicronPrompts((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, microns: e.target.value } : p)),
                        );
                      }}
                      placeholder="e.g. 300"
                      className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                    />
                    <span className="text-sm text-gray-500">um</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowMicronModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={applyMicronsAndConfirm}
                disabled={micronPrompts.some((p) => !p.microns.trim())}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center space-x-4">
        <Link href="/stock-control/portal/job-cards" className="text-gray-500 hover:text-gray-700">
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
          <h1 className="text-2xl font-bold text-gray-900">Import Job Cards</h1>
          <p className="mt-1 text-sm text-gray-600">
            Upload an Excel, CSV, or PDF file to import job cards
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg
              className="w-5 h-5 text-red-600 mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {step === "upload" && (
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <div className="p-6">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-300 hover:border-teal-400 hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.pdf,.csv,.png,.jpg,.jpeg,.gif,.bmp,.webp,.heic,.tiff"
                onChange={handleInputChange}
                className="hidden"
              />
              {isUploading ? (
                <div>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">
                    {drawingFiles.length > 0
                      ? "Nix is analysing engineering drawings..."
                      : "Parsing file..."}
                  </p>
                </div>
              ) : (
                <>
                  <svg
                    className="mx-auto h-16 w-16 text-gray-400"
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
                  <p className="mt-4 text-lg font-medium text-gray-900">
                    Drop your file here, or click to browse
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Supports Excel (.xlsx, .xls), PDF, and CSV files
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 border-t border-gray-200 pt-6">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Or import from engineering drawings (tanks, chutes, underpans):
              </p>
              <div className="flex items-center gap-3">
                <input
                  ref={drawingInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.bmp,.webp,.heic,.tiff"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleDrawingFilesUpload(Array.from(e.target.files));
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => drawingInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Select Drawing PDFs
                </button>
                <span className="text-xs text-gray-500">
                  Upload multiple GA/detail/lining drawing PDFs — Nix will extract line items with
                  m² values
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "mapping" && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-teal-600 to-teal-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Map Columns</h2>
                <p className="text-sm text-white/80">
                  Select a field, then drag over the cells containing that data
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-white/80">
                {mappedCount} / {allFieldDefs.length} fields mapped
              </div>
              <button onClick={resetImport} className="text-white/80 hover:text-white p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 border-r flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-gray-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium">{file?.name}</span>
                  <span className="text-xs text-gray-400">({grid.length} rows)</span>
                </div>
                {activeField && (
                  <div className="text-sm px-3 py-1 rounded bg-white/20">
                    Drag to select:{" "}
                    <span className="font-medium">
                      {allFieldDefs.find((f) => f.key === activeField)?.label}
                    </span>
                  </div>
                )}
              </div>

              <div
                className="flex-1 overflow-auto select-none"
                onMouseUp={handleCellMouseUp}
                onMouseLeave={() => {
                  if (dragStart) {
                    handleCellMouseUp();
                  }
                }}
              >
                <table className="min-w-full border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-1.5 text-[10px] font-medium text-gray-400 bg-gray-100 border border-gray-200 w-10"></th>
                      {Array.from({ length: maxCols }, (_, i) => {
                        const colLetter = String.fromCharCode(65 + (i % 26));
                        return (
                          <th
                            key={i}
                            className="px-2 py-1.5 text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200 text-center min-w-[80px]"
                          >
                            {colLetter}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {grid.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        <td className="px-2 py-1 text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-200 text-center">
                          {rowIdx + 1}
                        </td>
                        {Array.from({ length: maxCols }, (_, colIdx) => {
                          const value = row[colIdx] ?? "";
                          const assigned = fieldForCell(
                            rowIdx,
                            colIdx,
                            regions,
                            customFields,
                            customRegions,
                          );
                          const inDrag = isCellInDrag(rowIdx, colIdx);
                          const colors = assigned ? FIELD_COLORS[assigned.color] : null;
                          const isClickable = activeField !== null;
                          const activeColors = activeField
                            ? FIELD_COLORS[
                                (() => {
                                  const fd = allFieldDefs.find((f) => f.key === activeField);
                                  return fd ? fd.color : "teal";
                                })()
                              ]
                            : null;

                          return (
                            <td
                              key={colIdx}
                              onMouseDown={() => handleCellMouseDown(rowIdx, colIdx)}
                              onMouseEnter={() => handleCellMouseEnter(rowIdx, colIdx)}
                              className={`px-2 py-1 text-xs border border-gray-200 whitespace-nowrap max-w-[200px] truncate transition-colors ${
                                inDrag && activeColors
                                  ? `${activeColors.bg} ${activeColors.border} ${activeColors.text} border-2`
                                  : colors
                                    ? `${colors.bg} ${colors.text}`
                                    : isClickable
                                      ? "hover:bg-gray-100 cursor-crosshair"
                                      : "text-gray-700"
                              }`}
                              title={value}
                            >
                              {value}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="w-80 flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Map Fields</h3>
                  <button
                    onClick={handleAutoDetect}
                    disabled={isAutoDetecting}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isAutoDetecting ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Detecting...
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                        Auto Detect
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Click Auto Detect or select a field and drag over cells.
                </p>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                {FIELD_GROUPS.map((group) => {
                  const isCollapsed = collapsedGroups[group.key] ?? false;
                  return (
                    <div key={group.key}>
                      <button
                        onClick={() =>
                          setCollapsedGroups({ ...collapsedGroups, [group.key]: !isCollapsed })
                        }
                        className="flex items-center justify-between w-full text-left mb-2"
                      >
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                          {group.label}
                        </span>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? "" : "rotate-180"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      {!isCollapsed && (
                        <div className="space-y-2">
                          {group.fields.map((field) => {
                            const isActive = activeField === field.key;
                            const region = regions[field.key];
                            const isMapped = region !== null;
                            const colors = FIELD_COLORS[field.color];

                            return (
                              <div
                                key={field.key}
                                role="button"
                                onClick={() => setActiveField(isActive ? null : field.key)}
                                className={`w-full text-left p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                  isActive
                                    ? `${colors.border} ${colors.bg} ring-2 ring-current ring-offset-1 ${colors.text}`
                                    : isMapped
                                      ? "border-green-300 bg-green-50"
                                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${colors.badge}`} />
                                    <span className="font-medium text-gray-900">{field.label}</span>
                                    {field.required && (
                                      <span className="text-red-500 text-xs">*</span>
                                    )}
                                  </div>
                                  {isMapped ? (
                                    <div className="flex items-center gap-1">
                                      <svg
                                        className="w-4 h-4 text-green-600"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span
                                        role="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleClearField(field.key);
                                        }}
                                        className="text-gray-400 hover:text-red-500 p-0.5 cursor-pointer"
                                        title="Clear selection"
                                      >
                                        <svg
                                          className="w-3.5 h-3.5"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                          />
                                        </svg>
                                      </span>
                                    </div>
                                  ) : isActive ? (
                                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                                      SELECTING
                                    </span>
                                  ) : null}
                                </div>
                                {isMapped && region && (
                                  <div className="mt-1.5 text-xs text-green-700">
                                    Column {String.fromCharCode(65 + region.col)}, Rows{" "}
                                    {region.startRow + 1}-{region.endRow + 1}
                                  </div>
                                )}
                                {isActive && !isMapped && (
                                  <div className="mt-1.5 text-xs text-gray-500">
                                    Drag over cells in the spreadsheet to select
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Custom Fields
                    </span>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={customFieldInput}
                      onChange={(e) => setCustomFieldInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddCustomField();
                      }}
                      placeholder="Field name..."
                      className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:border-teal-500 focus:ring-teal-500"
                    />
                    <button
                      onClick={handleAddCustomField}
                      disabled={!customFieldInput.trim()}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {customFields.map((cf) => {
                      const isActive = activeField === cf.id;
                      const region = customRegions[cf.id] ?? null;
                      const isMapped = region !== null;
                      const colors = FIELD_COLORS[cf.color];

                      return (
                        <div
                          key={cf.id}
                          role="button"
                          onClick={() => setActiveField(isActive ? null : cf.id)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all cursor-pointer ${
                            isActive
                              ? `${colors.border} ${colors.bg} ring-2 ring-current ring-offset-1 ${colors.text}`
                              : isMapped
                                ? "border-green-300 bg-green-50"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${colors.badge}`} />
                              <span className="font-medium text-gray-900">{cf.fieldName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {isMapped && (
                                <svg
                                  className="w-4 h-4 text-green-600"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              {isMapped && (
                                <span
                                  role="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClearField(cf.id);
                                  }}
                                  className="text-gray-400 hover:text-red-500 p-0.5 cursor-pointer"
                                  title="Clear selection"
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </span>
                              )}
                              <span
                                role="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveCustomField(cf.id);
                                }}
                                className="text-gray-400 hover:text-red-500 p-0.5 cursor-pointer"
                                title="Remove field"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </span>
                              {isActive && !isMapped && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                                  SELECTING
                                </span>
                              )}
                            </div>
                          </div>
                          {isMapped && region && (
                            <div className="mt-1.5 text-xs text-green-700">
                              Column {String.fromCharCode(65 + region.col)}, Rows{" "}
                              {region.startRow + 1}-{region.endRow + 1}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t bg-gray-50">
                <div className="flex gap-2">
                  <button
                    onClick={resetImport}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMapping}
                    disabled={isSavingMapping || !requiredMapped}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSavingMapping ? "Saving..." : "Continue"}
                  </button>
                </div>
                {!requiredMapped && (
                  <p className="mt-2 text-xs text-center text-gray-500">
                    Select regions for Job Number and Job Name to continue
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Import Preview
                  {documentNumber && (
                    <span className="ml-2 text-sm font-normal text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      Doc: {documentNumber}
                    </span>
                  )}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {isDrawingImport
                    ? `Extracted from ${drawingFiles.length > 0 ? `${drawingFiles.length} drawing${drawingFiles.length !== 1 ? "s" : ""}` : file?.name || "drawing"}`
                    : file?.name}{" "}
                  - {mappedRows.length} job card{mappedRows.length !== 1 ? "s" : ""}
                  {hasAnyLineItems ? " (with line items)" : ""}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {!isDrawingImport && (
                  <button
                    onClick={() => setStep("mapping")}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Re-map Columns
                  </button>
                )}
                <button
                  onClick={resetImport}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmWithMicronCheck}
                  disabled={isConfirming || mappedRows.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isConfirming
                    ? "Importing..."
                    : `Confirm Import (${mappedRows.length} job cards)`}
                </button>
              </div>
            </div>
            {mappedRows.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-sm font-medium text-gray-900">No data found</h3>
                <p className="mt-1 text-sm text-gray-500">No rows matched the selected regions.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Row
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Job Number
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        JC Number
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Page
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Job Name
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Customer
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Description
                      </th>
                      {hasLineItemMapped && (
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Line Items
                        </th>
                      )}
                      {Array.from(DETAIL_META_KEYS).some((k) => regions[k]) && (
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Extra
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mappedRows.map((row, index) => {
                      const missingRequired = !row.jobNumber || !row.jobName;
                      const lineCount = row.lineItems ? row.lineItems.length : 0;
                      const isExpanded = expandedJobs.has(row.jobNumber ?? "");
                      const extraFields = [
                        row.poNumber ? `PO: ${row.poNumber}` : null,
                        row.siteLocation ? `Site: ${row.siteLocation}` : null,
                        row.contactPerson ? `Contact: ${row.contactPerson}` : null,
                        row.dueDate ? `Due: ${row.dueDate}` : null,
                        row.notes && !regions["notes"] ? `Notes: ${row.notes}` : null,
                        row.reference ? `Ref: ${row.reference}` : null,
                      ].filter(Boolean);

                      return (
                        <Fragment key={index}>
                          <tr className={missingRequired ? "bg-red-50" : "hover:bg-gray-50"}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {index + 1}
                            </td>
                            <td
                              className={`px-4 py-3 whitespace-nowrap text-sm ${!row.jobNumber ? "text-red-500 font-medium" : "text-gray-900"}`}
                            >
                              {row.jobNumber || "Missing"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {row.jcNumber || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {row.pageNumber || "-"}
                            </td>
                            <td
                              className={`px-4 py-3 whitespace-nowrap text-sm ${!row.jobName ? "text-red-500 font-medium" : "text-gray-900"}`}
                            >
                              {row.jobName || "Missing"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {row.customerName || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                              {row.description || "-"}
                            </td>
                            {hasLineItemMapped && (
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {lineCount > 0 ? (
                                  <button
                                    onClick={() => toggleJobExpanded(row.jobNumber ?? "")}
                                    className="text-teal-600 hover:text-teal-800 font-medium"
                                  >
                                    {lineCount} item{lineCount !== 1 ? "s" : ""}{" "}
                                    {isExpanded ? "[-]" : "[+]"}
                                  </button>
                                ) : (
                                  "-"
                                )}
                              </td>
                            )}
                            {extraFields.length > 0 ? (
                              <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                                {extraFields.join(" | ")}
                              </td>
                            ) : Array.from(DETAIL_META_KEYS).some((k) => regions[k]) ? (
                              <td className="px-4 py-3 text-sm text-gray-500">-</td>
                            ) : null}
                          </tr>
                          {isExpanded && row.lineItems && row.lineItems.length > 0 && (
                            <tr className="bg-gray-50">
                              <td className="p-0"></td>
                              <td
                                colSpan={
                                  6 +
                                  (hasLineItemMapped ? 1 : 0) +
                                  (Array.from(DETAIL_META_KEYS).some((k) => regions[k]) ? 1 : 0)
                                }
                                className="p-0"
                              >
                                <table className="w-full">
                                  <thead>
                                    <tr className="bg-gray-100 border-b border-gray-200">
                                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase w-20">
                                        Code
                                      </th>
                                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">
                                        Description
                                      </th>
                                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase w-32">
                                        Item No
                                      </th>
                                      <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-gray-500 uppercase w-14">
                                        Qty
                                      </th>
                                      <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase w-24">
                                        JT No
                                      </th>
                                      <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-gray-500 uppercase w-20">
                                        m&sup2;
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {row.lineItems.map((li, liIdx) => {
                                      const m2r = li.itemDescription
                                        ? m2Results[li.itemDescription]
                                        : null;
                                      return (
                                        <Fragment key={liIdx}>
                                        <tr className="hover:bg-gray-100/50">
                                          <td className="px-3 py-1.5 text-xs text-gray-600 whitespace-nowrap">
                                            {li.itemCode || "-"}
                                          </td>
                                          <td className="px-3 py-1.5 text-xs text-gray-900 font-medium">
                                            {li.itemDescription || "-"}
                                          </td>
                                          <td className="px-3 py-1.5 text-xs text-gray-600 whitespace-nowrap">
                                            {li.itemNo || "-"}
                                          </td>
                                          <td className="px-3 py-1.5 text-xs text-gray-600 text-right whitespace-nowrap">
                                            {li.quantity || "-"}
                                          </td>
                                          <td className="px-3 py-1.5 text-xs text-gray-600 whitespace-nowrap">
                                            {li.jtNo || "-"}
                                          </td>
                                          <td className="px-3 py-1.5 text-xs text-right whitespace-nowrap">
                                            {isCalculatingM2 ? (
                                              <span className="inline-block w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                              (() => {
                                                const manualKey = `${index}-${liIdx}`;
                                                const manualVal = manualM2[manualKey];
                                                const autoVal = m2r
                                                  ? m2r.externalM2 || m2r.totalM2
                                                  : undefined;
                                                const displayVal = manualVal ?? autoVal;
                                                return displayVal != null ? (
                                                  <span
                                                    className={`font-medium cursor-pointer ${manualVal != null ? "text-blue-700" : "text-teal-700"}`}
                                                    title={
                                                      manualVal != null
                                                        ? "Manual override — click to edit"
                                                        : "Auto-calculated — click to override"
                                                    }
                                                    onClick={() => {
                                                      const input = prompt(
                                                        "Enter m² value:",
                                                        displayVal.toFixed(2),
                                                      );
                                                      if (input !== null) {
                                                        const parsed = parseFloat(input);
                                                        if (!Number.isNaN(parsed) && parsed >= 0) {
                                                          setManualM2((prev) => ({
                                                            ...prev,
                                                            [manualKey]: parsed,
                                                          }));
                                                        }
                                                      }
                                                    }}
                                                  >
                                                    {displayVal.toFixed(2)}
                                                  </span>
                                                ) : (
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="m²"
                                                    className="w-16 px-1 py-0.5 text-xs text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-400"
                                                    onBlur={(e) => {
                                                      const parsed = parseFloat(e.target.value);
                                                      if (!Number.isNaN(parsed) && parsed >= 0) {
                                                        setManualM2((prev) => ({
                                                          ...prev,
                                                          [manualKey]: parsed,
                                                        }));
                                                      }
                                                    }}
                                                    onKeyDown={(e) => {
                                                      if (e.key === "Enter") {
                                                        (e.target as HTMLInputElement).blur();
                                                      }
                                                    }}
                                                  />
                                                );
                                              })()
                                            )}
                                          </td>
                                        </tr>
                                        {li.notes && (
                                          <tr className="bg-teal-50/50">
                                            <td colSpan={6} className="px-3 py-1 pl-8">
                                              <span className="text-[10px] italic text-teal-700 whitespace-pre-wrap">
                                                {li.notes}
                                              </span>
                                            </td>
                                          </tr>
                                        )}
                                        </Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                          {regions["notes"] && row.notes && (
                            <tr className="bg-fuchsia-50">
                              <td className="px-4 py-2 text-xs text-gray-400"></td>
                              <td
                                colSpan={
                                  6 +
                                  (hasLineItemMapped ? 1 : 0) +
                                  (Array.from(DETAIL_META_KEYS).some((k) => regions[k]) ? 1 : 0)
                                }
                                className="px-4 py-2"
                              >
                                <div className="text-xs">
                                  <span className="font-semibold text-fuchsia-700">Notes: </span>
                                  <span className="text-gray-700 whitespace-pre-wrap">
                                    {row.notes}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {step === "delivery-matching" && pendingDeliveryMatches.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Confirm Delivery Matches
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                The following delivery items were fuzzy-matched to CPO line items. Review and adjust
                the selections, then confirm.
              </p>
            </div>
            <div className="p-6 space-y-6">
              {pendingDeliveryMatches.map((dm) => (
                <div key={dm.jobCardId} className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Delivery: {dm.jtDnNumber}</h4>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Match
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Delivery Item
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          CPO Item
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Similarity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dm.matches.map((match) => {
                        const isSelected =
                          deliverySelections[dm.jobCardId]?.[match.deliveryItemId] || false;
                        return (
                          <tr
                            key={match.deliveryItemId}
                            className={isSelected ? "bg-green-50" : ""}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setDeliverySelections((prev) => ({
                                    ...prev,
                                    [dm.jobCardId]: {
                                      ...prev[dm.jobCardId],
                                      [match.deliveryItemId]: !isSelected,
                                    },
                                  }));
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <div className="font-medium text-gray-900">
                                {match.deliveryItemCode || "-"}
                              </div>
                              <div className="text-gray-500">
                                {match.deliveryItemDescription || "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <div className="font-medium text-gray-900">
                                {match.cpoItemCode || "-"}
                              </div>
                              <div className="text-gray-500">{match.cpoItemDescription || "-"}</div>
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                  match.similarity >= 0.6
                                    ? "bg-green-100 text-green-800"
                                    : match.similarity >= 0.3
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {Math.round(match.similarity * 100)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}

              {error && (
                <div className="bg-red-50 text-red-700 text-sm rounded-md p-3">{error}</div>
              )}

              <div className="flex items-center space-x-3">
                <button
                  onClick={async () => {
                    try {
                      setIsConfirmingDelivery(true);
                      setError(null);

                      await Promise.all(
                        pendingDeliveryMatches.map((dm) => {
                          const selections = deliverySelections[dm.jobCardId] || {};
                          const confirmed = dm.matches
                            .filter((m) => selections[m.deliveryItemId])
                            .map((m) => ({
                              deliveryItemId: m.deliveryItemId,
                              cpoItemId: m.cpoItemId,
                            }));

                          if (confirmed.length === 0) return Promise.resolve();

                          return stockControlApiClient.confirmDeliveryMatches(
                            dm.jobCardId,
                            confirmed,
                          );
                        }),
                      );

                      setStep("result");
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Failed to confirm delivery matches",
                      );
                    } finally {
                      setIsConfirmingDelivery(false);
                    }
                  }}
                  disabled={isConfirmingDelivery}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:opacity-50"
                >
                  {isConfirmingDelivery ? "Confirming..." : "Confirm Matches"}
                </button>
                <button
                  onClick={() => setStep("result")}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Import Results</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{result.created}</div>
                  <div className="text-sm text-green-600">Created</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{result.updated}</div>
                  <div className="text-sm text-blue-600">Updated</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-700">{result.skipped}</div>
                  <div className="text-sm text-yellow-600">Skipped</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">{result.errors.length}</div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Errors</h4>
                  <div className="bg-red-50 rounded-lg p-4 space-y-2">
                    {result.errors.map((err, index) => (
                      <div key={index} className="text-sm text-red-700">
                        <span className="font-medium">Row {err.row}:</span> {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center space-x-3">
                <button
                  onClick={resetImport}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Import Another File
                </button>
                <Link
                  href="/stock-control/portal/job-cards"
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700"
                >
                  View Job Cards
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
