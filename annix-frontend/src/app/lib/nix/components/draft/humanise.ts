import { isNumber, isString } from "es-toolkit/compat";

export interface ParsedKey {
  label: string;
  unit: string | null;
}

/**
 * Splits a snake_case / camelCase / mm-suffixed key into a humanised
 * label + unit. Used by every Nix details renderer so a key like
 * "boreThickness_mm" produces { label: "Bore thickness", unit: "mm" }.
 *
 * ALL-CAPS acronyms (NDT, ISO, etc.) are preserved.
 */
export function parseKey(key: string): ParsedKey {
  let body = key;
  let unit: string | null = null;
  const unitMatch = body.match(/_(mm|m|kg|kPa|MPa|µm|um|hrs|hours|percent|degC|degF)$/i);
  if (unitMatch) {
    const u = unitMatch[1];
    if (u === "percent") unit = "%";
    else if (u === "hours") unit = "hrs";
    else if (u === "degC") unit = "°C";
    else if (u === "degF") unit = "°F";
    else if (u === "um") unit = "µm";
    else unit = u;
    body = body.slice(0, -unitMatch[0].length);
  }
  const words = body
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/);
  const label = words
    .map((w, i) => {
      if (w.length === 0) return w;
      if (w === w.toUpperCase() && /[A-Z]/.test(w)) return w;
      const lower = w.toLowerCase();
      return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(" ");
  return { label, unit };
}

/**
 * Convenience wrapper around parseKey for callers that just want a
 * single string with the unit appended in parens.
 */
export function humaniseKey(key: string): string {
  const { label, unit } = parseKey(key);
  return unit ? `${label} (${unit})` : label;
}

export function isPureNumber(value: unknown): value is number {
  return isNumber(value) && Number.isFinite(value);
}

/**
 * Detects values that look like a measurement: pure numbers OR strings
 * that contain a number with an optional unit (mm, MPa, IRHD, % etc.).
 */
export function looksLikeNumberWithUnit(value: unknown): boolean {
  if (isPureNumber(value)) return true;
  if (isString(value)) {
    const trimmed = value.trim();
    return /^-?\d+(\.\d+)?\s*(?:°[CF]|µm|um|mm|cm|m|MPa|kPa|N\/mm|IRHD|%|hrs|hours|kg)?$/i.test(
      trimmed,
    );
  }
  return false;
}

/**
 * Collapses a {min, max} object into a single "X to Y unit" string so
 * Operating temperatures shows as "-40 to 75 °C" instead of two
 * separate fields.
 */
export function tryRangeString(nested: Record<string, unknown>, unit: string): string | null {
  const minRaw = nested.min;
  const minimumRaw = nested.minimum;
  const lowerRaw = nested.lower;
  const maxRaw = nested.max;
  const maximumRaw = nested.maximum;
  const upperRaw = nested.upper;
  const min = minRaw ?? minimumRaw ?? lowerRaw;
  const max = maxRaw ?? maximumRaw ?? upperRaw;
  if (min === undefined || max === undefined) return null;
  if (!isPureNumber(min) || !isPureNumber(max)) return null;
  return `${min} to ${max} ${unit}`.trim();
}
