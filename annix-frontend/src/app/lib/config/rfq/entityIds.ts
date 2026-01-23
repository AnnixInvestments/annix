/**
 * Known entity IDs for database-driven lookups.
 *
 * These constants provide named references to specific database records
 * to avoid magic numbers throughout the codebase.
 *
 * NOTE: These IDs should match the database. If database IDs change,
 * update these constants accordingly. Consider migrating to API-based
 * lookup for dynamic ID resolution.
 */

export const STEEL_SPEC_IDS = {
  SABS_62: 7,
  SABS_719: 8,
  ASTM_A106_B: 2,
  ASTM_A53_B: 1,
  ASTM_A312_TP304: 12,
  ASTM_A312_TP316: 13,
} as const;

export const FLANGE_STANDARD_IDS = {
  ASME_B16_5: 1,
  ASME_B16_47: 2,
  BS_4504: 3,
  BS_10: 4,
  SABS_1123: 5,
  EN_1092_1: 6,
} as const;

export const FLANGE_TYPE_IDS = {
  WN: 1,
  SO: 2,
  SW: 3,
  LJ: 4,
  TH: 5,
  BL: 6,
} as const;

export const PRESSURE_CLASS_IDS = {
  PN6: 1,
  PN10: 2,
  PN16: 3,
  PN25: 4,
  PN40: 5,
  CLASS_150: 10,
  CLASS_300: 11,
  CLASS_600: 12,
  CLASS_900: 13,
  CLASS_1500: 14,
  CLASS_2500: 15,
} as const;

export const isSabs719 = (steelSpecId: number | undefined | null): boolean =>
  steelSpecId === STEEL_SPEC_IDS.SABS_719;

export const isSabs62 = (steelSpecId: number | undefined | null): boolean =>
  steelSpecId === STEEL_SPEC_IDS.SABS_62;

export const isSabsStandard = (steelSpecId: number | undefined | null): boolean =>
  isSabs719(steelSpecId) || isSabs62(steelSpecId);

export const isAsmeStandard = (standardId: number | undefined | null): boolean =>
  standardId === FLANGE_STANDARD_IDS.ASME_B16_5 ||
  standardId === FLANGE_STANDARD_IDS.ASME_B16_47;

export const derivedSabsStandard = (steelSpecId: number | undefined | null): 'SABS719' | 'SABS62' =>
  isSabs719(steelSpecId) ? 'SABS719' : 'SABS62';

export type SteelSpecId = (typeof STEEL_SPEC_IDS)[keyof typeof STEEL_SPEC_IDS];
export type FlangeStandardId = (typeof FLANGE_STANDARD_IDS)[keyof typeof FLANGE_STANDARD_IDS];
export type FlangeTypeId = (typeof FLANGE_TYPE_IDS)[keyof typeof FLANGE_TYPE_IDS];
export type PressureClassId = (typeof PRESSURE_CLASS_IDS)[keyof typeof PRESSURE_CLASS_IDS];
