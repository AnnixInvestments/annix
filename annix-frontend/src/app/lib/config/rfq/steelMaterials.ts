export interface SteelMaterial {
  id: string;
  name: string;
  code: string;
  description: string;
  densityKgM3: number;
  defaultCostPerKg: number;
  category:
    | "carbon"
    | "alloy"
    | "stainless"
    | "duplex"
    | "ferritic-martensitic"
    | "nickel"
    | "low-temp"
    | "wear-resistant"
    | "international";
  specifications: string[];
}

export const STEEL_MATERIALS: SteelMaterial[] = [
  {
    id: "carbon-steel-a53",
    name: "Carbon Steel (ASTM A53 Grade B)",
    code: "CS-A53B",
    description:
      "General purpose carbon steel for mining piping, cost-effective with good strength",
    densityKgM3: 7850,
    defaultCostPerKg: 32,
    category: "carbon",
    specifications: ["ASTM A53 Grade B", "API 5L Grade B"],
  },
  {
    id: "carbon-steel-a106",
    name: "Carbon Steel (ASTM A106 Grade B)",
    code: "CS-A106B",
    description: "Seamless carbon steel for high-temperature service",
    densityKgM3: 7850,
    defaultCostPerKg: 38,
    category: "carbon",
    specifications: ["ASTM A106 Grade B"],
  },
  {
    id: "alloy-steel-p11",
    name: "Alloy Steel (ASTM A335 P11)",
    code: "AS-P11",
    description: "Chrome-Moly alloy for high-temperature/pressure mining environments",
    densityKgM3: 7850,
    defaultCostPerKg: 75,
    category: "alloy",
    specifications: ["ASTM A335 P11", "1.25Cr-0.5Mo"],
  },
  {
    id: "alloy-steel-p22",
    name: "Alloy Steel (ASTM A335 P22)",
    code: "AS-P22",
    description: "Higher chrome-moly alloy for severe service conditions",
    densityKgM3: 7850,
    defaultCostPerKg: 85,
    category: "alloy",
    specifications: ["ASTM A335 P22", "2.25Cr-1Mo"],
  },
  {
    id: "stainless-304",
    name: "Stainless Steel 304/304L",
    code: "SS-304",
    description: "Austenitic stainless steel for corrosion-resistant applications",
    densityKgM3: 7930,
    defaultCostPerKg: 95,
    category: "stainless",
    specifications: ["ASTM A312 TP304", "ASTM A312 TP304L"],
  },
  {
    id: "stainless-316",
    name: "Stainless Steel 316/316L",
    code: "SS-316",
    description: "Marine-grade stainless for acidic slurries and harsh mining environments",
    densityKgM3: 8000,
    defaultCostPerKg: 120,
    category: "stainless",
    specifications: ["ASTM A312 TP316", "ASTM A312 TP316L"],
  },
  {
    id: "ar400",
    name: "Abrasion-Resistant Steel (AR400)",
    code: "AR-400",
    description:
      "High-hardness steel (360-440 BHN) for wear liner applications. NOT FOR PRESSURE SERVICE - requires engineering analysis for pressure containment.",
    densityKgM3: 7850,
    defaultCostPerKg: 65,
    category: "wear-resistant",
    specifications: ["AR400", "Hardox 400 equivalent"],
  },
  {
    id: "ar450",
    name: "Abrasion-Resistant Steel (AR450)",
    code: "AR-450",
    description:
      "Extra-hard steel (430-480 BHN) for extreme abrasion resistance. NOT FOR PRESSURE SERVICE - requires engineering analysis for pressure containment.",
    densityKgM3: 7850,
    defaultCostPerKg: 75,
    category: "wear-resistant",
    specifications: ["AR450", "Hardox 450 equivalent"],
  },
  {
    id: "ar500",
    name: "Abrasion-Resistant Steel (AR500)",
    code: "AR-500",
    description:
      "Maximum hardness (460-544 BHN) for demanding abrasive applications. NOT FOR PRESSURE SERVICE - more brittle, requires engineering analysis.",
    densityKgM3: 7850,
    defaultCostPerKg: 85,
    category: "wear-resistant",
    specifications: ["AR500", "Hardox 500 equivalent"],
  },
  {
    id: "duplex-2205",
    name: "Duplex Stainless Steel 2205",
    code: "DSS-2205",
    description:
      "High-strength duplex with excellent corrosion resistance, used in chemical/offshore applications",
    densityKgM3: 7800,
    defaultCostPerKg: 180,
    category: "duplex",
    specifications: ["ASTM A790 S31803", "ASTM A790 S32205", "UNS S32205"],
  },
  {
    id: "super-duplex-2507",
    name: "Super Duplex Stainless Steel 2507",
    code: "SDSS-2507",
    description: "Superior corrosion resistance for aggressive chloride environments and seawater",
    densityKgM3: 7800,
    defaultCostPerKg: 250,
    category: "duplex",
    specifications: ["ASTM A790 S32750", "UNS S32750"],
  },
  {
    id: "hyper-duplex",
    name: "Hyper Duplex Stainless Steel",
    code: "HDSS",
    description: "Maximum corrosion resistance for extreme environments (PREN >48)",
    densityKgM3: 7800,
    defaultCostPerKg: 350,
    category: "duplex",
    specifications: ["ASTM A790 S32707", "UNS S32707"],
  },
  {
    id: "ferritic-430",
    name: "Ferritic Stainless Steel 430",
    code: "FSS-430",
    description:
      "17Cr ferritic stainless with good corrosion resistance, lower cost than austenitic",
    densityKgM3: 7750,
    defaultCostPerKg: 70,
    category: "ferritic-martensitic",
    specifications: ["ASTM A268 TP430", "ASTM A268 TP434"],
  },
  {
    id: "martensitic-410",
    name: "Martensitic Stainless Steel 410",
    code: "MSS-410",
    description: "13Cr martensitic stainless with high strength and hardness, used in valves/pumps",
    densityKgM3: 7750,
    defaultCostPerKg: 75,
    category: "ferritic-martensitic",
    specifications: ["ASTM A268 TP410", "ASTM A268 TP410S"],
  },
  {
    id: "inconel-625",
    name: "Inconel 625",
    code: "INC-625",
    description: "Nickel-chromium superalloy with outstanding fatigue and thermal-fatigue strength",
    densityKgM3: 8440,
    defaultCostPerKg: 450,
    category: "nickel",
    specifications: ["Inconel 625", "UNS N06625"],
  },
  {
    id: "monel-400",
    name: "Monel 400",
    code: "MON-400",
    description: "Nickel-copper alloy with excellent resistance to seawater and steam",
    densityKgM3: 8800,
    defaultCostPerKg: 280,
    category: "nickel",
    specifications: ["Monel 400", "UNS N04400"],
  },
  {
    id: "cu-ni-90-10",
    name: "Copper-Nickel 90-10",
    code: "CuNi-90-10",
    description: "Marine alloy with excellent resistance to biofouling and seawater corrosion",
    densityKgM3: 8900,
    defaultCostPerKg: 220,
    category: "nickel",
    specifications: ["ASTM B466 C70600", "Cu-Ni 90-10"],
  },
  {
    id: "cu-ni-70-30",
    name: "Copper-Nickel 70-30",
    code: "CuNi-70-30",
    description: "Higher nickel content for improved strength and resistance to erosion",
    densityKgM3: 8900,
    defaultCostPerKg: 280,
    category: "nickel",
    specifications: ["ASTM B466 C71500", "Cu-Ni 70-30"],
  },
  {
    id: "a333-gr6",
    name: "Low-Temperature Carbon Steel (A333 Gr 6)",
    code: "LT-A333",
    description: "Impact-tested carbon steel for cryogenic and low-temperature service (-45°C)",
    densityKgM3: 7850,
    defaultCostPerKg: 55,
    category: "low-temp",
    specifications: ["ASTM A333 Grade 6", "ASTM A350 LF2"],
  },
  {
    id: "9-nickel",
    name: "9% Nickel Steel (A333 Gr 8)",
    code: "9Ni",
    description: "Cryogenic steel for LNG service down to -196°C",
    densityKgM3: 7850,
    defaultCostPerKg: 150,
    category: "low-temp",
    specifications: ["ASTM A333 Grade 8", "9% Nickel"],
  },
  {
    id: "din-st35-8",
    name: "DIN St35.8 Carbon Steel",
    code: "DIN-St35.8",
    description: "German standard seamless carbon steel pipe for general purpose",
    densityKgM3: 7850,
    defaultCostPerKg: 35,
    category: "international",
    specifications: ["DIN 2448 St35.8", "DIN 2458 St35.8"],
  },
  {
    id: "jis-stpg370",
    name: "JIS STPG370 Carbon Steel",
    code: "JIS-STPG370",
    description: "Japanese standard carbon steel pipe, equivalent to ASTM A106 Gr B",
    densityKgM3: 7850,
    defaultCostPerKg: 38,
    category: "international",
    specifications: ["JIS G3454 STPG370", "JIS G3456 STPH370"],
  },
  {
    id: "gbt-20",
    name: "GB/T 20# Carbon Steel",
    code: "GB-20",
    description: "Chinese standard seamless carbon steel pipe, equivalent to ASTM A106 Gr A",
    densityKgM3: 7850,
    defaultCostPerKg: 32,
    category: "international",
    specifications: ["GB/T 8163 20#", "GB/T 9711 L245"],
  },
];

