"use client";

import { nowMillis } from "@/app/lib/datetime";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const XLS_MIME = "application/vnd.ms-excel";
const PDF_MIME = "application/pdf";
const DOC_MIME = "application/msword";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type AttachmentKind = "boq" | "drawing" | "tender" | "quality" | "image" | "other";

// Classification used by the unified dropzone (and re-used by the .eml
// parser internally). Returns the category the dropped file should be
// routed into. "eml" triggers the email parser; "boq"/"drawing" trigger
// Nix BOM extraction; "tender" routes into the spec list (spec metadata
// only); "quality" (ITP/QCP/data book) is preserved and flagged but not
// BOM/spec-extracted — it belongs to the (future) quality module.
//
// Precedence for a PDF/Word file: quality signals → explicit drawing signals
// → explicit tender signals → DEFAULT "drawing". The default is "drawing"
// (not "tender") because customer RFQ emails to a fabricator are
// overwhelmingly drawings carrying a BOM, and BOM extraction also lifts spec
// metadata — so an unlabelled spec still pre-fills global specs, while an
// unlabelled drawing (e.g. "…PS4001InternalPipingMids.pdf", no drawing-number
// in the name) still gets its BOM extracted instead of being silently
// treated as a non-itemised tender pack.
export type DroppedFileKind = "eml" | "boq" | "drawing" | "tender" | "quality" | "image" | "other";

// Quality documents (Inspection & Test Plans, Quality Control Plans, data
// books / data packs). Checked FIRST — an ITP for a "Distributor" must not be
// mistaken for the distributor drawing.
const QUALITY_FILENAME_PATTERNS = [
  /\bITP\b/i,
  /\binspection\s*(?:&|and|\+)?\s*test\s*plan\b/i,
  /\bQCP\b/i,
  /\bquality\s*(?:control\s*plan|plan|dossier|record|pack)\b/i,
  /\bdata\s*(?:book|pack)\b/i,
  /\bMDR\b/,
  /\btest\s*plan\b/i,
];

