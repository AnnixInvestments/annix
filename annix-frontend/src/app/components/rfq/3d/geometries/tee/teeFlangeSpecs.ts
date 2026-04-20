import { keys } from "es-toolkit/compat";
import type { FlangeSpecData } from "@/app/lib/hooks/useFlangeSpecs";

export const getFlangeSpecs = (
  nb: number,
  apiSpecs?: FlangeSpecData | null,
): {
  specs: {
    flangeOD: number;
    pcd: number;
    thickness: number;
    boltHoles: number;
    holeID: number;
    boltSize: number;
    boltLength: number;
  };
  isFromApi: boolean;
} => {
  if (apiSpecs) {
    const rawBoltDiameterMm = apiSpecs.boltDiameterMm;
    const rawBoltLengthMm = apiSpecs.boltLengthMm;
    return {
      specs: {
        flangeOD: apiSpecs.flangeOdMm,
        pcd: apiSpecs.flangePcdMm,
        thickness: apiSpecs.flangeThicknessMm,
        boltHoles: apiSpecs.flangeNumHoles,
        holeID: apiSpecs.flangeBoltHoleDiameterMm,
        boltSize: rawBoltDiameterMm || 16,
        boltLength: rawBoltLengthMm || 70,
      },
      isFromApi: true,
    };
  }

  const flangeData: Record<
    number,
    {
      flangeOD: number;
      pcd: number;
      thickness: number;
      boltHoles: number;
      holeID: number;
      boltSize: number;
      boltLength: number;
    }
  > = {
    15: {
      flangeOD: 95,
      pcd: 65,
      thickness: 14,
      boltHoles: 4,
      holeID: 14,
      boltSize: 12,
      boltLength: 55,
    },
    20: {
      flangeOD: 105,
      pcd: 75,
      thickness: 14,
      boltHoles: 4,
      holeID: 14,
      boltSize: 12,
      boltLength: 55,
    },
    25: {
      flangeOD: 115,
      pcd: 85,
      thickness: 14,
      boltHoles: 4,
      holeID: 14,
      boltSize: 12,
      boltLength: 55,
    },
    32: {
      flangeOD: 140,
      pcd: 100,
      thickness: 16,
      boltHoles: 4,
      holeID: 18,
      boltSize: 16,
      boltLength: 65,
    },
    40: {
      flangeOD: 150,
      pcd: 110,
      thickness: 16,
      boltHoles: 4,
      holeID: 18,
      boltSize: 16,
      boltLength: 65,
    },
    50: {
      flangeOD: 165,
      pcd: 125,
      thickness: 18,
      boltHoles: 4,
      holeID: 18,
      boltSize: 16,
      boltLength: 70,
    },
    65: {
      flangeOD: 185,
      pcd: 145,
      thickness: 18,
      boltHoles: 4,
      holeID: 18,
      boltSize: 16,
      boltLength: 70,
    },
    80: {
      flangeOD: 200,
      pcd: 160,
      thickness: 18,
      boltHoles: 8,
      holeID: 18,
      boltSize: 16,
      boltLength: 70,
    },
    100: {
      flangeOD: 220,
      pcd: 180,
      thickness: 18,
      boltHoles: 8,
      holeID: 18,
      boltSize: 16,
      boltLength: 70,
    },
    125: {
      flangeOD: 250,
      pcd: 210,
      thickness: 20,
      boltHoles: 8,
      holeID: 18,
      boltSize: 16,
      boltLength: 75,
    },
    150: {
      flangeOD: 285,
      pcd: 240,
      thickness: 20,
      boltHoles: 8,
      holeID: 22,
      boltSize: 20,
      boltLength: 80,
    },
    200: {
      flangeOD: 340,
      pcd: 295,
      thickness: 22,
      boltHoles: 12,
      holeID: 22,
      boltSize: 20,
      boltLength: 85,
    },
    250: {
      flangeOD: 405,
      pcd: 355,
      thickness: 24,
      boltHoles: 12,
      holeID: 26,
      boltSize: 24,
      boltLength: 95,
    },
    300: {
      flangeOD: 460,
      pcd: 410,
      thickness: 24,
      boltHoles: 12,
      holeID: 26,
      boltSize: 24,
      boltLength: 95,
    },
    350: {
      flangeOD: 520,
      pcd: 470,
      thickness: 26,
      boltHoles: 16,
      holeID: 26,
      boltSize: 24,
      boltLength: 100,
    },
    400: {
      flangeOD: 580,
      pcd: 525,
      thickness: 28,
      boltHoles: 16,
      holeID: 30,
      boltSize: 27,
      boltLength: 110,
    },
    450: {
      flangeOD: 640,
      pcd: 585,
      thickness: 28,
      boltHoles: 20,
      holeID: 30,
      boltSize: 27,
      boltLength: 110,
    },
    500: {
      flangeOD: 670,
      pcd: 620,
      thickness: 32,
      boltHoles: 20,
      holeID: 26,
      boltSize: 24,
      boltLength: 115,
    },
    600: {
      flangeOD: 780,
      pcd: 725,
      thickness: 32,
      boltHoles: 20,
      holeID: 30,
      boltSize: 27,
      boltLength: 120,
    },
    650: {
      flangeOD: 830,
      pcd: 775,
      thickness: 34,
      boltHoles: 20,
      holeID: 30,
      boltSize: 27,
      boltLength: 125,
    },
    700: {
      flangeOD: 885,
      pcd: 830,
      thickness: 34,
      boltHoles: 24,
      holeID: 30,
      boltSize: 27,
      boltLength: 125,
    },
    750: {
      flangeOD: 940,
      pcd: 880,
      thickness: 36,
      boltHoles: 24,
      holeID: 33,
      boltSize: 30,
      boltLength: 135,
    },
    800: {
      flangeOD: 1015,
      pcd: 950,
      thickness: 38,
      boltHoles: 24,
      holeID: 33,
      boltSize: 30,
      boltLength: 140,
    },
    850: {
      flangeOD: 1065,
      pcd: 1000,
      thickness: 38,
      boltHoles: 24,
      holeID: 33,
      boltSize: 30,
      boltLength: 140,
    },
    900: {
      flangeOD: 1115,
      pcd: 1050,
      thickness: 40,
      boltHoles: 28,
      holeID: 33,
      boltSize: 30,
      boltLength: 145,
    },
  };
  const sizes = keys(flangeData)
    .map(Number)
    .sort((a, b) => a - b);
  let closestSize = sizes[0];
  for (const size of sizes) {
    if (size <= nb) closestSize = size;
    else break;
  }
  const rawClosestSize = flangeData[closestSize];
  return {
    specs: rawClosestSize || {
      flangeOD: nb * 1.5,
      pcd: nb * 1.3,
      thickness: 26,
      boltHoles: 12,
      holeID: 22,
      boltSize: 20,
      boltLength: 90,
    },
    isFromApi: false,
  };
};
