export type PvcPressureClass = 6 | 9 | 12 | 16 | 20 | 25 | 34 | 40;

export interface PvcPressureOption {
  value: PvcPressureClass;
  label: string;
  description: string;
}

export const PVC_PRESSURE_OPTIONS: PvcPressureOption[] = [
  { value: 6, label: "Class 6 (6 bar)", description: "Low pressure drainage and sewer" },
  { value: 9, label: "Class 9 (9 bar)", description: "Light-duty pressure applications" },
  {
    value: 12,
    label: "Class 12 (12 bar)",
    description: "Standard pressure water supply",
  },
  {
    value: 16,
    label: "Class 16 (16 bar)",
    description: "High pressure water mains",
  },
  {
    value: 20,
    label: "Class 20 (20 bar)",
    description: "Heavy-duty industrial applications",
  },
  {
    value: 25,
    label: "Class 25 (25 bar)",
    description: "Extra heavy-duty pressure service",
  },
  {
    value: 34,
    label: "Class 34 (34 bar)",
    description: "Very high pressure mining applications",
  },
  {
    value: 40,
    label: "Class 40 (40 bar)",
    description: "Maximum pressure rating",
  },
];

export interface PvcWallThickness {
  nominalBoreMm: number;
  outsideDiameterMm: number;
  wallThicknessByClass: Partial<Record<PvcPressureClass, number>>;
}

export const PVC_WALL_THICKNESS_DATA: PvcWallThickness[] = [
  {
    nominalBoreMm: 20,
    outsideDiameterMm: 20,
    wallThicknessByClass: { 6: 1.0, 9: 1.2, 12: 1.5, 16: 1.8, 20: 2.2 },
  },
  {
    nominalBoreMm: 25,
    outsideDiameterMm: 25,
    wallThicknessByClass: { 6: 1.2, 9: 1.4, 12: 1.8, 16: 2.2, 20: 2.7 },
  },
  {
    nominalBoreMm: 32,
    outsideDiameterMm: 32,
    wallThicknessByClass: { 6: 1.4, 9: 1.7, 12: 2.2, 16: 2.8, 20: 3.4 },
  },
  {
    nominalBoreMm: 40,
    outsideDiameterMm: 40,
    wallThicknessByClass: { 6: 1.6, 9: 2.0, 12: 2.6, 16: 3.3, 20: 4.0 },
  },
  {
    nominalBoreMm: 50,
    outsideDiameterMm: 50,
    wallThicknessByClass: { 6: 1.8, 9: 2.4, 12: 3.0, 16: 3.9, 20: 4.8 },
  },
  {
    nominalBoreMm: 63,
    outsideDiameterMm: 63,
    wallThicknessByClass: { 6: 2.0, 9: 2.8, 12: 3.6, 16: 4.7, 20: 5.8 },
  },
  {
    nominalBoreMm: 75,
    outsideDiameterMm: 75,
    wallThicknessByClass: { 6: 2.3, 9: 3.2, 12: 4.3, 16: 5.6, 20: 6.8 },
  },
  {
    nominalBoreMm: 90,
    outsideDiameterMm: 90,
    wallThicknessByClass: { 6: 2.7, 9: 3.8, 12: 5.1, 16: 6.7, 20: 8.1 },
  },
  {
    nominalBoreMm: 110,
    outsideDiameterMm: 110,
    wallThicknessByClass: { 6: 3.2, 9: 4.6, 12: 6.2, 16: 8.1, 20: 9.9 },
  },
  {
    nominalBoreMm: 125,
    outsideDiameterMm: 125,
    wallThicknessByClass: { 6: 3.7, 9: 5.2, 12: 7.0, 16: 9.2, 20: 11.2 },
  },
  {
    nominalBoreMm: 140,
    outsideDiameterMm: 140,
    wallThicknessByClass: { 6: 4.1, 9: 5.8, 12: 7.8, 16: 10.3, 20: 12.5 },
  },
  {
    nominalBoreMm: 160,
    outsideDiameterMm: 160,
    wallThicknessByClass: { 6: 4.7, 9: 6.6, 12: 8.9, 16: 11.8, 20: 14.3 },
  },
  {
    nominalBoreMm: 180,
    outsideDiameterMm: 180,
    wallThicknessByClass: { 6: 5.3, 9: 7.4, 12: 10.0, 16: 13.2 },
  },
  {
    nominalBoreMm: 200,
    outsideDiameterMm: 200,
    wallThicknessByClass: { 6: 5.9, 9: 8.2, 12: 11.1, 16: 14.7 },
  },
  {
    nominalBoreMm: 225,
    outsideDiameterMm: 225,
    wallThicknessByClass: { 6: 6.6, 9: 9.2, 12: 12.5, 16: 16.5 },
  },
  {
    nominalBoreMm: 250,
    outsideDiameterMm: 250,
    wallThicknessByClass: { 6: 7.3, 9: 10.2, 12: 13.8, 16: 18.3 },
  },
  {
    nominalBoreMm: 280,
    outsideDiameterMm: 280,
    wallThicknessByClass: { 6: 8.2, 9: 11.4, 12: 15.5 },
  },
  {
    nominalBoreMm: 315,
    outsideDiameterMm: 315,
    wallThicknessByClass: { 6: 9.2, 9: 12.8, 12: 17.4 },
  },
  {
    nominalBoreMm: 355,
    outsideDiameterMm: 355,
    wallThicknessByClass: { 6: 10.4, 9: 14.5, 12: 19.6 },
  },
  {
    nominalBoreMm: 400,
    outsideDiameterMm: 400,
    wallThicknessByClass: { 6: 11.7, 9: 16.3, 12: 22.1 },
  },
  {
    nominalBoreMm: 450,
    outsideDiameterMm: 450,
    wallThicknessByClass: { 6: 13.2, 9: 18.3 },
  },
  {
    nominalBoreMm: 500,
    outsideDiameterMm: 500,
    wallThicknessByClass: { 6: 14.6, 9: 20.4 },
  },
  {
    nominalBoreMm: 560,
    outsideDiameterMm: 560,
    wallThicknessByClass: { 6: 16.4, 9: 22.8 },
  },
  {
    nominalBoreMm: 630,
    outsideDiameterMm: 630,
    wallThicknessByClass: { 6: 18.4, 9: 25.7 },
  },
];

export const pvcWallThickness = (
  outsideDiameterMm: number,
  pressureClass: PvcPressureClass,
): number | null => {
  const sizeData = PVC_WALL_THICKNESS_DATA.find(
    (d) => d.outsideDiameterMm === outsideDiameterMm,
  );
  return sizeData?.wallThicknessByClass[pressureClass] ?? null;
};

export const availablePressureClassesForSize = (
  outsideDiameterMm: number,
): PvcPressureClass[] => {
  const sizeData = PVC_WALL_THICKNESS_DATA.find(
    (d) => d.outsideDiameterMm === outsideDiameterMm,
  );
  if (!sizeData) return [];
  return Object.keys(sizeData.wallThicknessByClass).map(
    (k) => parseInt(k, 10) as PvcPressureClass,
  );
};

export const recommendedPressureClassForPressure = (
  pressureBar: number,
): PvcPressureClass => {
  const sortedClasses = [...PVC_PRESSURE_OPTIONS].sort((a, b) => a.value - b.value);
  const suitable = sortedClasses.find((c) => c.value >= pressureBar);
  return suitable?.value ?? 16;
};

export const PVC_NOMINAL_SIZES = PVC_WALL_THICKNESS_DATA.map((d) => d.nominalBoreMm);
