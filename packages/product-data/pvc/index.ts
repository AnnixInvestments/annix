// Re-export the per-concept modules for parity with the HDPE
// module's barrel layout. Pipe dimensions / pressure classes /
// joining methods live below in this file (legacy single-file
// shape); new functionality is split into its own file under
// `packages/product-data/pvc/*.ts`.

export {
  isPvcClassValidForGrade,
  PVC_PRESSURE_CLASS_LIST,
  PVC_PRESSURE_CLASSES,
  type PvcClassInfo,
  type PvcPressureClass,
  type PvcPressureClass as PvcSansPressureClass,
  recommendedPvcClassForPressure,
  validPvcPressureClassesForGrade,
} from "./classes";
export {
  PVC_COUPLING_DIMENSIONS,
  type PvcCouplingDimension,
  type PvcCouplingFamily,
  pvcCouplingDimension,
  pvcCouplingSource,
} from "./coupling-dimensions";
export {
  PVC_CATALOGUE_DNS,
  type PvcPipeDimensions,
  pipeDimensions as pvcPipeDimensions,
  pvcAvailableSizes,
  pvcOutsideDiameter,
} from "./dimensions";
export {
  PVC_ELBOW_DIMENSIONS,
  type PvcElbowAngle,
  type PvcElbowDimension,
  pvcElbowDimension,
  pvcElbowSource,
} from "./elbow-dimensions";
export {
  PVC_END_CAP_DIMENSIONS,
  type PvcEndCapDimension,
  pvcEndCapLength,
  pvcEndCapSource,
} from "./end-cap-dimensions";
export {
  PVC_FLANGE_ADAPTER_DIMENSIONS,
  type PvcFlangeAdapterDimension,
  pvcFlangeAdapterDimension,
  pvcFlangeAdapterSource,
} from "./flange-adapter-dimensions";
export {
  PVC_GRADE_LIST,
  PVC_GRADES,
  type PvcApplication,
  type PvcGrade,
  type PvcGradeCode,
  pvcGradeByCode,
  pvcGradesByApplication,
  pvcSafetyFactor,
} from "./grades";
export {
  defaultPvcJoiningMethod,
  PVC_JOINING_METHOD_LIST,
  PVC_JOINING_METHODS,
  type PvcJoiningMethod as PvcJoiningMethodCode,
  type PvcJoiningMethodInfo,
  pvcJoiningMethodByCode,
  suitablePvcJoiningMethods,
} from "./joining-methods";
export {
  calculatePvcJointCount,
  DEFAULT_PVC_PRESSURE_CLASS,
  PVC_COILS_AVAILABLE,
  PVC_STANDARD_PIPE_LENGTHS,
  type PvcJointCountResult,
  type PvcPipeLengthInfo,
  type StandardPvcPipeLength,
  standardPvcPipeLengthForDn,
} from "./pricing";
export {
  PVC_REDUCER_DIMENSIONS,
  type PvcReducerDimension,
  pvcReducerDimension,
  pvcReducerSource,
} from "./reducer-dimensions";
export {
  PVC_SADDLE_DIMENSIONS,
  type PvcSaddleDimension,
  type PvcSaddleOutletType,
  pvcSaddleDimension,
  pvcSaddleSource,
} from "./saddle-dimensions";
export {
  PVC_CATALOGUE_SOURCES,
  type PvcCatalogueSource,
  pvcCatalogueSource,
} from "./sources";
export {
  PVC_TEE_DIMENSIONS,
  type PvcTeeDimension,
  pvcTeeDimension,
  pvcTeeSource,
} from "./tee-dimensions";
export {
  type PvcDeratingPoint,
  pvcDeratedWorkingPressure,
  pvcDeratingFactor,
} from "./temperature-derating";
export { PVC_WALL_THICKNESS_DATA, type PvcWallThickness } from "./wall-thickness-data";

import type { PvcPressureClass } from "./classes";
import { PVC_WALL_THICKNESS_DATA } from "./wall-thickness-data";

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

export interface PvcPressureOption {
  value: PvcPressureClass;
  label: string;
  description: string;
}

export const PVC_PRESSURE_OPTIONS: PvcPressureOption[] = [
  { value: 6, label: "Class 6 (6 bar)", description: "Low pressure drainage and sewer" },
  { value: 9, label: "Class 9 (9 bar)", description: "Light-duty pressure applications" },
  { value: 12, label: "Class 12 (12 bar)", description: "Standard pressure water supply" },
  { value: 16, label: "Class 16 (16 bar)", description: "High pressure water mains" },
  { value: 20, label: "Class 20 (20 bar)", description: "Heavy-duty industrial applications" },
  { value: 25, label: "Class 25 (25 bar)", description: "Extra heavy-duty pressure service" },
  { value: 34, label: "Class 34 (34 bar)", description: "Very high pressure mining applications" },
  { value: 40, label: "Class 40 (40 bar)", description: "Maximum pressure rating" },
];

export const pvcWallThickness = (
  outsideDiameterMm: number,
  pressureClass: PvcPressureClass,
): number | null => {
  const sizeData = PVC_WALL_THICKNESS_DATA.find((d) => d.outsideDiameterMm === outsideDiameterMm);
  return sizeData?.wallThicknessByClass[pressureClass] || null;
};

