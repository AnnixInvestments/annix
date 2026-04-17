export function statusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
  };
  const rawValue = colors[status.toLowerCase()];
  return rawValue || "bg-gray-100 text-gray-800";
}

export const STATUS_TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> =
  {
    draft: [
      { label: "Activate", next: "active", color: "bg-green-600 hover:bg-green-700" },
      { label: "Cancel", next: "cancelled", color: "bg-red-600 hover:bg-red-700" },
    ],
    active: [
      { label: "Complete", next: "completed", color: "bg-blue-600 hover:bg-blue-700" },
      { label: "Cancel", next: "cancelled", color: "bg-red-600 hover:bg-red-700" },
    ],
    completed: [],
    cancelled: [{ label: "Reinstate", next: "draft", color: "bg-amber-600 hover:bg-amber-700" }],
  };

export const INVALID_LINE_ITEM_PATTERNS = [
  /^production$/i,
  /^foreman?\s*sign/i,
  /^forman\s*sign/i,
  /^material\s*spec/i,
  /^job\s*comp\s*date/i,
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

export function isValidLineItem(li: {
  itemCode: string | null;
  itemDescription: string | null;
  itemNo: string | null;
  quantity: number | null;
  jtNo: string | null;
}): boolean {
  const itemCode = (li.itemCode || "").trim();
  const description = (li.itemDescription || "").trim();
  const textToCheck = itemCode || description;

  if (!textToCheck) {
    return false;
  }

  const isFormLabel = INVALID_LINE_ITEM_PATTERNS.some((pattern) => pattern.test(textToCheck));
  if (isFormLabel) {
    return false;
  }

  const qty = li.quantity;
  const hasNoData =
    !li.itemDescription && !li.itemNo && !li.jtNo && (qty === null || Number.isNaN(qty));
  if (hasNoData && itemCode) {
    const looksLikeLabel = /^[A-Za-z\s]+$/.test(itemCode) && itemCode.length < 30;
    const isLongTextNote = itemCode.length > 60;
    const isRubberSpecNote =
      /^r\/l\b/i.test(itemCode) || /rubber\s+(lining|sheet|lagging)/i.test(itemCode);
    if (looksLikeLabel || isLongTextNote || isRubberSpecNote) {
      return false;
    }
  }

  return true;
}

export function extractionStatusBadge(status: string): string {
  const statusColors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-800",
    processing: "bg-blue-100 text-blue-800",
    analysed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };
  const statusColorsStatus = statusColors[status];
  return statusColorsStatus || "bg-gray-100 text-gray-800";
}
