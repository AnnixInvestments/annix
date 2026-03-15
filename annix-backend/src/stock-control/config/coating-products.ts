export interface CoatingProductSpec {
  name: string;
  aliases: string[];
  genericType: string;
  volumeSolidsPercent: number;
  defaultDftUm?: number | null;
}

const COATING_PRODUCTS: CoatingProductSpec[] = [
  // ── Jotun ──────────────────────────────────────────────
  {
    name: "Jotamastic 90",
    aliases: ["jotamastic90", "jotamastic 90 aluminium", "jotamastic 90 standard"],
    genericType: "epoxy_mastic",
    volumeSolidsPercent: 85,
  },
  {
    name: "Jotamastic 87",
    aliases: ["jotamastic87"],
    genericType: "epoxy_mastic",
    volumeSolidsPercent: 83,
  },
  {
    name: "Jotamastic 80",
    aliases: ["jotamastic80"],
    genericType: "epoxy",
    volumeSolidsPercent: 65,
  },
  {
    name: "Jotacote Universal",
    aliases: ["jotacote uni", "jotacote universal n10"],
    genericType: "epoxy",
    volumeSolidsPercent: 86,
  },
  {
    name: "Penguard Express",
    aliases: ["penguard exp"],
    genericType: "epoxy",
    volumeSolidsPercent: 72,
  },
  {
    name: "Penguard HB",
    aliases: ["penguard highbuild", "penguard high build"],
    genericType: "epoxy",
    volumeSolidsPercent: 80,
  },
  {
    name: "Penguard Midcoat",
    aliases: ["penguard mid"],
    genericType: "epoxy",
    volumeSolidsPercent: 73,
  },
  {
    name: "Penguard Primer",
    aliases: [],
    genericType: "epoxy",
    volumeSolidsPercent: 62,
  },
  {
    name: "Hardtop XP",
    aliases: ["hardtopxp"],
    genericType: "polyurethane",
    volumeSolidsPercent: 62,
  },
  {
    name: "Hardtop AX",
    aliases: ["hardtopax"],
    genericType: "polyurethane",
    volumeSolidsPercent: 55,
  },
  {
    name: "Hardtop One",
    aliases: ["hardtop 1"],
    genericType: "polyurethane",
    volumeSolidsPercent: 71,
  },
  {
    name: "Hardtop AS",
    aliases: ["hardtopas"],
    genericType: "polysiloxane",
    volumeSolidsPercent: 70,
  },
  {
    name: "Barrier 80",
    aliases: ["barrier80"],
    genericType: "epoxy",
    volumeSolidsPercent: 69,
  },
  {
    name: "Marathon IQ",
    aliases: ["marathon"],
    genericType: "epoxy",
    volumeSolidsPercent: 78,
  },
  {
    name: "Jotafloor Topcoat",
    aliases: ["jotafloor"],
    genericType: "epoxy",
    volumeSolidsPercent: 76,
  },
  {
    name: "Jotamastic 90 Sandstone Yellow Y53",
    aliases: ["jotamastic 90 sandstone", "jotamastic 90 y53"],
    genericType: "epoxy_mastic",
    volumeSolidsPercent: 85,
  },
  {
    name: "Pilot QD Red Oxide",
    aliases: ["pilot qd", "pilot qd red", "pilot red oxide", "jotun pilot qd"],
    genericType: "alkyd",
    volumeSolidsPercent: 49,
    defaultDftUm: 50,
  },

  // ── International (AkzoNobel) ──────────────────────────
  {
    name: "Intergard 251",
    aliases: ["intergard251"],
    genericType: "epoxy",
    volumeSolidsPercent: 67,
  },
  {
    name: "Intergard 269",
    aliases: ["intergard269"],
    genericType: "epoxy",
    volumeSolidsPercent: 72,
  },
  {
    name: "Intergard 475HS",
    aliases: ["intergard475", "intergard 475"],
    genericType: "epoxy",
    volumeSolidsPercent: 83,
  },
  {
    name: "Interthane 870",
    aliases: ["interthane870"],
    genericType: "polyurethane",
    volumeSolidsPercent: 52,
  },
  {
    name: "Interthane 990",
    aliases: ["interthane990"],
    genericType: "polyurethane",
    volumeSolidsPercent: 60,
  },
  {
    name: "Interzone 954",
    aliases: ["interzone954"],
    genericType: "epoxy",
    volumeSolidsPercent: 84,
  },
  {
    name: "Intercure 200HS",
    aliases: ["intercure200", "intercure 200"],
    genericType: "epoxy",
    volumeSolidsPercent: 76,
  },
  {
    name: "Interseal 670HS",
    aliases: ["interseal670", "interseal 670"],
    genericType: "epoxy",
    volumeSolidsPercent: 80,
  },
  {
    name: "Interzinc 52",
    aliases: ["interzinc52"],
    genericType: "zinc_rich",
    volumeSolidsPercent: 63,
  },
  {
    name: "Interzinc 22",
    aliases: ["interzinc22"],
    genericType: "inorganic_zinc",
    volumeSolidsPercent: 55,
  },

  // ── Sigma (PPG) ────────────────────────────────────────
  {
    name: "SigmaCover 280",
    aliases: ["sigmacover280", "sigma cover 280"],
    genericType: "epoxy",
    volumeSolidsPercent: 72,
  },
  {
    name: "SigmaCover 456",
    aliases: ["sigmacover456", "sigma cover 456"],
    genericType: "epoxy",
    volumeSolidsPercent: 83,
  },
  {
    name: "SigmaGuard CSF 585",
    aliases: ["sigmaguard585", "sigmaguard csf585"],
    genericType: "epoxy",
    volumeSolidsPercent: 75,
  },
  {
    name: "Sigmarine 48",
    aliases: ["sigmarine48"],
    genericType: "alkyd",
    volumeSolidsPercent: 45,
  },

  // ── Hempel ─────────────────────────────────────────────
  {
    name: "Hempadur 45143",
    aliases: ["hempadur45143"],
    genericType: "epoxy",
    volumeSolidsPercent: 81,
  },
  {
    name: "Hempadur Mastic 45880",
    aliases: ["hempadur mastic", "hempadur45880"],
    genericType: "epoxy_mastic",
    volumeSolidsPercent: 85,
  },
  {
    name: "Hempadur 15570",
    aliases: ["hempadur15570"],
    genericType: "epoxy",
    volumeSolidsPercent: 82,
  },
  {
    name: "Hempathane 55210",
    aliases: ["hempathane55210", "hempathane topcoat"],
    genericType: "polyurethane",
    volumeSolidsPercent: 55,
  },
  {
    name: "Hemucryl 48200",
    aliases: ["hemucryl48200"],
    genericType: "acrylic",
    volumeSolidsPercent: 42,
  },

  // ── Carboline ──────────────────────────────────────────
  {
    name: "Carbozinc 11",
    aliases: ["carbozinc11"],
    genericType: "zinc_rich",
    volumeSolidsPercent: 73,
  },
  {
    name: "Carbozinc 11 HS",
    aliases: ["carbozinc11hs", "carbozinc 11hs"],
    genericType: "zinc_rich",
    volumeSolidsPercent: 78,
  },
  {
    name: "Carboguard 893",
    aliases: ["carboguard893"],
    genericType: "epoxy",
    volumeSolidsPercent: 85,
  },
  {
    name: "Carboline 890",
    aliases: ["carboline890"],
    genericType: "epoxy",
    volumeSolidsPercent: 80,
  },
  {
    name: "Carbomastic 15",
    aliases: ["carbomastic15"],
    genericType: "epoxy_mastic",
    volumeSolidsPercent: 85,
  },
  {
    name: "Carbothane 133 HB",
    aliases: ["carbothane133", "carbothane 133"],
    genericType: "polyurethane",
    volumeSolidsPercent: 65,
  },

  // ── Sherwin-Williams ───────────────────────────────────
  {
    name: "Macropoxy 646",
    aliases: ["macropoxy646"],
    genericType: "epoxy",
    volumeSolidsPercent: 72,
  },
  {
    name: "Macropoxy 400",
    aliases: ["macropoxy400"],
    genericType: "epoxy",
    volumeSolidsPercent: 63,
  },
  {
    name: "Acrolon 218HS",
    aliases: ["acrolon218", "acrolon 218"],
    genericType: "polyurethane",
    volumeSolidsPercent: 62,
  },
  {
    name: "Zinc Clad IV",
    aliases: ["zincclad4", "zinc clad 4", "zincclad iv"],
    genericType: "zinc_rich",
    volumeSolidsPercent: 68,
  },

  // ── Denso ──────────────────────────────────────────────
  {
    name: "Denso Protal 7200",
    aliases: ["protal7200", "protal 7200"],
    genericType: "epoxy",
    volumeSolidsPercent: 100,
  },

  // ── Bitumen / Tar ────────────────────────────────────
  {
    name: "Black Bitumen",
    aliases: ["blackbitumen", "bitumen", "bitumen paint", "black bitumen paint"],
    genericType: "bitumen",
    volumeSolidsPercent: 50,
    defaultDftUm: 125,
  },
];

function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function buildLookupMap(): Map<string, CoatingProductSpec> {
  return new Map(
    COATING_PRODUCTS.flatMap((product) => [
      [normalizeProductName(product.name), product] as const,
      ...product.aliases.map((alias) => [normalizeProductName(alias), product] as const),
    ]),
  );
}

const PRODUCT_LOOKUP = buildLookupMap();

export function lookupCoatingProduct(productName: string): CoatingProductSpec | null {
  const normalized = normalizeProductName(productName);

  const exact = PRODUCT_LOOKUP.get(normalized);
  if (exact) {
    return exact;
  }

  const partialMatch = Array.from(PRODUCT_LOOKUP.entries()).find(
    ([key]) => normalized.includes(key) || key.includes(normalized),
  );

  return partialMatch ? partialMatch[1] : null;
}

export function allKnownProducts(): CoatingProductSpec[] {
  return [...COATING_PRODUCTS];
}
