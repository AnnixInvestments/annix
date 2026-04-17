import type { FlangeType } from "@annix/product-data/pipe";
import {
  BEND_END_OPTIONS,
  FITTING_END_OPTIONS,
  PIPE_END_OPTIONS,
  REDUCER_END_OPTIONS,
} from "@annix/product-data/pipe";

export type {
  BendEndOption,
  FittingEndOption,
  FlangeType,
  PipeEndOption,
  ReducerEndOption,
} from "@annix/product-data/pipe";
export { BEND_END_OPTIONS, FITTING_END_OPTIONS, PIPE_END_OPTIONS, REDUCER_END_OPTIONS };

export const weldCountPerBend = (bendEndConfig: string): number => {
  const config = BEND_END_OPTIONS.find((opt) => opt.value === bendEndConfig);
  const rawWeldCount = config?.weldCount;
  return rawWeldCount || 0;
};

export const flangeWeldCountPerBend = (bendEndConfig: string): number => {
  const config = BEND_END_OPTIONS.find((opt) => opt.value === bendEndConfig);
  const rawFlangeWeldCount = config?.flangeWeldCount;
  return rawFlangeWeldCount || 0;
};

export const flangeCountPerBend = (bendEndConfig: string): number => {
  const config = BEND_END_OPTIONS.find((opt) => opt.value === bendEndConfig);
  const rawFlangeCount = config?.flangeCount;
  return rawFlangeCount || 0;
};

export const tackWeldEndsPerBend = (bendEndConfig: string): number => {
  const config = BEND_END_OPTIONS.find((opt) => opt.value === bendEndConfig);
  const rawTackWeldEnds = config?.tackWeldEnds;
  return rawTackWeldEnds || 0;
};

export const weldCountPerFitting = (fittingEndConfig: string): number => {
  const config =
    FITTING_END_OPTIONS.find((opt) => opt.value === fittingEndConfig) ||
    REDUCER_END_OPTIONS.find((opt) => opt.value === fittingEndConfig);
  const rawWeldCount2 = config?.weldCount;
  return rawWeldCount2 || 0;
};

export const flangeWeldCountPerFitting = (fittingEndConfig: string): number => {
  const config =
    FITTING_END_OPTIONS.find((opt) => opt.value === fittingEndConfig) ||
    REDUCER_END_OPTIONS.find((opt) => opt.value === fittingEndConfig);
  const rawFlangeWeldCount2 = config?.flangeWeldCount;
  return rawFlangeWeldCount2 || 0;
};

export const flangeCountPerFitting = (fittingEndConfig: string): number => {
  const config =
    FITTING_END_OPTIONS.find((opt) => opt.value === fittingEndConfig) ||
    REDUCER_END_OPTIONS.find((opt) => opt.value === fittingEndConfig);
  const rawFlangeCount2 = config?.flangeCount;
  return rawFlangeCount2 || 0;
};

export const tackWeldEndsPerFitting = (fittingEndConfig: string): number => {
  const config =
    FITTING_END_OPTIONS.find((opt) => opt.value === fittingEndConfig) ||
    REDUCER_END_OPTIONS.find((opt) => opt.value === fittingEndConfig);
  const rawTackWeldEnds2 = config?.tackWeldEnds;
  return rawTackWeldEnds2 || 0;
};

export const flangeWeldCountPerPipe = (pipeEndConfig: string): number => {
  const config = PIPE_END_OPTIONS.find((opt) => opt.value === pipeEndConfig);
  const rawFlangeWeldCount3 = config?.flangeWeldCount;
  return rawFlangeWeldCount3 || 0;
};

export const flangeCountPerPipe = (pipeEndConfig: string): number => {
  const config = PIPE_END_OPTIONS.find((opt) => opt.value === pipeEndConfig);
  const rawFlangeCount3 = config?.flangeCount;
  return rawFlangeCount3 || 0;
};

export const tackWeldEndsPerPipe = (pipeEndConfig: string): number => {
  const config = PIPE_END_OPTIONS.find((opt) => opt.value === pipeEndConfig);
  const rawTackWeldEnds3 = config?.tackWeldEnds;
  return rawTackWeldEnds3 || 0;
};

