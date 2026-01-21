export const EXPANSION_JOINT_TYPES = [
  { value: 'bought_in_bellows', label: 'Bought-in Bellows/Compensator' },
  { value: 'fabricated_loop', label: 'Fabricated Expansion Loop' },
] as const;

export const BELLOWS_JOINT_TYPES = [
  { value: 'axial', label: 'Axial', description: 'Compression/extension only' },
  {
    value: 'universal',
    label: 'Universal',
    description: 'Multi-directional movement',
  },
  {
    value: 'hinged',
    label: 'Hinged',
    description: 'Angular movement, one plane',
  },
  {
    value: 'gimbal',
    label: 'Gimbal',
    description: 'Angular movement, all planes',
  },
  {
    value: 'tied_universal',
    label: 'Tied Universal',
    description: 'Lateral movement only',
  },
] as const;

export const BELLOWS_MATERIALS = [
  { value: 'stainless_steel_304', label: 'Stainless Steel 304' },
  { value: 'stainless_steel_316', label: 'Stainless Steel 316' },
  { value: 'rubber_epdm', label: 'Rubber (EPDM)' },
  { value: 'rubber_neoprene', label: 'Rubber (Neoprene)' },
  { value: 'ptfe', label: 'PTFE' },
  { value: 'fabric_reinforced', label: 'Fabric Reinforced' },
] as const;

export const FABRICATED_LOOP_TYPES = [
  {
    value: 'full_loop',
    label: 'Full Loop (180° return)',
    elbows: 4,
    description: 'Maximum thermal absorption',
  },
  {
    value: 'horseshoe_lyre',
    label: 'Horseshoe/Lyre',
    elbows: 2,
    description: 'Common U-bend configuration',
  },
  {
    value: 'z_offset',
    label: 'Z-Offset',
    elbows: 4,
    description: 'Parallel offset with return',
  },
  {
    value: 'l_offset',
    label: 'L-Offset',
    elbows: 2,
    description: 'Simple directional change',
  },
] as const;

export const EXPANSION_JOINT_END_OPTIONS = [
  { value: 'PE', label: 'PE - Plain ended', flangeWelds: 0, flanges: 0 },
  { value: 'FOE', label: 'FOE - Flanged one end', flangeWelds: 1, flanges: 1 },
  { value: 'FBE', label: 'FBE - Flanged both ends', flangeWelds: 2, flanges: 2 },
] as const;

export type ExpansionJointType = (typeof EXPANSION_JOINT_TYPES)[number]['value'];
export type BellowsJointType = (typeof BELLOWS_JOINT_TYPES)[number]['value'];
export type BellowsMaterial = (typeof BELLOWS_MATERIALS)[number]['value'];
export type FabricatedLoopType = (typeof FABRICATED_LOOP_TYPES)[number]['value'];
export type ExpansionJointEndOption =
  (typeof EXPANSION_JOINT_END_OPTIONS)[number]['value'];

export interface ExpansionJointCalculation {
  totalWeightKg: number;
  pipeWeightKg?: number;
  elbowWeightKg?: number;
  flangeWeightKg?: number;
  numberOfButtWelds?: number;
  totalButtWeldLengthM?: number;
  numberOfFlangeWelds?: number;
  flangeWeldLengthM?: number;
  unitCost?: number;
  totalCost?: number;
}

export function elbowsForLoopType(loopType: FabricatedLoopType): number {
  const loopConfig = FABRICATED_LOOP_TYPES.find((lt) => lt.value === loopType);
  return loopConfig?.elbows || 4;
}

export function flangeConfigForEndOption(
  endOption: ExpansionJointEndOption
): { flangeWelds: number; flanges: number } {
  const config = EXPANSION_JOINT_END_OPTIONS.find(
    (opt) => opt.value === endOption
  );
  return {
    flangeWelds: config?.flangeWelds || 0,
    flanges: config?.flanges || 0,
  };
}
