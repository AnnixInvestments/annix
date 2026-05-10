// biome-ignore lint/correctness/noProcessGlobal: NEXT_PUBLIC_ envs are inlined at build time, browser-safe
const rawNEXT_PUBLIC_GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export const GOOGLE_MAPS_API_KEY = rawNEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Maps RfqPipingProfileHandler supplier-bundle keys to PRODUCTS_AND_SERVICES
// checkbox values. Coming-soon products are still mapped — the customer can
// deselect, but we want to flag that those items DID show up in the BOQ so
// the right team gets routed.
export const BUNDLE_KEY_TO_PRODUCT: Record<string, string> = {
  "hdpe-pipe-fittings": "hdpe",
  "hdpe-puddle-pipes": "hdpe",
  "hdpe-boots": "hdpe",
  "rubber-lined-steel": "fabricated_steel",
  "mild-steel": "fabricated_steel",
  "valves-pinch": "valves_meters_instruments",
  "valves-gate": "valves_meters_instruments",
  "valves-other": "valves_meters_instruments",
  "valve-accessories": "valves_meters_instruments",
  "consumables-gaskets": "fasteners_gaskets",
  "consumables-bolts": "fasteners_gaskets",
  "consumables-other": "fasteners_gaskets",
  "consumables-coating": "surface_protection",
  "pipe-wrapping": "surface_protection",
  "upvc-specials": "pvc",
  "fabricated-skids": "pipe_steel_work",
};
