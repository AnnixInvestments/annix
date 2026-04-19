import { isNumber, keys } from "es-toolkit/compat";
import { PIPE_MATERIALS } from "@/app/lib/config/rfq/rendering3DStandards";
import type { FlangeSpecData } from "@/app/lib/hooks/useFlangeSpecs";

const pipeOuterMat = PIPE_MATERIALS.outer;

export const getFlangeSpecs = (
  nominalBore: number,
  apiSpecs?: FlangeSpecData | null,
): {
  specs: {
    flangeOD: number;
    pcd: number;
    boltHoles: number;
    holeID: number;
    thickness: number;
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
        boltHoles: apiSpecs.flangeNumHoles,
        holeID: apiSpecs.flangeBoltHoleDiameterMm,
        thickness: apiSpecs.flangeThicknessMm,
        boltSize: rawBoltDiameterMm || 16,
        boltLength: rawBoltLengthMm || 70,
      },
      isFromApi: true,
    };
  }

  const flangeData: {
    [key: number]: {
      flangeOD: number;
      pcd: number;
      boltHoles: number;
      holeID: number;
      thickness: number;
      boltSize: number;
      boltLength: number;
    };
  } = {
    15: {
      flangeOD: 95,
      pcd: 65,
      boltHoles: 4,
      holeID: 14,
      thickness: 14,
      boltSize: 12,
      boltLength: 55,
    },
    20: {
      flangeOD: 105,
      pcd: 75,
      boltHoles: 4,
      holeID: 14,
      thickness: 14,
      boltSize: 12,
      boltLength: 55,
    },
    25: {
      flangeOD: 115,
      pcd: 85,
      boltHoles: 4,
      holeID: 14,
      thickness: 14,
      boltSize: 12,
      boltLength: 55,
    },
    32: {
      flangeOD: 140,
      pcd: 100,
      boltHoles: 4,
      holeID: 18,
      thickness: 16,
      boltSize: 16,
      boltLength: 65,
    },
    40: {
      flangeOD: 150,
      pcd: 110,
      boltHoles: 4,
      holeID: 18,
      thickness: 16,
      boltSize: 16,
      boltLength: 65,
    },
    50: {
      flangeOD: 165,
      pcd: 125,
      boltHoles: 4,
      holeID: 18,
      thickness: 18,
      boltSize: 16,
      boltLength: 70,
    },
    65: {
      flangeOD: 185,
      pcd: 145,
      boltHoles: 4,
      holeID: 18,
      thickness: 18,
      boltSize: 16,
      boltLength: 70,
    },
    80: {
      flangeOD: 200,
      pcd: 160,
      boltHoles: 8,
      holeID: 18,
      thickness: 18,
      boltSize: 16,
      boltLength: 70,
    },
    100: {
      flangeOD: 220,
      pcd: 180,
      boltHoles: 8,
      holeID: 18,
      thickness: 18,
      boltSize: 16,
      boltLength: 70,
    },
    125: {
      flangeOD: 250,
      pcd: 210,
      boltHoles: 8,
      holeID: 18,
      thickness: 20,
      boltSize: 16,
      boltLength: 75,
    },
    150: {
      flangeOD: 285,
      pcd: 240,
      boltHoles: 8,
      holeID: 22,
      thickness: 20,
      boltSize: 20,
      boltLength: 80,
    },
    200: {
      flangeOD: 340,
      pcd: 295,
      boltHoles: 12,
      holeID: 22,
      thickness: 22,
      boltSize: 20,
      boltLength: 85,
    },
    250: {
      flangeOD: 405,
      pcd: 355,
      boltHoles: 12,
      holeID: 26,
      thickness: 24,
      boltSize: 24,
      boltLength: 95,
    },
    300: {
      flangeOD: 460,
      pcd: 410,
      boltHoles: 12,
      holeID: 26,
      thickness: 24,
      boltSize: 24,
      boltLength: 95,
    },
    350: {
      flangeOD: 520,
      pcd: 470,
      boltHoles: 16,
      holeID: 26,
      thickness: 26,
      boltSize: 24,
      boltLength: 100,
    },
    400: {
      flangeOD: 580,
      pcd: 525,
      boltHoles: 16,
      holeID: 30,
      thickness: 28,
      boltSize: 27,
      boltLength: 110,
    },
    450: {
      flangeOD: 640,
      pcd: 585,
      boltHoles: 20,
      holeID: 30,
      thickness: 28,
      boltSize: 27,
      boltLength: 110,
    },
    500: {
      flangeOD: 670,
      pcd: 620,
      boltHoles: 20,
      holeID: 26,
      thickness: 32,
      boltSize: 24,
      boltLength: 115,
    },
    600: {
      flangeOD: 780,
      pcd: 725,
      boltHoles: 20,
      holeID: 30,
      thickness: 32,
      boltSize: 27,
      boltLength: 120,
    },
  };

  const sizes = keys(flangeData)
    .map(Number)
    .sort((a, b) => a - b);
  let closestSize = sizes[0];
  for (const size of sizes) {
    if (size <= nominalBore) closestSize = size;
    else break;
  }

  const rawClosestSize = flangeData[closestSize];

  return { specs: rawClosestSize || flangeData[50], isFromApi: false };
};

export const getMaterialProps = (name: string = "") => {
  const n = name.toLowerCase();
  if (n.includes("sabs 62"))
    return {
      color: "#C0C0C0",
      metalness: 0.85,
      roughness: 0.25,
      envMapIntensity: 1.2,
      name: "Galvanized Steel",
    };
  if (n.includes("stainless") || n.includes("304") || n.includes("316"))
    return {
      color: "#E0E0E0",
      metalness: 0.9,
      roughness: 0.15,
      envMapIntensity: 1.3,
      name: "Stainless Steel",
    };
  if (n.includes("pvc") || n.includes("plastic"))
    return {
      color: "#E6F2FF",
      metalness: 0.1,
      roughness: 0.9,
      envMapIntensity: 0.3,
      name: "PVC/Plastic",
    };
  return { ...pipeOuterMat, name: "Carbon Steel" };
};

export const isValidNumber = (value: number): boolean => {
  return isNumber(value) && !Number.isNaN(value) && Number.isFinite(value) && value > 0;
};