const DRAWING_FILENAME_PATTERNS = [
  /\bdrawing(s)?\b/i,
  /\bdwg\b/i,
  /\bdxf\b/i,
  /\bgeneral[-_ ]?arrangement\b/i,
  /\bGA\b/,
  /\bisometric\b/i,
  /\bplan(s)?\b/i,
  /\bsection(s)?\b/i,
  /\bdetail(s)?\b/i,
  /\bsketch(es)?\b/i,
  /-rev[-_ ]?[A-Z0-9]{1,3}\b/i,
  // Parenthesised revision marker — a strong drawing-title-block signal,
  // e.g. "CD1-6149_UNDERFLOW_TANK_(Rev 0 - Production)".
  /\(\s*rev[\s._-]*[0-9A-Za-z]/i,
  /\b[A-Z]\d{2,4}-\d{2,5}-\d{2,5}\b/,
  // Drawing / item number, e.g. "CD1-6149", "CD2-4656", "PS4001-12".
  /\b[A-Z]{1,4}\d{1,4}[-_]\d{3,6}\b/,
];

const TENDER_FILENAME_PATTERNS = [
  /\btender\b/i,
  /\bspec(ification)?s?\b/i,
  /\bRFQ\b/i,
  /\benquiry\b/i,
  /\binquiry\b/i,
  /\bscope\b/i,
  /\brequirement(s)?\b/i,
  /\bconditions?\b/i,
  /\bRFP\b/i,
  /\bSOW\b/i,
  /\bdatasheet\b/i,
];

export function classifyDroppedFile(file: File): DroppedFileKind {
  const rawType = file.type;
  const name = file.name.toLowerCase();
  const mime = rawType || "";

  if (isEmlFile(file)) return "eml";

  if (
    mime.includes("spreadsheet") ||
    mime === XLS_MIME ||
    mime === "text/csv" ||
    /\.(xlsx?|csv)$/i.test(name)
  ) {
    return "boq";
  }

  if (mime.startsWith("image/")) return "image";

  if (/\.(dwg|dxf)$/i.test(name)) return "drawing";

  const isPdfOrDoc =
    mime === PDF_MIME || mime === DOC_MIME || mime === DOCX_MIME || /\.(pdf|docx?)$/i.test(name);

  if (isPdfOrDoc) {
    const baseName = file.name;
    if (QUALITY_FILENAME_PATTERNS.some((p) => p.test(baseName))) return "quality";
    if (DRAWING_FILENAME_PATTERNS.some((p) => p.test(baseName))) return "drawing";
    if (TENDER_FILENAME_PATTERNS.some((p) => p.test(baseName))) return "tender";
    return "drawing";
  }

  return "other";
}

export interface EmailMetadata {
  fromName: string | null;
  fromEmail: string | null;
  fromPhone: string | null;
  toName: string | null;
  toEmail: string | null;
  ccList: string[];
  bccList: string[];
  signatureEmails: string[];
  signaturePhones: string[];
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

  const fromHeaderName = fromAddress ? fromAddress.name : null;
  const fromEmail = fromAddress ? fromAddress.email : null;
  const toName = toAddress ? toAddress.name : null;
  const toEmail = toAddress ? toAddress.email : null;
  // Fall back to the body sign-off ("Regards, Udvir Ragubeer") when the
  // From header is bare. Common for gmail/outlook/yahoo accounts where
  // the sender is just "udvirr@gmail.com" with no display name.
  const fromName = fromHeaderName || extractSignatureName(bodyText, fromEmail);

  const ccList = parseAddressListHeader(topHeaders, "cc");
  const bccList = parseAddressListHeader(topHeaders, "bcc");
  const allBodyEmails = extractEmailsFromText(bodyText);
  const allBodyPhones = extractPhonesFromText(bodyText);

  // Strip the from/to/cc/bcc addresses out of the body-derived emails so
  // we only surface NEW addresses found in the signature.
  const knownEmails = new Set(
    [fromEmail, toEmail, ...ccList, ...bccList].filter((e): e is string => !!e),
  );
  const signatureEmails = allBodyEmails.filter((email) => !knownEmails.has(email));

  return {
    metadata: {
      fromName,
      fromEmail,
      fromPhone: allBodyPhones.length > 0 ? allBodyPhones[0] : null,
      toName,
      toEmail,
      ccList,
      bccList,
      signatureEmails,
      signaturePhones: allBodyPhones,
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
  // Operate on the UNFOLDED header section. RFC 2822 lets a long
  // Content-Disposition / Content-Type wrap a quoted filename across lines
  // ("…ITP CYCLONE\n DISTRIBUTOR_Coating_B1_.pdf"); matching the raw part
  // with a [^"\r\n] class truncates the name at the fold and drops the
  // extension, so the backend rejects the file as an unknown type.
  const headerEnd = locateHeaderEnd(part);
  const headerSection = headerEnd > 0 ? part.substring(0, headerEnd) : part;
  const headers = unfoldHeaders(headerSection);

  // RFC 2231 parameter continuation: filename*0=, filename*1=, … (the *0
  // segment may carry a charset'lang' prefix + percent-encoding). Each
  // segment sits on its own folded line, so match the RAW header section
  // (where the newlines still delimit segments) rather than the unfolded
  // text (which would merge them into one greedy match), then concatenate
  // in index order.
  const continuation = [
    ...headerSection.matchAll(
      /\b(?:file)?name\*(\d+)(\*?)\s*=\s*"?([^";\r\n]*?)"?\s*(?:;|\r?\n|$)/gi,
    ),
  ];
  if (continuation.length > 0) {
    const ordered = continuation
      .sort((a, b) => Number(a[1]) - Number(b[1]))
      .map((m) => (m[2] === "*" ? decodeRfc2231ExtValue(m[3]) : m[3]))
      .join("")
      .trim();
    if (ordered) return decodeRfc2047(ordered);
  }

  const dispositionMatch = headers.match(/\bfilename\s*=\s*"?([^";\r\n]+?)"?\s*(?:;|$)/i);
  if (dispositionMatch) return decodeRfc2047(dispositionMatch[1].trim());
  const nameMatch = headers.match(/\bname\s*=\s*"?([^";\r\n]+?)"?\s*(?:;|$)/i);
  if (nameMatch) return decodeRfc2047(nameMatch[1].trim());
  return null;
}

