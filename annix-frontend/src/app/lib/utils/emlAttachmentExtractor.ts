"use client";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function isEmlFile(file: File): boolean {
  return /\.eml$/i.test(file.name) || file.type === "message/rfc822";
}

export async function extractXlsxFromEml(emlFile: File): Promise<File | null> {
  const text = await emlFile.text();
  const boundary = findBoundary(text);
  if (!boundary) return null;

  const parts = splitByBoundary(text, boundary);
  for (const part of parts) {
    const xlsxFile = tryExtractXlsxPart(part);
    if (xlsxFile) return xlsxFile;
  }
  return null;
}

function findBoundary(text: string): string | null {
  const headerEnd = locateHeaderEnd(text);
  const headers = headerEnd > 0 ? text.substring(0, headerEnd) : text.substring(0, 4096);
  const match = headers.match(/boundary\s*=\s*"?([^";\r\n]+)"?/i);
  return match ? match[1] : null;
}

function locateHeaderEnd(text: string): number {
  const crlf = text.indexOf("\r\n\r\n");
  if (crlf >= 0) return crlf;
  const lf = text.indexOf("\n\n");
  return lf;
}

function splitByBoundary(text: string, boundary: string): string[] {
  const delimiter = `--${boundary}`;
  return text.split(delimiter);
}

function tryExtractXlsxPart(part: string): File | null {
  const headerEnd = locateHeaderEnd(part);
  if (headerEnd <= 0) return null;
  const bodyStart =
    headerEnd + (part.substring(headerEnd, headerEnd + 4).startsWith("\r\n\r\n") ? 4 : 2);

  const headers = part.substring(0, headerEnd).toLowerCase();
  const isBase64 = /content-transfer-encoding\s*:\s*base64/i.test(headers);
  if (!isBase64) return null;

  const looksLikeSpreadsheet =
    headers.includes("spreadsheetml") || /name\s*=\s*"?[^"\r\n]+\.xlsx/i.test(part);
  if (!looksLikeSpreadsheet) return null;

  const fileName = pickFileName(part);
  const base64Body = stripBase64Tail(part.substring(bodyStart));
  const bytes = decodeBase64(base64Body);
  if (!bytes) return null;

  return new File([bytes as BlobPart], fileName, { type: XLSX_MIME });
}

function pickFileName(part: string): string {
  const dispositionMatch = part.match(/filename\s*=\s*"?([^"\r\n;]+)"?/i);
  if (dispositionMatch) return dispositionMatch[1];
  const nameMatch = part.match(/name\s*=\s*"?([^"\r\n;]+\.xlsx?)/i);
  if (nameMatch) return nameMatch[1];
  return "extracted.xlsx";
}

function stripBase64Tail(body: string): string {
  const trimmed = body.replace(/\r/g, "").trim();
  const withoutClosing = trimmed.replace(/--$/, "").trim();
  return withoutClosing.replace(/\s+/g, "");
}

function decodeBase64(base64: string): Uint8Array | null {
  try {
    const binary = atob(base64);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}
