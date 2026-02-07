export interface SteelMaterial {
  id: string;
  name: string;
  code: string;
  description: string;
  densityKgM3: number;
  defaultCostPerKg: number;
  category: "carbon" | "alloy" | "stainless" | "wear-resistant";
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
    description: "High-hardness steel for handling abrasive mining materials",
    densityKgM3: 7850,
    defaultCostPerKg: 65,
    category: "wear-resistant",
    specifications: ["AR400", "Hardox 400 equivalent"],
  },
  {
    id: "ar450",
    name: "Abrasion-Resistant Steel (AR450)",
    code: "AR-450",
    description: "Extra-hard steel for extreme abrasion resistance",
    densityKgM3: 7850,
    defaultCostPerKg: 75,
    category: "wear-resistant",
    specifications: ["AR450", "Hardox 450 equivalent"],
  },
  {
    id: "ar500",
    name: "Abrasion-Resistant Steel (AR500)",
    code: "AR-500",
    description: "Maximum hardness for the most demanding abrasive applications",
    densityKgM3: 7850,
    defaultCostPerKg: 85,
    category: "wear-resistant",
    specifications: ["AR500", "Hardox 500 equivalent"],
  },
];

export const STEEL_MATERIAL_CATEGORIES = [
  { id: "carbon", name: "Carbon Steel", description: "Cost-effective general purpose steels" },
  { id: "alloy", name: "Alloy Steel", description: "High-temperature and pressure resistant" },
  {
    id: "stainless",
    name: "Stainless Steel",
    description: "Corrosion resistant for harsh environments",
  },
  {
    id: "wear-resistant",
    name: "Wear-Resistant Steel",
    description: "Abrasion resistant for mining applications",
  },
];

export const steelMaterialById = (id: string): SteelMaterial | null => {
  return STEEL_MATERIALS.find((m) => m.id === id) || null;
};

export const steelMaterialsByCategory = (category: SteelMaterial["category"]): SteelMaterial[] => {
  return STEEL_MATERIALS.filter((m) => m.category === category);
};
