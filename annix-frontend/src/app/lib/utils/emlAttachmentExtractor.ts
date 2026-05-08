"use client";

import { nowMillis } from "@/app/lib/datetime";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const XLS_MIME = "application/vnd.ms-excel";
const PDF_MIME = "application/pdf";
const DOC_MIME = "application/msword";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type AttachmentKind = "boq" | "tender" | "image" | "other";

export interface EmailMetadata {
  fromName: string | null;
  fromEmail: string | null;
  fromPhone: string | null;
  toName: string | null;
  toEmail: string | null;
  subject: string | null;
  date: string | null;
  bodyText: string | null;
}

export interface EmailAttachment {
  file: File;
  kind: AttachmentKind;
  contentType: string;
}

export interface EmailParseResult {
  metadata: EmailMetadata;
  attachments: EmailAttachment[];
}

export function isEmlFile(file: File): boolean {
  return /\.eml$/i.test(file.name) || file.type === "message/rfc822";
}

export async function parseEmail(emlFile: File): Promise<EmailParseResult> {
  const text = await emlFile.text();

  const headerEnd = locateHeaderEnd(text);
  const topHeaders = headerEnd > 0 ? text.substring(0, headerEnd) : text;
  const fromAddress = parseAddressHeader(topHeaders, "from");
  const toAddress = parseAddressHeader(topHeaders, "to");
  const subject = parseSimpleHeader(topHeaders, "subject");
  const date = parseSimpleHeader(topHeaders, "date");

  const boundary = findBoundary(topHeaders);
  let bodyText: string | null = null;
  const attachments: EmailAttachment[] = [];

  if (boundary) {
    const parts = splitByBoundary(text, boundary);
    for (const part of parts) {
      const parsed = parseMimePart(part);
      if (!parsed) continue;
      if (parsed.kind === "text") {
        if (!bodyText) bodyText = parsed.text;
      } else {
        attachments.push(parsed.attachment);
      }
    }
  } else if (headerEnd > 0) {
    const bodyStart =
      headerEnd + (text.substring(headerEnd, headerEnd + 4).startsWith("\r\n\r\n") ? 4 : 2);
    bodyText = text.substring(bodyStart);
  }

  const fromName = fromAddress ? fromAddress.name : null;
  const fromEmail = fromAddress ? fromAddress.email : null;
  const toName = toAddress ? toAddress.name : null;
  const toEmail = toAddress ? toAddress.email : null;

  return {
    metadata: {
      fromName,
      fromEmail,
      fromPhone: extractPhoneFromText(bodyText),
      toName,
      toEmail,
      subject,
      date,
      bodyText,
    },
    attachments,
  };
}

interface ParsedAddress {
  name: string | null;
  email: string | null;
}

type ParsedPart =
  | { kind: "text"; text: string }
  | { kind: "attachment"; attachment: EmailAttachment };

function locateHeaderEnd(text: string): number {
  const crlf = text.indexOf("\r\n\r\n");
  if (crlf >= 0) return crlf;
  const lf = text.indexOf("\n\n");
  return lf;
}

function findBoundary(headers: string): string | null {
  const match = headers.match(/boundary\s*=\s*"?([^";\r\n]+)"?/i);
  return match ? match[1] : null;
}

function splitByBoundary(text: string, boundary: string): string[] {
  return text.split(`--${boundary}`);
}

function unfoldHeaders(rawHeaders: string): string {
  return rawHeaders.replace(/\r?\n[ \t]+/g, " ");
}

function parseSimpleHeader(rawHeaders: string, name: string): string | null {
  const unfolded = unfoldHeaders(rawHeaders);
  const re = new RegExp(`^${name}\\s*:\\s*(.+)$`, "im");
  const match = unfolded.match(re);
  if (!match) return null;
  return decodeRfc2047(match[1].trim());
}

