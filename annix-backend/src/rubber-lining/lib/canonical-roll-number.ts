const PREFIX_SUFFIX_PATTERN = /^\d+-(\d+)$/;

export function canonicalRollNumber(rollNumber: string | null | undefined): string {
  if (!rollNumber) return "";
  const trimmed = rollNumber.trim();
  const match = trimmed.match(PREFIX_SUFFIX_PATTERN);
  return match ? match[1] : trimmed;
}

export function isPrefixedRollNumber(rollNumber: string | null | undefined): boolean {
  if (!rollNumber) return false;
  return PREFIX_SUFFIX_PATTERN.test(rollNumber.trim());
}
