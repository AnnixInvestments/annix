// Extract the leading numeric value from a pressure-class designation
// (e.g. "PN16", "Class 150") for ordinal comparison. Used to decide
// whether a manual override is "higher" or "lower" than the auto-derived
// pressure class.
export const extractPressureNumeric = (designation: string | null): number => {
  if (!designation) return 0;
  const match = designation.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

// Tailwind class set for an auto-filled field — emerald borders + bold
// text when the value came from upstream environmental data, vs. a
// neutral grey otherwise. Used by every auto-fillable input on the
// specifications step so behaviour stays consistent.
export const autoFilledClass = (isAutoFilled: boolean): string =>
  isAutoFilled
    ? "border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold"
    : "border border-gray-300 text-gray-900";

// Map service-life selection to ISO 12944-5 durability code.
//   Short    -> L  (low durability, < 7 years)
//   Medium   -> M  (medium, 7–15 years)
//   Long     -> H  (high, 15–25 years)
//   Extended -> VH (very high, > 25 years)
export const serviceLifeToDurability = (
  serviceLife: string | null,
): "L" | "M" | "H" | "VH" | null => {
  switch (serviceLife) {
    case "Short":
      return "L";
    case "Medium":
      return "M";
    case "Long":
      return "H";
    case "Extended":
      return "VH";
    default:
      return null;
  }
};

// Derive a temperature-band category from a working-temperature value.
// Returns "Ambient" for the standard working range (-20 to +60 °C),
// "Elevated" for 60–120, "High" above 120. Null when no temperature
// is provided.
export const deriveTemperatureCategory = (tempC: number | null): string | null => {
  if (tempC == null) return null;
  if (tempC < -20 || tempC > 60) {
    if (tempC >= 60 && tempC <= 120) return "Elevated";
    if (tempC > 120 && tempC <= 200) return "High";
    if (tempC > 200) return "High";
    return "Ambient";
  }
  return "Ambient";
};
