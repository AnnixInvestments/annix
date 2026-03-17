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
  /^item\s*code\s+item\s*desc/i,
  /^item\s*code\s+description/i,
  /^adhesives?\s*\d*$/i,
];

const NOISE_ONLY_PATTERN = /^[\d\s]+$/;

const PAINT_COATING_NOISE_PATTERN =
  /^[\d\s]+(RTT|C\d{2,3}|RED|BLUE|GREEN|WHITE|BLACK|GREY|GRAY|YELLOW)\b/i;

const BARE_NUMBER_SEQUENCE_PATTERN = /^(\d{2,5}\s+){2,}/;

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
  const hasQty = qty !== null && !Number.isNaN(qty) && qty > 0;
  const hasDescription = description.length > 0;
  const hasItemNo = (li.itemNo || "").trim().length > 0;
  const hasJtNo = (li.jtNo || "").trim().length > 0;
  const hasNoData = !hasDescription && !hasItemNo && !hasJtNo && !hasQty;

  if (hasNoData && itemCode) {
    return false;
  }

  if (!hasDescription && !hasQty && !hasJtNo && itemCode) {
    if (NOISE_ONLY_PATTERN.test(itemCode)) {
      return false;
    }
    if (PAINT_COATING_NOISE_PATTERN.test(itemCode)) {
      return false;
    }
    if (BARE_NUMBER_SEQUENCE_PATTERN.test(itemCode)) {
      return false;
    }
  }

  return true;
}
