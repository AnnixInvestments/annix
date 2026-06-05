// biome-ignore lint/correctness/noProcessGlobal: NEXT_PUBLIC_ envs are inlined at build time, browser-safe
const rawNEXT_PUBLIC_GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export const GOOGLE_MAPS_API_KEY = rawNEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// NOTE: supplier-bundle-key → product mapping was removed in favour of
// per-item inference (productsForExtractedItem in ProjectDetailsStep), which
// reads each item's itemType + lining/coating directly. Bundle keys were too
// coarse — a rubber-lined TANK collapsed into "rubber-lined-steel" and was
// mis-selected as "Steel Pipes" instead of "Tanks & Chutes" + "Surface
// Protection".
