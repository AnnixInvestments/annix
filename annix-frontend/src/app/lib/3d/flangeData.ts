import type { FlangeSpecData } from "@/app/lib/hooks/useFlangeSpecs";

export interface FlangeDataEntry {
  flangeOD: number;
  pcd: number;
  boltHoles: number;
  holeID: number;
  boltSize: number;
  boltLength: number;
  thickness: number;
}

export const FLANGE_DATA: Record<number, FlangeDataEntry> = {
  15: {
    flangeOD: 95,
    pcd: 65,
    boltHoles: 4,
    holeID: 14,
    boltSize: 12,
    boltLength: 55,
    thickness: 14,
  },
  20: {
    flangeOD: 105,
    pcd: 75,
    boltHoles: 4,
    holeID: 14,
    boltSize: 12,
    boltLength: 55,
    thickness: 14,
  },
  25: {
    flangeOD: 115,
    pcd: 85,
    boltHoles: 4,
    holeID: 14,
    boltSize: 12,
    boltLength: 55,
    thickness: 14,
  },
  32: {
    flangeOD: 140,
    pcd: 100,
    boltHoles: 4,
    holeID: 18,
    boltSize: 16,
    boltLength: 65,
    thickness: 16,
  },
  40: {
    flangeOD: 150,
    pcd: 110,
    boltHoles: 4,
    holeID: 18,
    boltSize: 16,
    boltLength: 65,
    thickness: 16,
  },
  50: {
    flangeOD: 165,
    pcd: 125,
    boltHoles: 4,
    holeID: 18,
    boltSize: 16,
    boltLength: 70,
    thickness: 18,
  },
  65: {
    flangeOD: 185,
    pcd: 145,
    boltHoles: 4,
    holeID: 18,
    boltSize: 16,
    boltLength: 70,
    thickness: 18,
  },
  80: {
    flangeOD: 200,
    pcd: 160,
    boltHoles: 8,
    holeID: 18,
    boltSize: 16,
    boltLength: 70,
    thickness: 18,
  },
  100: {
    flangeOD: 220,
    pcd: 180,
    boltHoles: 8,
    holeID: 18,
    boltSize: 16,
    boltLength: 70,
    thickness: 18,
  },
  125: {
    flangeOD: 250,
    pcd: 210,
    boltHoles: 8,
    holeID: 18,
    boltSize: 16,
    boltLength: 75,
    thickness: 20,
  },
  150: {
    flangeOD: 285,
    pcd: 240,
    boltHoles: 8,
    holeID: 22,
    boltSize: 20,
    boltLength: 80,
    thickness: 20,
  },
  200: {
    flangeOD: 340,
    pcd: 295,
    boltHoles: 12,
    holeID: 22,
    boltSize: 20,
    boltLength: 85,
    thickness: 22,
  },
  250: {
    flangeOD: 405,
    pcd: 355,
    boltHoles: 12,
    holeID: 26,
    boltSize: 24,
    boltLength: 95,
    thickness: 24,
  },
  300: {
    flangeOD: 460,
    pcd: 410,
    boltHoles: 12,
    holeID: 26,
    boltSize: 24,
    boltLength: 95,
    thickness: 24,
  },
  350: {
    flangeOD: 520,
    pcd: 470,
    boltHoles: 16,
    holeID: 26,
    boltSize: 24,
    boltLength: 100,
    thickness: 26,
  },
  400: {
    flangeOD: 580,
    pcd: 525,
    boltHoles: 16,
    holeID: 30,
    boltSize: 27,
    boltLength: 110,
    thickness: 28,
  },
  450: {
    flangeOD: 640,
    pcd: 585,
    boltHoles: 20,
    holeID: 30,
    boltSize: 27,
    boltLength: 110,
    thickness: 28,
  },
  500: {
    flangeOD: 670,
    pcd: 620,
    boltHoles: 20,
    holeID: 26,
    boltSize: 24,
    boltLength: 115,
    thickness: 32,
  },
  600: {
    flangeOD: 780,
    pcd: 725,
    boltHoles: 20,
    holeID: 30,
    boltSize: 27,
    boltLength: 120,
    thickness: 32,
  },
  700: {
    flangeOD: 895,
    pcd: 840,
    boltHoles: 24,
    holeID: 30,
    boltSize: 27,
    boltLength: 125,
    thickness: 34,
  },
  750: {
    flangeOD: 960,
    pcd: 900,
    boltHoles: 24,
    holeID: 33,
    boltSize: 30,
    boltLength: 130,
    thickness: 36,
  },
  800: {
    flangeOD: 1015,
    pcd: 950,
    boltHoles: 24,
    holeID: 33,
    boltSize: 30,
    boltLength: 135,
    thickness: 38,
  },
  850: {
    flangeOD: 1075,
    pcd: 1010,
    boltHoles: 28,
    holeID: 33,
    boltSize: 30,
    boltLength: 140,
    thickness: 40,
  },
  900: {
    flangeOD: 1130,
    pcd: 1060,
    boltHoles: 28,
    holeID: 36,
    boltSize: 33,
    boltLength: 145,
    thickness: 42,
  },
};

export interface ResolvedFlangeData {
  specs: FlangeDataEntry;
  isFromApi: boolean;
}

export function resolveFlangeData(
  nb: number,
  apiSpecs?: FlangeSpecData | null,
): ResolvedFlangeData {
  if (apiSpecs) {
    return {
      specs: {
        flangeOD: apiSpecs.flangeOdMm,
        pcd: apiSpecs.flangePcdMm,
        boltHoles: apiSpecs.flangeNumHoles,
        holeID: apiSpecs.flangeBoltHoleDiameterMm,
        boltSize: apiSpecs.boltDiameterMm || 16,
        boltLength: apiSpecs.boltLengthMm || 70,
        thickness: apiSpecs.flangeThicknessMm || 20,
      },
      isFromApi: true,
    };
  }

  const availableNBs = Object.keys(FLANGE_DATA)
    .map(Number)
    .filter((k) => k <= nb);
  const closestNB = availableNBs.pop() || 200;

  return {
    specs: FLANGE_DATA[nb] || FLANGE_DATA[closestNB],
    isFromApi: false,
  };
}
