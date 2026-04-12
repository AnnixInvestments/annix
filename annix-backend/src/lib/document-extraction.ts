const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default ?? pdfParseModule;
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
    const pdfData = await pdfParse(buffer);
    return pdfData.text || "";
  } catch {
    try {
      return extractTextFromExcel(buffer);
    } catch {
      return "";
    }
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
