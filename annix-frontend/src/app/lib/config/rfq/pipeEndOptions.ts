export const PIPE_END_OPTIONS = [
  { value: 'PE', label: 'PE - Plain ended (0 welds)', weldCount: 0 },
  { value: 'FOE', label: 'FOE - Flanged one end (1 weld)', weldCount: 1 },
  { value: 'FBE', label: 'FBE - Flanged both ends (2 flange welds)', weldCount: 2 },
  { value: 'FOE_LF', label: 'FOE + L/F - Flanged one end + loose flange (1 flange weld)', weldCount: 1 },
  { value: 'FOE_RF', label: 'FOE + R/F - Flanged one end + rotating flange (2 flange welds)', weldCount: 2 },
  { value: '2X_RF', label: '2 x R/F - Rotating flanges both ends (2 flange welds)', weldCount: 2 },
] as const;

export const BEND_END_OPTIONS = [
  { value: 'PE', label: 'PE - Plain ended (0 welds)', weldCount: 0 },
  { value: 'FOE', label: 'FOE - Flanged one end (1 weld)', weldCount: 1 },
  { value: 'FBE', label: 'FBE - Flanged both ends (2 flange welds)', weldCount: 2 },
  { value: 'FOE_LF', label: 'FOE + L/F - Flanged one end + loose flange (1 flange weld)', weldCount: 1 },
  { value: '2xLF', label: 'L/F Both Ends - Loose flanges both ends (2 x tack weld)', weldCount: 0, tackWeldEnds: 2 },
  { value: 'FOE_RF', label: 'FOE + R/F - Flanged one end + rotating flange (2 flange welds)', weldCount: 2 },
  { value: '2X_RF', label: '2 x R/F - Rotating flanges both ends (2 flange welds)', weldCount: 2 },
] as const;

export const FITTING_END_OPTIONS = [
  { value: 'PE', label: 'PE - Plain ended (0 welds)', weldCount: 0, hasInlet: false, hasOutlet: false, hasBranch: false, inletType: null, outletType: null, branchType: null },
  { value: 'FAE', label: 'FAE - Flanged All Ends (3 welds)', weldCount: 3, hasInlet: true, hasOutlet: true, hasBranch: true, inletType: 'fixed', outletType: 'fixed', branchType: 'fixed' },
  { value: 'F2E', label: 'F2E - Flanged 2 ends (2 welds) - Main pipe flanged, Tee OE', weldCount: 2, hasInlet: true, hasOutlet: true, hasBranch: false, inletType: 'fixed', outletType: 'fixed', branchType: null },
  { value: 'F2E_LF', label: 'F2E + L/F - Flanged 2 ends + L/F on Section A, Tee flanged (2 welds + tack)', weldCount: 2, hasInlet: true, hasOutlet: true, hasBranch: true, inletType: 'loose', outletType: 'fixed', branchType: 'fixed' },
  { value: 'F2E_RF', label: 'F2E + R/F - Flanged 2 ends + R/F on Tee Section B (3 welds)', weldCount: 3, hasInlet: true, hasOutlet: true, hasBranch: true, inletType: 'fixed', outletType: 'fixed', branchType: 'rotating' },
  { value: '3X_RF', label: '3 x R/F - Rotating flanges all 3 ends (3 welds)', weldCount: 3, hasInlet: true, hasOutlet: true, hasBranch: true, inletType: 'rotating', outletType: 'rotating', branchType: 'rotating' },
  { value: '2X_RF_FOE', label: '2 x R/F + FOE - R/F main pipe, FOE on Tee Section B (3 welds)', weldCount: 3, hasInlet: true, hasOutlet: true, hasBranch: true, inletType: 'rotating', outletType: 'rotating', branchType: 'fixed' },
] as const;

export type FlangeType = 'fixed' | 'loose' | 'rotating' | null;

export const weldCountPerBend = (bendEndConfig: string): number => {
  const config = BEND_END_OPTIONS.find(opt => opt.value === bendEndConfig);
  return config?.weldCount ?? 0;
};

export const weldCountPerFitting = (fittingEndConfig: string): number => {
  const config = FITTING_END_OPTIONS.find(opt => opt.value === fittingEndConfig);
  return config?.weldCount ?? 0;
};

