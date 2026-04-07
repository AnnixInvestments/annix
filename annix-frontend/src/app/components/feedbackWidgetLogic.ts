export const FEEDBACK_MIN_LENGTH = 10;
export const FEEDBACK_MAX_LENGTH = 5000;
export const MAX_ATTACHMENTS = 5;

export const ALLOWED_FILE_TYPES = [
  "image/",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export function isSubmitDisabled(
  content: string,
  isSubmitting: boolean,
  isListening: boolean,
): boolean {
  if (isSubmitting) return true;
  if (isListening) return true;
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (content.length < FEEDBACK_MIN_LENGTH) return true;
  return false;
}

export function isFileAllowed(fileType: string): boolean {
  return ALLOWED_FILE_TYPES.some((t) => fileType.startsWith(t));
}

export function remainingAttachmentSlots(currentCount: number): number {
  return Math.max(0, MAX_ATTACHMENTS - currentCount);
}

export function displayContent(
  content: string,
  interimTranscript: string,
  isListening: boolean,
): string {
  return isListening ? content + interimTranscript : content;
}

export function contentValidationMessage(content: string): string | null {
  const len = content.length;
  if (len === 0) return null;
  if (len < FEEDBACK_MIN_LENGTH) return `min ${FEEDBACK_MIN_LENGTH}`;
  return null;
}