export const availablePressureClassesForSize = (outsideDiameterMm: number): PvcPressureClass[] => {
  const sizeData = PVC_WALL_THICKNESS_DATA.find((d) => d.outsideDiameterMm === outsideDiameterMm);
  if (!sizeData) return [];
  return Object.keys(sizeData.wallThicknessByClass).map((k) => parseInt(k, 10) as PvcPressureClass);
};

export const recommendedPressureClassForPressure = (pressureBar: number): PvcPressureClass => {
  const sortedClasses = [...PVC_PRESSURE_OPTIONS].sort((a, b) => a.value - b.value);
  const suitable = sortedClasses.find((c) => c.value >= pressureBar);
  return suitable?.value || 16;
};

export const PVC_NOMINAL_SIZES = PVC_WALL_THICKNESS_DATA.map((d) => d.nominalBoreMm);

export type PvcJoiningMethod = "solvent_cement" | "rubber_ring" | "threaded" | "flanged_adaptor";

export interface PvcJoiningOption {
  value: PvcJoiningMethod;
  label: string;
  description: string;
  requiresEquipment: boolean;
  suitableForSizes: { min: number; max: number };
}

export const PVC_JOINING_OPTIONS: PvcJoiningOption[] = [
  {
    value: "solvent_cement",
    label: "Solvent Cement",
    description: "Chemical welding using PVC solvent cement",
    requiresEquipment: false,
    suitableForSizes: { min: 20, max: 400 },
  },
  {
    value: "rubber_ring",
    label: "Rubber Ring Joint",
    description: "Push-fit connection with rubber seal ring",
    requiresEquipment: false,
    suitableForSizes: { min: 50, max: 630 },
  },
  {
    value: "threaded",
    label: "Threaded Connection",
    description: "BSP or NPT threaded connections",
    requiresEquipment: true,
    suitableForSizes: { min: 15, max: 100 },
  },
  {
    value: "flanged_adaptor",
    label: "Flanged Adaptor",
    description: "PVC flange stub with steel backing ring",
    requiresEquipment: false,
    suitableForSizes: { min: 50, max: 400 },
  },
];

export interface PvcPipeEndOption {
  value: string;
  label: string;
  joiningMethod: PvcJoiningMethod | null;
  description: string;
}

export const PVC_PIPE_END_OPTIONS: PvcPipeEndOption[] = [
  {
    value: "PE",
    label: "Plain End (Spigot)",
    joiningMethod: null,
    description: "Standard spigot end for socket connection",
  },
  {
    value: "SOCKET",
    label: "Socket End",
    joiningMethod: "solvent_cement",
    description: "Female socket for solvent cement jointing",
  },
  {
    value: "RRJ",
    label: "Rubber Ring Joint Socket",
    joiningMethod: "rubber_ring",
    description: "Socket with rubber ring groove",
  },
  {
    value: "THREADED",
    label: "Threaded End",
    joiningMethod: "threaded",
    description: "BSP or NPT threaded connection",
  },
  {
    value: "FLANGE",
    label: "Flanged End",
    joiningMethod: "flanged_adaptor",
    description: "PVC stub with backing flange",
  },
];

export const PVC_BEND_END_OPTIONS: PvcPipeEndOption[] = [
  {
    value: "SS",
    label: "Socket x Socket",
    joiningMethod: "solvent_cement",
    description: "Sockets both ends for solvent cement",
  },
  {
    value: "SP",
    label: "Socket x Spigot",
    joiningMethod: "solvent_cement",
    description: "Socket one end, spigot other",
  },
  {
    value: "RRJ_BOTH",
    label: "Rubber Ring Both Ends",
    joiningMethod: "rubber_ring",
    description: "Rubber ring sockets both ends",
  },
  {
    value: "FLANGE_BOTH",
    label: "Flanged Both Ends",
    joiningMethod: "flanged_adaptor",
    description: "Flanged adaptors both ends",
  },
];

export const PVC_FITTING_END_OPTIONS: PvcPipeEndOption[] = [
  {
    value: "SS",
    label: "Socket All Ports",
    joiningMethod: "solvent_cement",
    description: "Solvent cement sockets on all ports",
  },
  {
    value: "RRJ_ALL",
    label: "Rubber Ring All Ports",
    joiningMethod: "rubber_ring",
    description: "Rubber ring joints on all ports",
  },
  {
    value: "FLANGE_ALL",
    label: "Flanged All Ports",
    joiningMethod: "flanged_adaptor",
    description: "Flanged connections on all ports",
  },
  {
    value: "THREADED_ALL",
    label: "Threaded All Ports",
    joiningMethod: "threaded",
    description: "Threaded connections on all ports",
  },
];

export const pvcJoiningOptionByValue = (value: PvcJoiningMethod): PvcJoiningOption | null =>
  PVC_JOINING_OPTIONS.find((o) => o.value === value) ?? null;

export const suitablePvcJoiningMethodsForSize = (outsideDiameterMm: number): PvcJoiningOption[] =>
  PVC_JOINING_OPTIONS.filter(
    (opt) =>
      outsideDiameterMm >= opt.suitableForSizes.min &&
      outsideDiameterMm <= opt.suitableForSizes.max,
  );
