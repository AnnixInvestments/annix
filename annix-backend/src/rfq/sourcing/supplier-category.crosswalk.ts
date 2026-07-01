import { type CapabilityKey, VALID_CAPABILITIES } from "../../boq/config/capability-mapping";

export type CanonicalCategory = CapabilityKey;

export interface CategoryResolution {
  categories: CanonicalCategory[];
  unmatched: boolean;
  source: "bundle" | "item-type" | "material" | "none";
}

const BUNDLE_KEY_TO_CANONICAL: Record<string, CanonicalCategory[]> = {
  "valves-pinch": ["valves_instruments"],
  "valves-gate": ["valves_instruments"],
  "valves-other": ["valves_instruments"],
  "valve-accessories": ["valves_instruments"],
  instruments: ["valves_instruments"],
  "consumables-gaskets": ["fasteners_gaskets"],
  "consumables-bolts": ["fasteners_gaskets"],
  "consumables-other": ["fasteners_gaskets"],
  "consumables-coating": ["surface_protection"],
  "pipe-wrapping": ["surface_protection"],
  "upvc-specials": ["pvc"],
  "hdpe-puddle-pipes": ["hdpe"],
  "hdpe-boots": ["hdpe"],
  "hdpe-pipe-fittings": ["hdpe"],
  "pu-lined-steel": ["fabricated_steel", "surface_protection"],
  "rubber-lined-steel": ["fabricated_steel", "surface_protection"],
  "mild-steel": ["fabricated_steel"],
  "fabricated-skids": ["fabricated_steel"],
  "tanks-chutes": ["fabricated_steel"],
  other: [],
};

const ITEM_TYPE_TO_CANONICAL: Record<string, CanonicalCategory[]> = {
  pipe: ["fabricated_steel"],
  bend: ["fabricated_steel"],
  reducer: ["fabricated_steel"],
  tee: ["fabricated_steel"],
  lateral: ["fabricated_steel"],
  flange: ["fabricated_steel"],
  end_cap: ["fabricated_steel"],
  fitting: ["fabricated_steel"],
  expansion_joint: ["fabricated_steel"],
  pipe_steel_work: ["fabricated_steel"],
  straight_pipe: ["fabricated_steel"],
  skid: ["fabricated_steel"],
  tank_chute: ["fabricated_steel"],
  puddle_pipe: ["hdpe"],
  boot: ["hdpe"],
  valve: ["valves_instruments"],
  instrument: ["valves_instruments"],
  pump: ["pumps"],
  consumable: ["fasteners_gaskets"],
  fastener: ["fasteners_gaskets"],
  wrapping: ["surface_protection"],
  surface_protection: ["surface_protection"],
  upvc: ["pvc"],
};

const PRODUCT_TYPE_TO_CANONICAL: Record<string, CanonicalCategory> = {
  hdpe: "hdpe",
  pvc: "pvc",
  upvc: "pvc",
};

const LEGACY_SUPPLIER_CATEGORY_ALIAS: Record<string, CanonicalCategory> = {
  straight_pipe: "fabricated_steel",
  bends: "fabricated_steel",
  flanges: "fabricated_steel",
  fittings: "fabricated_steel",
  fabrication: "fabricated_steel",
  valves: "valves_instruments",
  coating: "surface_protection",
};

const CANONICAL_SET = new Set<string>(VALID_CAPABILITIES);

export function canonicalForBundleKey(bundleKey: string): CategoryResolution {
  const categories = BUNDLE_KEY_TO_CANONICAL[bundleKey];
  if (categories === undefined) {
    return { categories: [], unmatched: true, source: "none" };
  }
  return { categories, unmatched: categories.length === 0, source: "bundle" };
}

export interface ItemLikeForCategory {
  itemType?: string | null;
  material?: string | null;
  productType?: string | null;
}

export function canonicalForItem(item: ItemLikeForCategory): CategoryResolution {
  const productType = item.productType ?? null;
  const productOverride = productType ? PRODUCT_TYPE_TO_CANONICAL[productType] : undefined;
  const itemType = item.itemType ?? null;
  const byType = itemType ? ITEM_TYPE_TO_CANONICAL[itemType] : undefined;

  if (productOverride && byType?.includes("fabricated_steel")) {
    return { categories: [productOverride], unmatched: false, source: "material" };
  }
  if (byType && byType.length > 0) {
    return { categories: byType, unmatched: false, source: "item-type" };
  }
  if (productOverride) {
    return { categories: [productOverride], unmatched: false, source: "material" };
  }
  return { categories: [], unmatched: true, source: "none" };
}

export function normaliseSupplierCategory(rawCategory: string): CanonicalCategory | null {
  if (CANONICAL_SET.has(rawCategory)) return rawCategory as CanonicalCategory;
  return LEGACY_SUPPLIER_CATEGORY_ALIAS[rawCategory] ?? null;
}

export function isDualRouteBundleKey(bundleKey: string): boolean {
  return (BUNDLE_KEY_TO_CANONICAL[bundleKey]?.length ?? 0) > 1;
}
