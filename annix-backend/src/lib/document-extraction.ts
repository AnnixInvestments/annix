const pdfParseModule = require("pdf-parse");
const PDFParseCtor =
  pdfParseModule.PDFParse ??
  pdfParseModule.default?.PDFParse ??
  pdfParseModule.default ??
  pdfParseModule;
const XLSX = require("xlsx");
const mammoth = require("mammoth");

const EXCEL_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/x-excel",
];

const WORD_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function isExcelFile(filename: string | undefined, contentType: string): boolean {
  const filenameLower = filename?.toLowerCase() || "";
  return (
    EXCEL_MIME_TYPES.includes(contentType) ||
    filenameLower.endsWith(".xlsx") ||
    filenameLower.endsWith(".xls")
  );
}

export function isWordFile(filename: string | undefined, contentType: string): boolean {
  const filenameLower = filename?.toLowerCase() || "";
  return (
    WORD_MIME_TYPES.includes(contentType) ||
    filenameLower.endsWith(".doc") ||
    filenameLower.endsWith(".docx")
  );
}

export function extractTextFromExcel(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheets = workbook.SheetNames.map((name: string) => {
    const sheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: "\t", blankrows: false });
    return `--- SHEET: ${name} ---\n${csv}`;
  });
  return sheets.join("\n\n");
}

export async function extractTextFromWord(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse v2 exports a PDFParse class with `.getText()`; v1 (currently
    // installed, 1.1.1) is a callable function returning `{ text }`. Invoking
    // the v1 function as `new PDFParseCtor(...).getText()` throws on EVERY PDF —
    // which previously fell through to extractTextFromExcel(), returning the raw
    // PDF bytes as fake CSV "text". That silently broke all PDF text extraction
    // (the length check then saw garbage, never routed to OCR, and the LLM was
    // fed nonsense). Use whichever API the installed version actually exposes.
    if (typeof PDFParseCtor?.prototype?.getText === "function") {
      const parser = new PDFParseCtor({ data: buffer });
      const result = await parser.getText();
      return result?.text || "";
    }
    const result = await pdfParseModule(buffer);
    return result?.text || "";
  } catch {
    // A PDF that cannot be parsed has no recoverable text layer — return "" so
    // callers route to OCR/vision. Never fall back to the spreadsheet parser:
    // it emits the raw PDF bytes as garbage and defeats the OCR length check.
    return "";
  }
}

export async function extractTextByMime(
  buffer: Buffer,
  filename: string | undefined,
  contentType: string,
): Promise<string> {
  if (isExcelFile(filename, contentType)) {
    return extractTextFromExcel(buffer);
  } else if (isWordFile(filename, contentType)) {
    return extractTextFromWord(buffer);
  }
  return extractTextFromPdf(buffer);
}