export const fittingFlangeConfig = (fittingEndConfig: string): {
  hasInlet: boolean;
  hasOutlet: boolean;
  hasBranch: boolean;
  inletType: FlangeType;
  outletType: FlangeType;
  branchType: FlangeType;
} => {
  const config = FITTING_END_OPTIONS.find(opt => opt.value === fittingEndConfig);
  return {
    hasInlet: config?.hasInlet ?? false,
    hasOutlet: config?.hasOutlet ?? false,
    hasBranch: config?.hasBranch ?? false,
    inletType: (config?.inletType as FlangeType) ?? null,
    outletType: (config?.outletType as FlangeType) ?? null,
    branchType: (config?.branchType as FlangeType) ?? null,
  };
};

export const hasLooseFlange = (endConfig: string): boolean => {
  return endConfig.includes('_LF') || endConfig.includes('FOE_LF') || endConfig === '2xLF';
};

export const fixedFlangeCount = (endConfig: string): { count: number; positions: { inlet: boolean; outlet: boolean; branch: boolean } } => {
  const fittingConfig = FITTING_END_OPTIONS.find(opt => opt.value === endConfig);
  if (fittingConfig) {
    const positions = {
      inlet: fittingConfig.inletType === 'fixed',
      outlet: fittingConfig.outletType === 'fixed',
      branch: fittingConfig.branchType === 'fixed'
    };
    const count = (positions.inlet ? 1 : 0) + (positions.outlet ? 1 : 0) + (positions.branch ? 1 : 0);
    return { count, positions };
  }

  const pipeConfig = PIPE_END_OPTIONS.find(opt => opt.value === endConfig) ||
                     BEND_END_OPTIONS.find(opt => opt.value === endConfig);
  if (pipeConfig) {
    switch (endConfig) {
      case 'FOE':
        return { count: 1, positions: { inlet: false, outlet: true, branch: false } };
      case 'FBE':
        return { count: 2, positions: { inlet: true, outlet: true, branch: false } };
      case 'FOE_LF':
        return { count: 1, positions: { inlet: false, outlet: true, branch: false } };
      case 'FOE_RF':
        return { count: 1, positions: { inlet: false, outlet: true, branch: false } };
      case '2X_RF':
        return { count: 0, positions: { inlet: false, outlet: false, branch: false } };
      case '2xLF':
        return { count: 0, positions: { inlet: false, outlet: false, branch: false } };
      default:
        return { count: 0, positions: { inlet: false, outlet: false, branch: false } };
    }
  }

  return { count: 0, positions: { inlet: false, outlet: false, branch: false } };
};

export const weldCountPerPipe = (pipeEndConfig: string): number => {
  const config = PIPE_END_OPTIONS.find(opt => opt.value === pipeEndConfig);
  return config?.weldCount ?? 0;
};

/**
 * Returns the number of flanged connections at pipe ends.
 * This represents how many flanged openings/joints exist, NOT the number of physical pieces.
 *
 * Use this for: weld calculations, joint counts, connection specifications
 *
 * Example: 2xLF (loose flange both ends) = 2 connections (one at each end)
 */
export const flangesPerPipe = (pipeEndConfig: string): number => {
  switch (pipeEndConfig) {
    case 'PE':
      return 0;
    case 'FOE':
      return 1;
    case 'FBE':
      return 2;
    case 'FOE_LF':
      return 2;
    case 'FOE_RF':
      return 2;
    case '2X_RF':
      return 2;
    case '2xLF':
      return 2;
    default:
      return 0;
  }
};

/**
 * Returns the total number of physical flange pieces needed.
 * This accounts for assemblies that require multiple pieces per connection.
 *
 * Use this for: weight calculations, material ordering, BOM generation
 *
 * Key difference from flangesPerPipe:
 * - 2xLF (loose flange both ends) = 4 pieces (2 plate flanges + 2 backing rings)
 * - FOE_RF (fixed + rotating) = 2 pieces (1 fixed flange + 1 backing ring)
 *
 * Note: For rotating flanges (RF), the backing ring is counted but the loose
 * plate flange weight is calculated separately as it's a standard catalog item.
 */
