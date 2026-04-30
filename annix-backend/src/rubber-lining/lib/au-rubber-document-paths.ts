import { StorageArea } from "../../storage/storage.interface";

export enum AuRubberDocumentType {
  DELIVERY_NOTE = "delivery-notes",
  TAX_INVOICE = "tax-invoices",
  COC = "cocs",
  PURCHASE_ORDER = "purchase-orders",
}

export type AuRubberPartyType = "customers" | "suppliers";

const DOC_NUMBER_SAFE = /[^a-zA-Z0-9._-]/g;

export function sanitizeAuRubberDocNumber(docNumber: string | null | undefined): string {
  if (!docNumber) return "unknown";
  const cleaned = docNumber.trim().replace(DOC_NUMBER_SAFE, "_");
  return cleaned.length > 0 ? cleaned : "unknown";
}

export function auRubberDocumentPath(
  party: AuRubberPartyType,
  docType: AuRubberDocumentType,
  docNumber: string,
  filename: string,
): string {
  const safeNumber = sanitizeAuRubberDocNumber(docNumber);
  return `${StorageArea.AU_RUBBER}/${party}/${docType}/${safeNumber}/${filename}`;
}

export function auRubberInboxPath(uuid: string, ext: string): string {
  const dotted = ext.startsWith(".") ? ext : `.${ext}`;
  return `${StorageArea.AU_RUBBER}/inbox/${uuid}${dotted}`;
}

export function isAuRubberInboxPath(path: string): boolean {
  return path.startsWith(`${StorageArea.AU_RUBBER}/inbox/`);
}

export function fileExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.substring(idx) : "";
}
