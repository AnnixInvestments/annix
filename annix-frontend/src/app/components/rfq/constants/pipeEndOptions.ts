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
  { value: 'LF_BE', label: 'L/F Both Ends - Loose flanges both ends (2 x tack weld)', weldCount: 0, tackWeldEnds: 2 },
  { value: 'FOE_RF', label: 'FOE + R/F - Flanged one end + rotating flange (2 flange welds)', weldCount: 2 },
  { value: '2X_RF', label: '2 x R/F - Rotating flanges both ends (2 flange welds)', weldCount: 2 },
] as const;

export type FlangeType = 'fixed' | 'loose' | 'rotating' | null;

export const FITTING_END_OPTIONS = [
  { value: 'PE', label: 'PE - Plain ended (0 welds)', weldCount: 0, hasInlet: false, hasOutlet: false, hasBranch: false, inletType: null as FlangeType, outletType: null as FlangeType, branchType: null as FlangeType },
  { value: 'FAE', label: 'FAE - Flanged All Ends (3 welds)', weldCount: 3, hasInlet: true, hasOutlet: true, hasBranch: true, inletType: 'fixed' as FlangeType, outletType: 'fixed' as FlangeType, branchType: 'fixed' as FlangeType },
  { value: 'F2E', label: 'F2E - Flanged 2 ends (2 welds) - Main pipe flanged, Tee OE', weldCount: 2, hasInlet: true, hasOutlet: true, hasBranch: false, inletType: 'fixed' as FlangeType, outletType: 'fixed' as FlangeType, branchType: null as FlangeType },
  { value: 'F2E_LF', label: 'F2E + L/F - Flanged 2 ends + L/F on Section A, Tee flanged (2 welds + tack)', weldCount: 2, hasInlet: true, hasOutlet: true, hasBranch: true, inletType: 'loose' as FlangeType, outletType: 'fixed' as FlangeType, branchType: 'fixed' as FlangeType },
  { value: 'F2E_RF', label: 'F2E + R/F - Flanged 2 ends + R/F on Tee Section B (3 welds)', weldCount: 3, hasInlet: true, hasOutlet: true, hasBranch: true, inletType: 'fixed' as FlangeType, outletType: 'fixed' as FlangeType, branchType: 'rotating' as FlangeType },
  { value: '3X_RF', label: '3 x R/F - Rotating flanges all 3 ends (3 welds)', weldCount: 3, hasInlet: true, hasOutlet: true, hasBranch: true, inletType: 'rotating' as FlangeType, outletType: 'rotating' as FlangeType, branchType: 'rotating' as FlangeType },
  { value: '2X_RF_FOE', label: '2 x R/F + FOE - R/F main pipe, FOE on Tee Section B (3 welds)', weldCount: 3, hasInlet: true, hasOutlet: true, hasBranch: true, inletType: 'rotating' as FlangeType, outletType: 'rotating' as FlangeType, branchType: 'fixed' as FlangeType },
] as const;

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
  if (config) {
    return {
      hasInlet: config.hasInlet,
      hasOutlet: config.hasOutlet,
      hasBranch: config.hasBranch,
      inletType: config.inletType,
      outletType: config.outletType,
      branchType: config.branchType,
    };
  }
  return { hasInlet: false, hasOutlet: false, hasBranch: false, inletType: null, outletType: null, branchType: null };
};

export const hasLooseFlange = (endConfig: string): boolean => {
  return endConfig.includes('LF');
};

export const fixedFlangeCount = (endConfig: string): { count: number; positions: { inlet: boolean; outlet: boolean; branch: boolean } } => {
  const positions = { inlet: false, outlet: false, branch: false };
  let count = 0;

  if (endConfig === 'PE') {
    return { count: 0, positions };
  }
  if (endConfig === 'FAE') {
    return { count: 3, positions: { inlet: true, outlet: true, branch: true } };
  }
  if (endConfig === 'F2E') {
    return { count: 2, positions: { inlet: true, outlet: true, branch: false } };
  }
  if (endConfig === 'F2E_LF') {
    return { count: 2, positions: { inlet: false, outlet: true, branch: true } };
  }
  if (endConfig === 'F2E_RF') {
    return { count: 2, positions: { inlet: true, outlet: true, branch: false } };
  }
  if (endConfig === '3X_RF') {
    return { count: 0, positions };
  }
  if (endConfig === '2X_RF_FOE') {
    return { count: 1, positions: { inlet: false, outlet: false, branch: true } };
  }
  if (endConfig === 'FOE' || endConfig === 'FOE_LF') {
    return { count: 1, positions: { inlet: true, outlet: false, branch: false } };
  }
  if (endConfig === 'FBE' || endConfig === '2X_RF') {
    return { count: 2, positions: { inlet: true, outlet: true, branch: false } };
  }
  if (endConfig === 'FOE_RF') {
    return { count: 1, positions: { inlet: true, outlet: false, branch: false } };
  }

  return { count, positions };
};

export const weldCountPerPipe = (pipeEndConfig: string): number => {
  const config = PIPE_END_OPTIONS.find(opt => opt.value === pipeEndConfig);
  return config?.weldCount ?? 0;
};

export const flangesPerPipe = (pipeEndConfig: string): number => {
  switch (pipeEndConfig) {
    case 'PE': return 0;
    case 'FOE':
    case 'FOE_LF':
    case 'FOE_RF':
      return 1;
    case 'FBE':
    case '2X_RF':
      return 2;
    default: return 0;
  }
};

export const physicalFlangeCount = (pipeEndConfig: string): number => {
  switch (pipeEndConfig) {
    case 'PE': return 0;
    case 'FOE': return 1;
    case 'FOE_LF': return 2;
    case 'FOE_RF': return 2;
    case 'FBE': return 2;
    case '2X_RF': return 2;
    default: return 0;
  }
};
