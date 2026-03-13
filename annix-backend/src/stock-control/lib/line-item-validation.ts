import type { LineItemImportRow } from "../services/job-card-import.service";

export const INVALID_LINE_ITEM_PATTERNS = [
  /^production\b/i,
  /^foreman?\s*sign/i,
  /^forman\s*sign/i,
  /^material\s*spec/i,
  /^job\s*comp(letion)?\s*date/i,
  /^completion\s*date/i,
  /^supervisor/i,
  /^quality\s*control/i,
  /^qc\s*sign/i,
  /^inspector/i,
  /^approved\s*by/i,
  /^checked\s*by/i,
  /^date$/i,
  /^signature$/i,
  /^sign$/i,
  /^remarks$/i,
  /^comments$/i,
  /^notes$/i,
];

export function isValidLineItem(li: LineItemImportRow): boolean {
  const itemCode = (li.itemCode || "").trim();
  const description = (li.itemDescription || "").trim();
  const textsToCheck = [itemCode, description].filter(Boolean);

  if (textsToCheck.length === 0) {
    return false;
  }

  const isFormLabel = textsToCheck.some((text) =>
    INVALID_LINE_ITEM_PATTERNS.some((pattern) => pattern.test(text)),
  );
  if (isFormLabel) {
    return false;
  }

  const qty = li.quantity ? parseFloat(li.quantity) : null;
  const hasNoData = !description && !li.itemNo && !li.jtNo && (qty === null || Number.isNaN(qty));
  if (hasNoData && itemCode) {
    const looksLikeLabel = /^[A-Za-z\s]+$/.test(itemCode) && itemCode.length < 30;
    if (looksLikeLabel) {
      return false;
    }
  }

  return true;
}
