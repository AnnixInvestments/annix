import type { CatalogueSource } from "./fitting-dimension-sources";
import { catalogueSource } from "./fitting-dimension-sources";

// HDPE moulded butt-fusion end cap (dome cap / blanked end) overall
// length, mm. Distance from spigot weld face to dome face. Long-
// pattern values (the SA-stocked default — longer tangent = easier
// butt-fusion weld). Sources: HdpePolyfittings PE100 SDR11/SDR17
// long-pattern table, cross-checked against DEF Pipe (~10% lower
// for short-pattern; supplier rationalises at quote stage).
//
// Pipe boots (mechanical accessory: SS clamp + neoprene gland) are
// NOT in this table — they're sized empirically by clamp choice and
// have no catalogue length.
//
// Blank flanges are ALSO not in this table — they're flat plates
// with only a flange OD + thickness, surfaced via the Flanges
// section of the BOQ rather than as end-cap items.

const END_CAP_DEFAULT_SOURCE_ID = "hdpepolyfittings";

const END_CAP_LENGTH_MM: Record<number, number> = {
  50: 45,
  63: 58,
  75: 62,
  90: 94,
  110: 190,
  125: 225,
  140: 240,
  160: 245,
  180: 280,
  200: 280,
  225: 320,
  250: 335,
  280: 380,
  315: 355,
  355: 370,
  400: 390,
  450: 450,
  500: 480,
  560: 520,
  630: 560,
  710: 690,
  800: 720,
};

export const hdpeEndCapLength = (dnMm: number): number | null => {
  const length = END_CAP_LENGTH_MM[dnMm];
  return length ?? null;
};

// Catalogue source for a given end-cap DN. Returns null when the DN
// isn't in the table.
export const hdpeEndCapSource = (dnMm: number): CatalogueSource | null => {
  const length = hdpeEndCapLength(dnMm);
  if (length == null) return null;
  return catalogueSource(END_CAP_DEFAULT_SOURCE_ID);
};
