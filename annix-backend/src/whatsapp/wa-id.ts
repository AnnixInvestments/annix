export function normalizeWaId(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly === "") {
    return null;
  }
  const southAfricaNormalized = digitsOnly.startsWith("0")
    ? `27${digitsOnly.slice(1)}`
    : digitsOnly;
  return southAfricaNormalized;
}