function parseAddressHeader(rawHeaders: string, name: string): ParsedAddress | null {
  const value = parseSimpleHeader(rawHeaders, name);
  if (!value) return null;
  const namedMatch = value.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (namedMatch) {
    const rawName = namedMatch[1].trim().replace(/^['"]|['"]$/g, "");
    const email = namedMatch[2].trim();
    return { name: rawName || null, email };
  }
  const emailMatch = value.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  return {
    name: null,
    email: emailMatch ? emailMatch[0] : null,
  };
}

function decodeRfc2047(text: string): string {
  return text.replace(/=\?[^?]+\?[QqBb]\?[^?]+\?=/g, (encoded) => {
    const inner = encoded.match(/=\?([^?]+)\?([QqBb])\?([^?]+)\?=/);
    if (!inner) return encoded;
    const encoding = inner[2].toUpperCase();
    const data = inner[3];
    try {
      if (encoding === "B") return atob(data);
      const replaced = data
        .replace(/_/g, " ")
        .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      return replaced;
    } catch {
      return encoded;
    }
  });
}

function parseMimePart(part: string): ParsedPart | null {
  const headerEnd = locateHeaderEnd(part);
  if (headerEnd <= 0) return null;
  const bodyStart =
    headerEnd + (part.substring(headerEnd, headerEnd + 4).startsWith("\r\n\r\n") ? 4 : 2);
  const headers = part.substring(0, headerEnd);
  const headersLower = headers.toLowerCase();

  const contentTypeMatch = headers.match(/content-type\s*:\s*([^;\r\n]+)/i);
  const contentType = (contentTypeMatch ? contentTypeMatch[1] : "").trim().toLowerCase();
  const transferEncodingMatch = headers.match(/content-transfer-encoding\s*:\s*([^;\r\n]+)/i);
  const transferEncoding = (transferEncodingMatch ? transferEncodingMatch[1] : "")
    .trim()
    .toLowerCase();
  const disposition = headersLower.includes("content-disposition: attachment")
    ? "attachment"
    : "inline";

  const fileName = pickFileName(part);
  const isAttachment =
    disposition === "attachment" || (fileName !== null && transferEncoding === "base64");

  if (!isAttachment && contentType.startsWith("text/")) {
    const body = part.substring(bodyStart);
    return { kind: "text", text: decodeTextPart(body, transferEncoding) };
  }

  if (transferEncoding !== "base64") return null;

  const base64Body = stripBase64Tail(part.substring(bodyStart));
  const bytes = decodeBase64(base64Body);
  if (!bytes) return null;

  const resolvedName = fileName ?? `attachment-${nowMillis()}`;
  const resolvedMime = resolveMimeType(contentType, resolvedName);
  const file = new File([bytes as BlobPart], resolvedName, { type: resolvedMime });
  const kind = classifyAttachment(resolvedMime, resolvedName);

  return {
    kind: "attachment",
    attachment: { file, kind, contentType: resolvedMime },
  };
}

function pickFileName(part: string): string | null {
  const dispositionMatch = part.match(/filename\s*=\s*"?([^"\r\n;]+)"?/i);
  if (dispositionMatch) return dispositionMatch[1].trim();
  const nameMatch = part.match(/name\s*=\s*"?([^"\r\n;]+)"?/i);
  if (nameMatch) return nameMatch[1].trim();
  return null;
}

function resolveMimeType(declared: string, fileName: string): string {
  if (declared && declared !== "application/octet-stream") return declared;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx")) return XLSX_MIME;
  if (lower.endsWith(".xls")) return XLS_MIME;
  if (lower.endsWith(".pdf")) return PDF_MIME;
  if (lower.endsWith(".docx")) return DOCX_MIME;
  if (lower.endsWith(".doc")) return DOC_MIME;
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return declared || "application/octet-stream";
}

function classifyAttachment(mime: string, fileName: string): AttachmentKind {
  const lower = fileName.toLowerCase();
  if (mime.includes("spreadsheet") || mime === XLS_MIME || /\.(xlsx?|csv)$/i.test(lower))
    return "boq";
  if (
    mime === PDF_MIME ||
    mime === DOC_MIME ||
    mime === DOCX_MIME ||
    /\.(pdf|docx?)$/i.test(lower)
  ) {
    return "tender";
  }
  if (mime.startsWith("image/")) return "image";
  return "other";
}

function decodeTextPart(body: string, transferEncoding: string): string {
  if (transferEncoding === "base64") {
    try {
      return atob(body.replace(/\s+/g, ""));
    } catch {
      return body;
    }
  }
  if (transferEncoding === "quoted-printable") {
    return body
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }
  return body;
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

function extractPhoneFromText(body: string | null): string | null {
  if (!body) return null;
  const patterns = [
    /\+27\s*\(?0?\)?\s*\d{2}\s*\d{3}\s*\d{4}/,
    /\b0\d{2}\s*\d{3}\s*\d{4}\b/,
    /\(0\d{2}\)\s*\d{3}[-\s]?\d{4}/,
    /\+\d{1,3}\s*\d{2,3}\s*\d{3,4}\s*\d{3,4}/,
  ];
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) return match[0].replace(/\s+/g, " ").trim();
  }
  return null;
}
