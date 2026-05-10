// Picks a PROJECT_TYPES value from an email's subject + body. Conservative:
// only the explicit tender keywords route to the heavier flows; everything
// else (RFQ, enquiry, quote request, plain spreadsheet, etc.) falls through
// to "standard" so the customer doesn't accidentally land in the Nix tender
// pipeline meant for formal Phase-1 / Re-Tender / Feasibility studies.
export function detectProjectTypeFromEmail(
  subject: string | null,
  bodyText: string | null,
): string {
  const haystack = `${subject ?? ""}\n${bodyText ?? ""}`.toLowerCase();
  if (/\bphase\s*[i1]\b/.test(haystack)) return "phase1";
  if (/\bre[-\s]?tender\b/.test(haystack)) return "retender";
  if (/\bfeasibility\b/.test(haystack)) return "feasibility";
  return "standard";
}

// Detects spreadsheet / Excel uploads — used to gate Nix BOQ extraction
// to xlsx files only (CSVs and PDFs go through different flows).
export const isExcelFile = (file: File): boolean =>
  /\.xlsx?$/i.test(file.name) || file.type.includes("spreadsheet") || file.type.includes("excel");