export const fittingFlangeConfig = (
  fittingEndConfig: string,
  foePosition?: "inlet" | "outlet" | "branch",
): {
  hasInlet: boolean;
  hasOutlet: boolean;
  hasBranch: boolean;
  inletType: FlangeType;
  outletType: FlangeType;
  branchType: FlangeType;
} => {
  const config = FITTING_END_OPTIONS.find((opt) => opt.value === fittingEndConfig);

  if (fittingEndConfig === "2X_LF_FOE" && foePosition) {
    return {
      hasInlet: true,
      hasOutlet: true,
      hasBranch: true,
      inletType: foePosition === "inlet" ? "fixed" : "loose",
      outletType: foePosition === "outlet" ? "fixed" : "loose",
      branchType: foePosition === "branch" ? "fixed" : "loose",
    };
  }

  const rawHasInlet = config?.hasInlet;
  const rawHasOutlet = config?.hasOutlet;
  const rawHasBranch = config?.hasBranch;

  return {
    hasInlet: rawHasInlet || false,
    hasOutlet: rawHasOutlet || false,
    hasBranch: rawHasBranch || false,
    inletType: (config?.inletType as FlangeType) || null,
    outletType: (config?.outletType as FlangeType) || null,
    branchType: (config?.branchType as FlangeType) || null,
  };
};

export const reducerFlangeConfig = (
  reducerEndConfig: string,
): {
  hasLargeEnd: boolean;
  hasSmallEnd: boolean;
} => {
  const config = REDUCER_END_OPTIONS.find((opt) => opt.value === reducerEndConfig);
  const rawHasLargeEnd = config?.hasLargeEnd;
  const rawHasSmallEnd = config?.hasSmallEnd;
  return {
    hasLargeEnd: rawHasLargeEnd || false,
    hasSmallEnd: rawHasSmallEnd || false,
  };
};

export const hasLooseFlange = (endConfig: string): boolean => {
  return endConfig.includes("_LF") || endConfig.includes("FOE_LF") || endConfig === "2xLF";
};

export const fixedFlangeCount = (
  endConfig: string,
): { count: number; positions: { inlet: boolean; outlet: boolean; branch: boolean } } => {
  const fittingConfig = FITTING_END_OPTIONS.find((opt) => opt.value === endConfig);
  if (fittingConfig) {
    const positions = {
      inlet: fittingConfig.inletType === "fixed",
      outlet: fittingConfig.outletType === "fixed",
      branch: fittingConfig.branchType === "fixed",
    };
    const count =
      (positions.inlet ? 1 : 0) + (positions.outlet ? 1 : 0) + (positions.branch ? 1 : 0);
    return { count, positions };
  }

  const pipeConfig =
    PIPE_END_OPTIONS.find((opt) => opt.value === endConfig) ||
    BEND_END_OPTIONS.find((opt) => opt.value === endConfig);
  if (pipeConfig) {
    switch (endConfig) {
      case "FOE":
        return { count: 1, positions: { inlet: false, outlet: true, branch: false } };
      case "FBE":
        return { count: 2, positions: { inlet: true, outlet: true, branch: false } };
      case "FOE_LF":
        return { count: 1, positions: { inlet: false, outlet: true, branch: false } };
      case "FOE_RF":
        return { count: 1, positions: { inlet: false, outlet: true, branch: false } };
      case "2X_RF":
        return { count: 0, positions: { inlet: false, outlet: false, branch: false } };
      case "2xLF":
        return { count: 0, positions: { inlet: false, outlet: false, branch: false } };
      default:
        return { count: 0, positions: { inlet: false, outlet: false, branch: false } };
    }
  }

  return { count: 0, positions: { inlet: false, outlet: false, branch: false } };
};

export const weldCountPerPipe = (pipeEndConfig: string): number => {
  const config = PIPE_END_OPTIONS.find((opt) => opt.value === pipeEndConfig);
  const rawWeldCount3 = config?.weldCount;
  return rawWeldCount3 || 0;
};

export const flangesPerPipe = (pipeEndConfig: string): number => {
  switch (pipeEndConfig) {
    case "PE":
      return 0;
    case "FOE":
      return 1;
    case "FBE":
      return 2;
    case "FOE_LF":
      return 2;
    case "FOE_RF":
      return 2;
    case "2X_RF":
      return 2;
    case "2xLF":
      return 2;
    default:
      return 0;
  }
};

export const physicalFlangeCount = (pipeEndConfig: string): number => {
  switch (pipeEndConfig) {
    case "PE":
      return 0;
    case "FOE":
      return 1;
    case "FBE":
      return 2;
    case "FOE_LF":
      return 2;
    case "FOE_RF":
      return 2;
    case "2X_RF":
      return 2;
    case "2xLF":
      return 4;
    default:
      return 0;
  }
};