function decodeRfc2231ExtValue(value: string): string {
  // filename*0*=UTF-8''%E2%80%A6 — strip the optional charset'lang' prefix
  // (only present on the first segment) and percent-decode the rest.
  const withoutCharset = value.replace(/^[\w-]*'[\w-]*'/, "");
  try {
    return decodeURIComponent(withoutCharset);
  } catch {
    return withoutCharset;
  }
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
    // Same precedence as classifyDroppedFile: quality (ITP/QCP/data book)
    // first, then explicit drawing signals, otherwise treat as a tender
    // spec. Previously every PDF/Word attachment was classified "tender",
    // so drawings arriving inside a .eml never reached BOM extraction.
    if (QUALITY_FILENAME_PATTERNS.some((p) => p.test(fileName))) return "quality";
    if (DRAWING_FILENAME_PATTERNS.some((p) => p.test(fileName))) return "drawing";
    if (TENDER_FILENAME_PATTERNS.some((p) => p.test(fileName))) return "tender";
    return "drawing";
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

function extractPhonesFromText(body: string | null): string[] {
  if (!body) return [];
  const combined =
    /(\+27\s*\(?0?\)?\s*\d{2}\s*\d{3}\s*\d{4}|\(0\d{2}\)\s*\d{3}[-\s]?\d{4}|\b0\d{2}\s*\d{3}\s*\d{4}\b|\+\d{1,3}\s*\d{2,3}\s*\d{3,4}\s*\d{3,4})/g;
  const matches = body.match(combined);
  if (!matches) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of matches) {
    const normalised = raw.replace(/\s+/g, " ").trim();
    const dedupKey = normalised.replace(/\D/g, "");
    if (dedupKey.length >= 9 && !seen.has(dedupKey)) {
      seen.add(dedupKey);
      out.push(normalised);
    }
  }
  return out;
}

/**
 * Best-effort signature-name parse from the plain-text body. Looks for a
 * standard email sign-off ("Regards", "Best regards", "Kind regards",
 * "Thanks", "Sincerely", "Cheers", "Yours truly") followed by 1–2 lines
 * containing what looks like a person's name (2–4 capitalised words).
 *
 * Falls back to the email's local part ("udvirr@gmail.com" → "Udvirr") if
 * no sign-off pattern matches but a fromEmail is provided.
 *
 * Returns null when nothing plausible found.
 */
function extractSignatureName(body: string | null, fromEmail: string | null): string | null {
  if (body) {
    const signOffPattern =
      /\b(?:Regards|Best regards|Best wishes|Kind regards|Warm regards|Many thanks|Thanks(?:\s+(?:in\s+advance|again))?|Sincerely|Yours sincerely|Yours faithfully|Yours truly|Cheers)[,.]?\s*\r?\n+\s*([A-Z][\w'-]+(?:\s+[A-Z][\w'-]+){0,3})/i;
    const match = body.match(signOffPattern);
    if (match) {
      const candidate = match[1].trim();
      // Exclude obvious non-names (single short words, all-caps tokens
      // longer than 8 chars likely a company acronym, etc.)
      if (candidate.length >= 2 && candidate.split(/\s+/).every((part) => part.length >= 2)) {
        return candidate;
      }
    }
  }
  if (fromEmail) {
    const localPart = fromEmail.split("@")[0];
    if (localPart && /^[a-z][a-z0-9._-]*$/i.test(localPart)) {
      const cleaned = localPart
        .replace(/[._-]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
      if (cleaned.length >= 2) return cleaned;
    }
  }
  return null;
}

function extractEmailsFromText(body: string | null): string[] {
  if (!body) return [];
  const matches = body.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g);
  if (!matches) return [];
  const seen = new Set<string>();
  return matches.filter((email) => {
    const lower = email.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

function parseAddressListHeader(rawHeaders: string, name: string): string[] {
  const value = parseSimpleHeader(rawHeaders, name);
  if (!value) return [];
  // Split on commas that aren't inside angle brackets or quotes. A simple
  // split is good enough for nearly all real-world headers; the email
  // addresses themselves are then extracted via regex.
  const segments = value.split(/,(?![^<>]*>)/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const segment of segments) {
    const match = segment.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
    if (!match) continue;
    const email = match[0];
    const lower = email.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(email);
  }
  return out;
}
