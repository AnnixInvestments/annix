export const INDIVIDUAL_DOC_MAX_BYTES = 10 * 1024 * 1024;

export const INDIVIDUAL_DOC_MIME_TYPES: ReadonlyArray<string> = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/rtf",
  "text/rtf",
  "application/vnd.oasis.opendocument.text",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const INDIVIDUAL_DOC_EXTENSIONS: ReadonlyArray<string> = [
  ".pdf",
  ".doc",
  ".docx",
  ".rtf",
  ".odt",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
];

export const INDIVIDUAL_DOC_IMAGE_MIME_TYPES: ReadonlyArray<string> = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export function isAcceptedDocumentMime(mimeType: string): boolean {
  return INDIVIDUAL_DOC_MIME_TYPES.includes(mimeType);
}

export function isImageMime(mimeType: string): boolean {
  return INDIVIDUAL_DOC_IMAGE_MIME_TYPES.includes(mimeType);
}
