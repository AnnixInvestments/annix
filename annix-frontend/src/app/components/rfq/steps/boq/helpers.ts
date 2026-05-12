import { isString, keys } from "es-toolkit/compat";
import { formatDateLongZA, fromJSDate } from "@/app/lib/datetime";
import type {
  ConsolidatedItem,
  FlangeCountByLocation,
  FlangeCountByPhysicalKind,
  MaterialKey,
} from "./types";

export const formatDate = (date: Date | string | undefined): string => {
  if (!date) return "Not specified";
  if (isString(date)) {
    return formatDateLongZA(date);
  }
  return fromJSDate(date).toLocaleString({ year: "numeric", month: "long", day: "numeric" });
};

export const formatWeight = (weight: number | undefined): string => {
  if (!weight || Number.isNaN(weight)) return "0.00 kg";
  return `${weight.toFixed(2)} kg`;
};

// Round a quantity to 2 dp without dragging trailing zeros on whole
// numbers. Summing per-row qty in floating-point produces values like
// 13257.1000000000002 and 13977.599999999999; show them as 13257.1
// and 13977.6 instead.
export const formatQty = (qty: number | undefined): string => {
  if (qty === undefined || qty === null || Number.isNaN(qty)) return "0";
  const rounded = Math.round(qty * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toString();
};

// Append a flange/stub indicator to a piping description when the
// entry has flanged ends. For steel/PVC: " — Flanged FBE/FOE
// (PN16)". For HDPE/PVC: " — Stub Ends FBE/FOE w/ Backing Flanges
// (PN16)" — HDPE doesn't bolt directly to a flange, it gets a
// butt-fused stub end with a separate steel backing flange. The
// separate stub + backing-flange line items are emitted by
// v1.1.35; v1.1.34 surfaces the configuration in the description
// so the customer can verify it before pricing.
export const flangeConfigSuffix = (
  config: string | null | undefined,
  materialType: string,
  flangeSpec: string,
): string => {
  if (!config || config === "PE") return "";
  const endsLabel =
    config === "FBE"
      ? "Both Ends"
      : config === "FOE"
        ? "One End"
        : config === "FBE_BLIND"
          ? "Both Ends (Blind)"
          : config;
  if (materialType === "hdpe" || materialType === "pvc") {
    return ` — Stub ${endsLabel} w/ Backing Flange ${flangeSpec}`;
  }
  return ` — Flanged ${endsLabel} ${flangeSpec}`;
};

export const getFlangeTypeName = (config: string): string => {
  if (!config || config === "PE") return "Slip On";
  if (config.includes("LF") || config.includes("_L")) return "Slip On";
  if (config.includes("RF") || config.includes("_R")) return "Rotating";
  return "Slip On";
};

// Per-section exporters. `safeFilename` strips characters that
// browsers / Windows refuse on download.
export const safeFilename = (title: string): string =>
  title
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "section";

export const triggerDownload = (data: string | Blob, filename: string, mime: string): void => {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Bend centre-to-face (mm). Uses the standard fabricated-bend
// formula C/F = R × tan(θ/2) where R = NB × bend-ratio multiplier
// (e.g. 1.5 for 1.5D). Matches the convention BOQ engineers
// expect on the row description so the supplier can verify
// dimensional fit at quote stage.
export const bendCenterToFaceMm = (nb: number, angleDeg: number, bendType: string): number => {
  const radiusFactor = parseFloat((bendType || "1.5D").replace("D", "")) || 1.5;
  const radius = nb * radiusFactor;
  const halfAngleRad = (angleDeg * Math.PI) / 180 / 2;
  return Math.round(radius * Math.tan(halfAngleRad));
};

// Material derivation — pipe/bend/fitting entries carry materialType
// directly; misc entries store productType in specs. Defaults to
// steel for legacy / undefined entries since pre-Nix flows assumed
// a steel pipeline.
export const materialOfEntry = (entry: any): MaterialKey => {
  const rawSpecs = entry.specs;
  const rawProductType = rawSpecs?.productType;
  const rawMaterialType = entry.materialType;
  const candidate = rawMaterialType || rawProductType;
  if (candidate === "hdpe") return "hdpe";
  if (candidate === "pvc" || candidate === "upvc") return "pvc";
  return "steel";
};

// Filter a consolidated-item map down to a single material. Used by
// the BOQ render branches (HDPE / Steel / PVC sections each pull from
// the global consolidated maps via this filter).
export const filterByMaterial = (
  map: Map<string, ConsolidatedItem>,
  material: MaterialKey,
): Map<string, ConsolidatedItem> => {
  const result = new Map<string, ConsolidatedItem>();
  map.forEach((item, key) => {
    if (item.material === material) result.set(key, item);
  });
  return result;
};

// Source-of-truth context for the optional "Source" column that
// appears in BOQ exports when any item has a source location (a
// pointer back to a row in the originating tender PDF / Excel).
export interface BoqSourceContext {
  hasAnySourceLocations: boolean;
  sourceLookup: Map<string, string>;
}

// Convert a consolidated-item map into a flat array of plain row
// objects — re-used by all four export formats per section (xlsx,
// csv, pdf, word). The `showWeldColumns` / `showAreaColumns` flags
// gate optional columns per section type. `sourceContext` carries
// the optional Source-column data so the helper has zero closure
// capture on the parent component.
export const consolidatedToRows = (
  items: Map<string, ConsolidatedItem>,
  showWeldColumns: boolean,
  showAreaColumns: boolean,
  sourceContext: BoqSourceContext,
): Array<Record<string, string | number>> => {
  const allWeldTypes = new Set<string>();
  if (showWeldColumns) {
    items.forEach((item) => {
      if (item.welds) keys(item.welds).forEach((wt) => allWeldTypes.add(wt));
    });
  }
  const weldTypesList = Array.from(allWeldTypes);
  let rowNum = 1;
  return Array.from(items.values()).map((item) => {
    const row: Record<string, string | number> = {
      "From Items": item.entries.join(", "),
    };
    if (sourceContext.hasAnySourceLocations) {
      const sourceLabelSet = new Set<string>();
      item.entryIds.forEach((id) => {
        const label = sourceContext.sourceLookup.get(id);
        if (label) sourceLabelSet.add(label);
      });
      const sourceLabels = Array.from(sourceLabelSet).join(", ");
      row.Source = sourceLabels || "—";
    }
    row["#"] = rowNum++;
    row.Description = item.description;
    row.Qty = item.qty;
    row.Unit = item.unit;
    if (showWeldColumns) {
      weldTypesList.forEach((wt) => {
        const w = item.welds?.[wt];
        row[`${wt} (m)`] = w !== undefined ? w.toFixed(2) : "";
      });
    }
    if (showAreaColumns) {
      const intAreaM2 = item.intAreaM2;
      const extAreaM2 = item.extAreaM2;
      row["Int m²"] = intAreaM2 !== undefined ? intAreaM2.toFixed(2) : "";
      row["Ext m²"] = extAreaM2 !== undefined ? extAreaM2.toFixed(2) : "";
    }
    row["Weight (kg)"] = item.weight.toFixed(2);
    return row;
  });
};

// Pipe variant inferred from the source description. Used by BOQ
// consolidation so that — for example — perforated and solid 250 mm
// HDPE drain pipes don't merge into a single supplier row just
// because they share NB / SDR / PN / flange. Returns null for plain
// "standard" pipe.
//
// Extended for PVC parity (#288 Phase 4):
//  - "pressure" — generic pressure pipe (still consolidates with
//    plain entries; this is the default and rarely returned)
//  - "drainage" / "sewer" — non-pressure gravity drainage pipe
//    (SANS 791 family). Different OD/wall conventions to pressure
//    pipe; must NOT consolidate with pressure on the same DN.
//  - "electrical" / "conduit" — electrical-conduit grade PVC
//    (SANS 1602 / 1660). Thinner wall, lower pressure — never
//    interchangeable with pressure pipe.
export type PipeVariant = "perforated" | "slotted" | "solid" | "drainage" | "electrical";

export const detectPipeVariant = (description: string | undefined | null): PipeVariant | null => {
  if (!description) return null;
  const text = description.toLowerCase();
  if (/\bperforated\b/.test(text)) return "perforated";
  if (/\bslotted\b/.test(text)) return "slotted";
  if (/\bsewer(?:\s*main)?\b|\bgravity\s*(?:drain|sewer)\b|\bsans\s*791\b/.test(text)) {
    return "drainage";
  }
  if (/\belectrical\s*conduit\b|\bconduit\s*pvc\b|\bsans\s*(?:1602|1660)\b/.test(text)) {
    return "electrical";
  }
  // "Solid" only counts when it qualifies the pipe itself, not when
  // it appears as a generic adjective elsewhere (e.g. "solid weld").
  if (/\bsolid\s+(?:hdpe|pe\s?100|pvc|upvc|mild\s*steel|steel|drain\s*pipe|pipe)\b/.test(text)) {
    return "solid";
  }
  return null;
};

// Title-cased variant prefix for the consolidated row description,
// or an empty string for standard pipe. Always trailing-space when
// non-empty so it slots cleanly in front of the diameter token.
export const pipeVariantPrefix = (variant: PipeVariant | null): string => {
  if (variant === "perforated") return "Perforated ";
  if (variant === "slotted") return "Slotted ";
  if (variant === "solid") return "Solid ";
  if (variant === "drainage") return "Drainage ";
  if (variant === "electrical") return "Conduit ";
  return "";
};

// Physical flange count from end configuration (includes loose flanges).
// Returns counts grouped by physical kind:
//   fixed     — weld-neck flanges
//   loose     — slip-on / lap / backing flanges
//   rotating  — rotating raised-face flanges
export const getPhysicalFlangeCount = (
  config: string,
  itemType: string,
): FlangeCountByPhysicalKind => {
  if (itemType === "bend" || itemType === "straight_pipe" || !itemType) {
    switch (config) {
      case "PE":
        return { fixed: 0, loose: 0, rotating: 0 };
      case "FOE":
        return { fixed: 1, loose: 0, rotating: 0 };
      case "FBE":
        return { fixed: 2, loose: 0, rotating: 0 };
      case "FOE_LF":
        // 1 fixed + 1 loose = 2 physical flanges
        return { fixed: 1, loose: 1, rotating: 0 };
      case "FOE_RF":
        // 1 fixed + 1 rotating = 2 physical flanges
        return { fixed: 1, loose: 0, rotating: 1 };
      case "2X_RF":
        // 2 rotating flanges
        return { fixed: 0, loose: 0, rotating: 2 };
      case "2xLF":
        // 2 stub-on + 2 loose backing flanges = 4 flanges
        return { fixed: 0, loose: 4, rotating: 0 };
      default:
        return { fixed: 0, loose: 0, rotating: 0 };
    }
  }
  if (itemType === "fitting") {
    switch (config) {
      case "PE":
        return { fixed: 0, loose: 0, rotating: 0 };
      case "FAE":
        // Flanged All Ends (3 fixed)
        return { fixed: 3, loose: 0, rotating: 0 };
      case "F2E":
        return { fixed: 2, loose: 0, rotating: 0 };
      case "F2E_LF":
        // 2 fixed + 1 loose
        return { fixed: 2, loose: 1, rotating: 0 };
      case "F2E_RF":
        // 2 fixed + 1 rotating
        return { fixed: 2, loose: 0, rotating: 1 };
      case "3X_RF":
        // 3 rotating flanges
        return { fixed: 0, loose: 0, rotating: 3 };
      case "2X_RF_FOE":
        // 2 rotating + 1 fixed
        return { fixed: 1, loose: 0, rotating: 2 };
      default:
        return { fixed: 0, loose: 0, rotating: 0 };
    }
  }
  return { fixed: 0, loose: 0, rotating: 0 };
};

// Legacy flange-count shape — main-run + branch totals. Used by the
// older flange consolidation pass that doesn't distinguish physical
// kind. Keep until the consolidation pass is migrated.
export const getFlangeCountFromConfig = (
  config: string,
  itemType: string,
): FlangeCountByLocation => {
  const counts = getPhysicalFlangeCount(config, itemType);
  const totalMain = counts.fixed + counts.loose + counts.rotating;
  if (itemType === "fitting") {
    if (config === "FAE" || config === "3X_RF" || config === "2X_RF_FOE") {
      // Main run has 2 flanges, branch has 1
      return { main: 2, branch: 1 };
    }
    if (config === "F2E_LF" || config === "F2E_RF") {
      // 1 main flange + 1 branch flange (loose/rotating)
      return { main: 1, branch: 1 };
    }
    if (config === "F2E") return { main: 2, branch: 0 };
    if (config === "PE") return { main: 0, branch: 0 };
    return { main: totalMain, branch: 0 };
  }
  return { main: totalMain, branch: 0 };
};
