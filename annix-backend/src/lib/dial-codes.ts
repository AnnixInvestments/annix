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
