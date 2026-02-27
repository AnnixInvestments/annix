export type HdpeGrade = "PE80" | "PE100" | "PE100_RC";

export interface HdpeMaterial {
  id: HdpeGrade;
  name: string;
  code: string;
  description: string;
  densityKgM3: number;
  minDesignStress: number;
  maxTemperatureC: number;
  applications: string[];
}

export const HDPE_MATERIALS: HdpeMaterial[] = [
  {
    id: "PE80",
    name: "PE80",
    code: "PE80",
    description: "Standard polyethylene for water and gas distribution",
    densityKgM3: 950,
    minDesignStress: 6.3,
    maxTemperatureC: 60,
    applications: ["Water distribution", "Gas distribution", "Low pressure systems"],
  },
  {
    id: "PE100",
    name: "PE100",
    code: "PE100",
    description: "High-performance polyethylene for demanding applications",
    densityKgM3: 960,
    minDesignStress: 8.0,
    maxTemperatureC: 60,
    applications: ["High pressure water mains", "Industrial pipelines", "Mining applications"],
  },
  {
    id: "PE100_RC",
    name: "PE100-RC",
    code: "PE100-RC",
    description: "Crack-resistant PE100 for trenchless installations",
    densityKgM3: 960,
    minDesignStress: 8.0,
    maxTemperatureC: 60,
    applications: [
      "Trenchless installation",
      "Directional drilling",
      "Rocky terrain",
      "High-stress applications",
    ],
  },
];

export const hdpeMaterialById = (id: HdpeGrade): HdpeMaterial | null =>
  HDPE_MATERIALS.find((m) => m.id === id) ?? null;