export const boltSetCountPerBend = (bendEndConfig: string): number => {
  switch (bendEndConfig) {
    case "PE":
      return 0;
    case "FOE":
      return 1;
    case "FBE":
      return 1;
    case "FOE_LF":
      return 1;
    case "FOE_RF":
      return 1;
    case "2X_RF":
      return 1;
    case "2xLF":
      return 1;
    default:
      return 0;
  }
};

export const boltSetCountPerPipe = (pipeEndConfig: string): number => {
  switch (pipeEndConfig) {
    case "PE":
      return 0;
    case "FOE":
      return 1;
    case "FBE":
      return 1;
    case "FOE_LF":
      return 1;
    case "FOE_RF":
      return 1;
    case "2X_RF":
      return 1;
    case "2xLF":
      return 1;
    default:
      return 0;
  }
};

export interface StubFlangeConfig {
  nominalBoreMm: number;
  flangeSpec: string;
}

export const formatStubFlangeCode = (flangeSpec: string): string => {
  if (!flangeSpec || flangeSpec === "PE" || flangeSpec === "") return "OE";
  if (flangeSpec === "2xLF" || flangeSpec.toLowerCase().includes("lf")) return "L/F";
  if (flangeSpec === "2X_RF" || flangeSpec.toLowerCase().includes("rf")) return "R/F";
  if (flangeSpec === "FBE" || flangeSpec === "FOE") return "S/O";
  return flangeSpec;
};

export const formatCombinedEndConfig = (
  mainEndConfig: string,
  stubs: StubFlangeConfig[],
): string => {
  if (!stubs || stubs.length === 0) {
    return mainEndConfig;
  }

  const flangedStubs = stubs.filter(
    (s) => s.flangeSpec && s.flangeSpec !== "PE" && s.flangeSpec !== "",
  );

  if (flangedStubs.length === 0) {
    return mainEndConfig;
  }

  const stubCodes = flangedStubs.map((s) => {
    const code = formatStubFlangeCode(s.flangeSpec);
    return `${s.nominalBoreMm}NB ${code}`;
  });

  return `${mainEndConfig} + ${stubCodes.join(" + ")}`;
};

export const formatEndConfigForDescription = (
  mainEndConfig: string,
  stubs: StubFlangeConfig[],
): string => {
  const rawItem0 = BEND_END_OPTIONS.find((o) => o.value === mainEndConfig)?.label?.split(" - ")[0];
  const mainLabel =
    rawItem0 ||
    PIPE_END_OPTIONS.find((o) => o.value === mainEndConfig)?.label?.split(" - ")[0] ||
    mainEndConfig;

  if (!stubs || stubs.length === 0) {
    return mainLabel;
  }

  const flangedStubs = stubs.filter(
    (s) => s.flangeSpec && s.flangeSpec !== "PE" && s.flangeSpec !== "",
  );

  if (flangedStubs.length === 0) {
    return mainLabel;
  }

  const stubDescriptions = flangedStubs.map((s) => {
    const code = formatStubFlangeCode(s.flangeSpec);
    return `${s.nominalBoreMm}NB Stub ${code}`;
  });

  return `${mainLabel} + ${stubDescriptions.join(" + ")}`;
};

export const boltSetCountPerFitting = (
  fittingEndConfig: string,
  hasEqualBranch: boolean = true,
): { mainBoltSets: number; branchBoltSets: number } => {
  const config = FITTING_END_OPTIONS.find((opt) => opt.value === fittingEndConfig);
  if (!config) return { mainBoltSets: 0, branchBoltSets: 0 };

  const mainFlangeCount = (config.hasInlet ? 1 : 0) + (config.hasOutlet ? 1 : 0);
  const branchFlangeCount = config.hasBranch ? 1 : 0;

  if (hasEqualBranch) {
    const totalFlangedEnds = mainFlangeCount + branchFlangeCount;
    const totalBoltSets = totalFlangedEnds > 1 ? totalFlangedEnds - 1 : totalFlangedEnds;
    return { mainBoltSets: totalBoltSets, branchBoltSets: 0 };
  }

  const mainBoltSets = mainFlangeCount > 1 ? mainFlangeCount - 1 : mainFlangeCount;
  return { mainBoltSets, branchBoltSets: branchFlangeCount };
};

