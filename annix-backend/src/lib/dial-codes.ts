// Mirrors a subset of the frontend's dial data in
// annix-frontend/src/app/components/phoneCountries.ts; single-source
// unification is deferred.

const DIAL_CODES: Record<string, string> = {
  ZA: "27",
  GB: "44",
  US: "1",
  CA: "1",
  AU: "61",
  NZ: "64",
  IE: "353",
  IN: "91",
  NG: "234",
  KE: "254",
  GH: "233",
  ZW: "263",
  BW: "267",
  NA: "264",
  MZ: "258",
  AE: "971",
  DE: "49",
  FR: "33",
  NL: "31",
  PT: "351",
  ES: "34",
  IT: "39",
};

export function dialCodeForCountry(iso: string | null | undefined): string {
  if (iso === null || iso === undefined) {
    return "27";
  }
  const key = iso.trim().toUpperCase();
  if (key === "") {
    return "27";
  }
  return DIAL_CODES[key] ?? "27";
}

const DIAL_CODES_BY_LENGTH_DESC = [...new Set(Object.values(DIAL_CODES))].sort(
  (a, b) => b.length - a.length,
);

export function formatInternationalPhone(e164: string | null | undefined): string | null {
  if (e164 === null || e164 === undefined || e164 === "") {
    return null;
  }
  const digits = e164.replace(/\D/g, "");
  if (digits === "") {
    return null;
  }
  const dial = DIAL_CODES_BY_LENGTH_DESC.find((code) => digits.startsWith(code));
  if (dial) {
    return `+${dial} ${digits.slice(dial.length)}`;
  }
  return `+${digits}`;
}
