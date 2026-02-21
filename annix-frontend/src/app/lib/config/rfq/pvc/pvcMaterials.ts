export type PvcType = "uPVC" | "cPVC" | "PVC_O";

export interface PvcMaterial {
  id: PvcType;
  name: string;
  code: string;
  description: string;
  densityKgM3: number;
  maxTemperatureC: number;
  applications: string[];
}

export const PVC_MATERIALS: PvcMaterial[] = [
  {
    id: "uPVC",
    name: "uPVC (Unplasticized PVC)",
    code: "uPVC",
    description: "Standard rigid PVC for cold water and drainage applications",
    densityKgM3: 1400,
    maxTemperatureC: 60,
    applications: ["Cold water supply", "Sewerage", "Drainage", "Irrigation", "Chemical transport"],
  },
  {
    id: "cPVC",
    name: "cPVC (Chlorinated PVC)",
    code: "cPVC",
    description: "Higher temperature rated PVC for hot water and industrial applications",
    densityKgM3: 1550,
    maxTemperatureC: 95,
    applications: [
      "Hot water systems",
      "Industrial chemical lines",
      "Fire sprinkler systems",
      "Plating operations",
    ],
  },
  {
    id: "PVC_O",
    name: "PVC-O (Molecularly Oriented PVC)",
    code: "PVC-O",
    description: "High-performance oriented PVC with superior strength and impact resistance",
    densityKgM3: 1400,
    maxTemperatureC: 45,
    applications: [
      "High pressure water mains",
      "Mining applications",
      "Trenchless installation",
      "Areas with ground movement",
    ],
  },
];

export const pvcMaterialById = (id: PvcType): PvcMaterial | null =>
  PVC_MATERIALS.find((m) => m.id === id) ?? null;
