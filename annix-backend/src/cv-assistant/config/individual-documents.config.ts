export const INDIVIDUAL_DOC_MAX_BYTES = 10 * 1024 * 1024;

export const INDIVIDUAL_DOC_MIME_TYPES: ReadonlyArray<string> = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export const INDIVIDUAL_DOC_EXTENSIONS: ReadonlyArray<string> = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
];

export function isAcceptedDocumentMime(mimeType: string): boolean {
  return INDIVIDUAL_DOC_MIME_TYPES.includes(mimeType);
}