export const recommendedFlangeTypeCode = (endConfig: string): string => {
  const configUpper = endConfig.toUpperCase();

  if (
    configUpper.includes("RF") ||
    configUpper.includes("R/F") ||
    configUpper === "2X_RF" ||
    configUpper === "3X_RF"
  ) {
    return "/1";
  }

  if (configUpper.includes("LF") || configUpper.includes("L/F") || configUpper === "2XLF") {
    return "/3";
  }

  if (configUpper === "PE") {
    return "/3";
  }

  return "/2";
};

export const recommendedPressureClassId = (
  workingPressureBar: number,
  availableClasses: Array<{ id: number; designation: string; flangeStandardId?: number }>,
  flangeStandardCode?: string,
  flangeTypeCode?: string,
): number | null => {
  if (!workingPressureBar || availableClasses.length === 0) {
    return null;
  }

  const isSabs1123 =
    (flangeStandardCode?.toUpperCase().includes("SABS") && flangeStandardCode?.includes("1123")) ||
    (flangeStandardCode?.toUpperCase().includes("SANS") && flangeStandardCode?.includes("1123"));
  const isBs4504 = flangeStandardCode?.includes("BS") && flangeStandardCode?.includes("4504");

  const filteredClasses =
    flangeTypeCode && (isSabs1123 || isBs4504)
      ? availableClasses.filter((pc) => {
          const rawDesignation = pc.designation;
          const designation = rawDesignation || "";
          return designation.endsWith(`/${flangeTypeCode}`);
        })
      : availableClasses;

  const classesToUse = filteredClasses.length > 0 ? filteredClasses : availableClasses;

  const classesWithRating = classesToUse
    .map((pc) => {
      const rawDesignation2 = pc.designation;
      const designation = rawDesignation2 || "";
      let barRating = 0;

      const pnMatch = designation.match(/PN\s*(\d+)/i);
      if (pnMatch) {
        barRating = parseInt(pnMatch[1], 10);
      } else if (isSabs1123) {
        const kpaMatch = designation.match(/^(\d+)/);
        if (kpaMatch) {
          barRating = parseInt(kpaMatch[1], 10) / 100;
        }
      } else if (isBs4504) {
        const numMatch = designation.match(/^(\d+)/);
        if (numMatch) {
          barRating = parseInt(numMatch[1], 10);
        }
      } else {
        const numMatch = designation.match(/^(\d+)/);
        if (numMatch) {
          const num = parseInt(numMatch[1], 10);
          barRating = num >= 500 ? num / 100 : num;
        }
      }

      return { ...pc, barRating };
    })
    .filter((pc) => pc.barRating > 0);

  const sorted = [...classesWithRating].sort((a, b) => a.barRating - b.barRating);

  const suitableClass = sorted.find((pc) => pc.barRating >= workingPressureBar);

  const rawId = suitableClass?.id;

  return rawId || null;
};

export const hasRotatingFlange = (endConfig: string): boolean => {
  const configUpper = endConfig.toUpperCase();
  return (
    configUpper.includes("RF") ||
    configUpper.includes("R/F") ||
    configUpper === "2X_RF" ||
    configUpper === "3X_RF"
  );
};

export interface PressureClass {
  id: number;
  designation: string;
  flangeStandardId?: number;
  standardId?: number;
}

export const availablePressureClasses = (
  flangeStandardId: number | undefined,
  pressureClassesByStandard: Record<number, PressureClass[]>,
  allPressureClasses: PressureClass[],
): PressureClass[] => {
  if (!flangeStandardId) {
    return [];
  }

  const rawFlangeStandardId = pressureClassesByStandard[flangeStandardId];

  let classes = rawFlangeStandardId || [];

  if (classes.length === 0) {
    classes = allPressureClasses.filter(
      (pc) => pc.flangeStandardId === flangeStandardId || pc.standardId === flangeStandardId,
    );
  }

  return classes;
};

export const selectPressureClassForWorking = (
  workingPressureBar: number,
  flangeStandardId: number | undefined,
  flangeStandardCode: string | undefined,
  pressureClassesByStandard: Record<number, PressureClass[]>,
  allPressureClasses: PressureClass[],
  currentPressureClassId?: number,
  flangeTypeCode?: string,
): number | null => {
  if (!workingPressureBar || workingPressureBar <= 0) {
    return currentPressureClassId || null;
  }

  const classes = availablePressureClasses(
    flangeStandardId,
    pressureClassesByStandard,
    allPressureClasses,
  );

  if (classes.length === 0) {
    return currentPressureClassId || null;
  }

  return (
    recommendedPressureClassId(workingPressureBar, classes, flangeStandardCode, flangeTypeCode) ||
    currentPressureClassId ||
    null
  );
};
