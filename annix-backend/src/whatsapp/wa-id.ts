export function normalizeWaId(
  value: string | null | undefined,
  defaultDialCode = "27",
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
    const internationalDigits = trimmed.replace(/\D/g, "");
    return internationalDigits.startsWith("00")
      ? internationalDigits.slice(2)
      : internationalDigits;
  }
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly === "") {
    return null;
  }
  return digitsOnly.startsWith("0") ? `${defaultDialCode}${digitsOnly.slice(1)}` : digitsOnly;
}
