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
  return endConfig.includes('_LF') || endConfig.includes('FOE_LF') || endConfig === 'LF_BE';
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
      case 'LF_BE':
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

export const flangesPerPipe = (pipeEndConfig: string): number => {
  switch (pipeEndConfig) {
    case 'PE':
      return 0;
    case 'FOE':
      return 1;
    case 'FBE':
      return 2;
    case 'FOE_LF':
      return 1;
    case 'FOE_RF':
      return 1;
    case '2X_RF':
      return 2;
    case 'LF_BE':
      return 2;
    default:
      return 0;
  }
};

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
    case 'LF_BE':
      return 4;
    default:
      return 0;
  }
};
