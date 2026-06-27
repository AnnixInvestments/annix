const DEFAULT_MAX_HINT_LENGTH = 80;

export const MAX_PROMPT_HINTS = 10;

export function sanitizePromptHint(
  value: string | null | undefined,
  maxLength: number = DEFAULT_MAX_HINT_LENGTH,
): string {
  if (!value) {
    return "";
  }
  return value
    .slice(0, maxLength * 4)
    .normalize("NFKC")
    .replace(/\p{C}/gu, " ")
    .replace(/[`*_#>{}[\]|~]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
