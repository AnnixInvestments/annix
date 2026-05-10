import { isString } from "es-toolkit/compat";
import { formatDateLongZA, fromJSDate } from "@/app/lib/datetime";

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