export const physicalFlangeCount = (pipeEndConfig: string): number => {
  switch (pipeEndConfig) {
    case 'PE':
      return 0;
    case 'FOE':
      return 1;
    case 'FBE':
      return 2;
    case 'FOE_LF':
      return 2;
    case 'FOE_RF':
      return 2;
    case '2X_RF':
      return 2;
    case '2xLF':
      return 4;
    default:
      return 0;
  }
};

// Bolt set count for bends - total flanged openings minus 1
// A bend has 2 openings, so FBE = 2-1 = 1 bolt set
// FOE has 1 flanged opening = 1 bolt set (minimum when flanged)
// Additional stubs = extra bolt sets (handled separately)
export const boltSetCountPerBend = (bendEndConfig: string): number => {
  switch (bendEndConfig) {
    case 'PE':
      return 0;
    case 'FOE':
      return 1;
    case 'FBE':
      return 1;
    case 'FOE_LF':
      return 1;
    case 'FOE_RF':
      return 1;
    case '2X_RF':
      return 1;
    case '2xLF':
      return 1;
    default:
      return 0;
  }
};

// Bolt set count for pipes - total flanged openings minus 1
// A pipe has 2 openings, so FBE = 2-1 = 1 bolt set
// FOE has 1 flanged opening = 1 bolt set (minimum when flanged)
export const boltSetCountPerPipe = (pipeEndConfig: string): number => {
  switch (pipeEndConfig) {
    case 'PE':
      return 0;
    case 'FOE':
      return 1;
    case 'FBE':
      return 1;
    case 'FOE_LF':
      return 1;
    case 'FOE_RF':
      return 1;
    case '2X_RF':
      return 1;
    case '2xLF':
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
  if (!flangeSpec || flangeSpec === 'PE' || flangeSpec === '') return 'OE';
  if (flangeSpec === '2xLF' || flangeSpec.toLowerCase().includes('lf')) return 'L/F';
  if (flangeSpec === '2X_RF' || flangeSpec.toLowerCase().includes('rf')) return 'R/F';
  if (flangeSpec === 'FBE' || flangeSpec === 'FOE') return 'S/O';
  return flangeSpec;
};

export const formatCombinedEndConfig = (
  mainEndConfig: string,
  stubs: StubFlangeConfig[]
): string => {
  if (!stubs || stubs.length === 0) {
    return mainEndConfig;
  }

  const flangedStubs = stubs.filter(s => s.flangeSpec && s.flangeSpec !== 'PE' && s.flangeSpec !== '');

  if (flangedStubs.length === 0) {
    return mainEndConfig;
  }

  const stubCodes = flangedStubs.map(s => {
    const code = formatStubFlangeCode(s.flangeSpec);
    return `${s.nominalBoreMm}NB ${code}`;
  });

  return `${mainEndConfig} + ${stubCodes.join(' + ')}`;
};

export const formatEndConfigForDescription = (
  mainEndConfig: string,
  stubs: StubFlangeConfig[]
): string => {
  const mainLabel = BEND_END_OPTIONS.find(o => o.value === mainEndConfig)?.label?.split(' - ')[0] ||
                    PIPE_END_OPTIONS.find(o => o.value === mainEndConfig)?.label?.split(' - ')[0] ||
                    mainEndConfig;

  if (!stubs || stubs.length === 0) {
    return mainLabel;
  }

  const flangedStubs = stubs.filter(s => s.flangeSpec && s.flangeSpec !== 'PE' && s.flangeSpec !== '');

  if (flangedStubs.length === 0) {
    return mainLabel;
  }

  const stubDescriptions = flangedStubs.map(s => {
    const code = formatStubFlangeCode(s.flangeSpec);
    return `${s.nominalBoreMm}NB Stub ${code}`;
  });

  return `${mainLabel} + ${stubDescriptions.join(' + ')}`;
};

// Bolt set count for fittings (tees/laterals) - total flanged openings minus 1
// Equal tee has 3 openings, so FAE = 3-1 = 2 bolt sets
// F2E (2 flanged ends) = 2-1 = 1 bolt set
export const boltSetCountPerFitting = (fittingEndConfig: string, hasEqualBranch: boolean = true): { mainBoltSets: number; branchBoltSets: number } => {
  const config = FITTING_END_OPTIONS.find(opt => opt.value === fittingEndConfig);
  if (!config) return { mainBoltSets: 0, branchBoltSets: 0 };

  // Count flanged main ends (inlet + outlet)
  const mainFlangeCount = (config.hasInlet ? 1 : 0) + (config.hasOutlet ? 1 : 0);
  // Count branch flanges
  const branchFlangeCount = config.hasBranch ? 1 : 0;

  if (hasEqualBranch) {
    // All ends same size: total openings - 1
    const totalFlangedEnds = mainFlangeCount + branchFlangeCount;
    const totalBoltSets = totalFlangedEnds > 1 ? totalFlangedEnds - 1 : totalFlangedEnds;
    return { mainBoltSets: totalBoltSets, branchBoltSets: 0 };
  }

  // Different branch size: main run has 2 openings = 1 bolt set, branch has 1 opening = 1 bolt set
  const mainBoltSets = mainFlangeCount > 1 ? mainFlangeCount - 1 : mainFlangeCount;
  return { mainBoltSets, branchBoltSets: branchFlangeCount };
};

export const recommendedFlangeTypeCode = (endConfig: string): string => {
  const configUpper = endConfig.toUpperCase();

  if (configUpper.includes('RF') || configUpper.includes('R/F') || configUpper === '2X_RF' || configUpper === '3X_RF') {
    return '/1';
  }

  if (configUpper.includes('LF') || configUpper.includes('L/F') || configUpper === '2XLF') {
    return '/3';
  }

  if (configUpper === 'PE') {
    return '/3';
  }

  return '/2';
};

export const recommendedPressureClassId = (
  workingPressureBar: number,
  availableClasses: Array<{ id: number; designation: string; flangeStandardId?: number }>,
  flangeStandardCode?: string
): number | null => {
  if (!workingPressureBar || availableClasses.length === 0) {
    return null;
  }

  const isSabs1123 = flangeStandardCode?.toUpperCase().includes('SABS') && flangeStandardCode?.includes('1123') ||
                     flangeStandardCode?.toUpperCase().includes('SANS') && flangeStandardCode?.includes('1123');
  const isBs4504 = flangeStandardCode?.includes('BS') && flangeStandardCode?.includes('4504');

  const classesWithRating = availableClasses.map((pc) => {
    const designation = pc.designation || '';
    let barRating = 0;

    const pnMatch = designation.match(/PN\s*(\d+)/i);
    if (pnMatch) {
      barRating = parseInt(pnMatch[1]);
    } else if (isSabs1123) {
      const kpaMatch = designation.match(/^(\d+)/);
      if (kpaMatch) {
        barRating = parseInt(kpaMatch[1]) / 100;
      }
    } else if (isBs4504) {
      const numMatch = designation.match(/^(\d+)/);
      if (numMatch) {
        barRating = parseInt(numMatch[1]);
      }
    } else {
      const numMatch = designation.match(/^(\d+)/);
      if (numMatch) {
        const num = parseInt(numMatch[1]);
        barRating = num >= 500 ? num / 100 : num;
      }
    }

    return { ...pc, barRating };
  }).filter((pc) => pc.barRating > 0);

  classesWithRating.sort((a, b) => a.barRating - b.barRating);

  const suitableClass = classesWithRating.find((pc) => pc.barRating >= workingPressureBar);

  return suitableClass?.id || null;
};

export const hasRotatingFlange = (endConfig: string): boolean => {
  const configUpper = endConfig.toUpperCase();
  return configUpper.includes('RF') || configUpper.includes('R/F') || configUpper === '2X_RF' || configUpper === '3X_RF';
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
  allPressureClasses: PressureClass[]
): PressureClass[] => {
  if (!flangeStandardId) {
    return [];
  }

  let classes = pressureClassesByStandard[flangeStandardId] || [];

  if (classes.length === 0) {
    classes = allPressureClasses.filter((pc) =>
      pc.flangeStandardId === flangeStandardId || pc.standardId === flangeStandardId
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
  currentPressureClassId?: number
): number | null => {
  if (!workingPressureBar || workingPressureBar <= 0) {
    return currentPressureClassId || null;
  }

  const classes = availablePressureClasses(flangeStandardId, pressureClassesByStandard, allPressureClasses);

  if (classes.length === 0) {
    return currentPressureClassId || null;
  }

  return recommendedPressureClassId(workingPressureBar, classes, flangeStandardCode) || currentPressureClassId || null;
};