export const STEEL_MATERIAL_CATEGORIES = [
  { id: "carbon", name: "Carbon Steel", description: "Cost-effective general purpose steels" },
  { id: "alloy", name: "Alloy Steel", description: "High-temperature and pressure resistant" },
  {
    id: "stainless",
    name: "Stainless Steel",
    description: "Austenitic stainless for corrosion resistance",
  },
  {
    id: "duplex",
    name: "Duplex Stainless",
    description: "High-strength duplex for aggressive environments",
  },
  {
    id: "ferritic-martensitic",
    name: "Ferritic/Martensitic SS",
    description: "Lower-cost stainless with moderate corrosion resistance",
  },
  {
    id: "nickel",
    name: "Nickel Alloys",
    description: "Superalloys for extreme temperatures and corrosion",
  },
  {
    id: "low-temp",
    name: "Low-Temperature Steel",
    description: "Impact-tested for cryogenic service",
  },
  {
    id: "wear-resistant",
    name: "Wear-Resistant Steel",
    description: "Abrasion resistant for mining applications",
  },
  {
    id: "international",
    name: "International Standards",
    description: "DIN, JIS, and GB/T equivalents",
  },
];

export const steelMaterialById = (id: string): SteelMaterial | null => {
  return STEEL_MATERIALS.find((m) => m.id === id) || null;
};

export const steelMaterialsByCategory = (category: SteelMaterial["category"]): SteelMaterial[] => {
  return STEEL_MATERIALS.filter((m) => m.category === category);
};
