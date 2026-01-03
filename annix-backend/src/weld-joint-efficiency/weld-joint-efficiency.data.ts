/**
 * ASME B31.1 and B31.3 Welding Data Structures
 * This module provides data for ASME B31.1 weld joint design rules for boiler piping (BEP),
 * full Table 102.4.3 from B31.1 (Longitudinal Weld Joint Efficiency Factors),
 * and full Table A-1B from B31.3 (Basic Quality Factors for Longitudinal Weld Joints) with notes.
 *
 * Usage:
 * - Use for lookups in pressure calculations, e.g., thickness t = PD / (2SE + PY) where E includes joint factors.
 * - Rules are stored as strings for reference or display.
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface B31_1_JointEfficiencyRow {
  no: number;
  typeOfJoint: string;
  typeOfSeam: string;
  examination: string;
  factorE: number | null;
  isSubheader?: boolean;
}

export interface B31_3_QualityFactorRow {
  specNo: string;
  classOrType: string;
  description: string;
  notes: string;
  ej: number;
}

export interface WeldRuleSection {
  section: string;
  summary: string;
}

// ============================================================================
// 1. ASME B31.1 Table 102.4.3: Longitudinal Weld Joint Efficiency Factors
// ============================================================================

export const B31_1_TABLE_102_4_3: B31_1_JointEfficiencyRow[] = [
  {
    no: 1,
    typeOfJoint: 'Furnace butt weld, continuous weld',
    typeOfSeam: 'Straight',
    examination: 'As required by listed specification [Note (1)]',
    factorE: 0.6,
  },
  {
    no: 2,
    typeOfJoint: 'Electric resistance weld',
    typeOfSeam: 'Straight or spiral',
    examination: 'As required by listed specification [Note (1)]',
    factorE: 0.85,
  },
  {
    no: 3,
    typeOfJoint: 'Electric fusion weld',
    typeOfSeam: '',
    examination: '',
    factorE: null,
    isSubheader: true,
  },
  {
    no: 3,
    typeOfJoint: '(a) Single butt weld (without filler metal)',
    typeOfSeam: 'Straight or spiral',
    examination:
      'As required by listed specification + 100% radiographed [Note (2)]',
    factorE: 0.85,
  },
  {
    no: 3,
    typeOfJoint: '(b) Single butt weld (with filler metal)',
    typeOfSeam: 'Straight or spiral',
    examination:
      'As required by listed specification + 100% radiographed [Note (2)]',
    factorE: 0.8,
  },
  {
    no: 3,
    typeOfJoint: '(c) Double butt weld (without filler metal)',
    typeOfSeam: 'Straight or spiral',
    examination:
      'As required by listed specification + 100% radiographed [Note (2)]',
    factorE: 0.9,
  },
  {
    no: 3,
    typeOfJoint: '(d) Double butt weld (with filler metal)',
    typeOfSeam: 'Straight or spiral',
    examination:
      'As required by listed specification + 100% radiographed [Note (2)]',
    factorE: 0.9,
  },
  {
    no: 4,
    typeOfJoint: 'API 5L Submerged arc weld (SAW) or Gas metal arc weld (GMAW)',
    typeOfSeam: 'Straight with one or two seams; Spiral',
    examination: 'As required by specification + 100% radiographed [Note (2)]',
    factorE: 0.9,
  },
];

export const B31_1_TABLE_102_4_3_NOTES: string[] = [
  '(1) It is not permitted to increase the longitudinal weld joint efficiency factor by additional examination for joints 1 or 2.',
  '(2) Radiography shall be in accordance with the requirements of para. 136.4.5 or the material specification as applicable.',
];

// ============================================================================
// 2. ASME B31.3 Table A-1B: Basic Quality Factors for Longitudinal Weld Joints
// ============================================================================

export const B31_3_TABLE_A_1B: Record<string, B31_3_QualityFactorRow[]> = {
  'Carbon Steel': [
    {
      specNo: 'API 5L',
      classOrType: '',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'API 5L',
      classOrType: '',
      description: 'Electric fusion welded pipe, 100% radiographed',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'API 5L',
      classOrType: '',
      description: 'Electric resistance welded pipe',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'API 5L',
      classOrType: '',
      description: 'Electric fusion welded pipe, double butt seam',
      notes: '',
      ej: 0.95,
    },
    {
      specNo: 'API 5L',
      classOrType: '',
      description: 'Continuous welded (furnace butt welded) pipe',
      notes: '',
      ej: 0.6,
    },
    {
      specNo: 'A 53',
      classOrType: 'Type S',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 53',
      classOrType: 'Type E',
      description: 'Electric resistance welded pipe',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 53',
      classOrType: 'Type F',
      description: 'Furnace butt welded pipe',
      notes: '',
      ej: 0.6,
    },
    {
      specNo: 'A 105',
      classOrType: '',
      description: 'Forgings',
      notes: '(9)',
      ej: 1.0,
    },
    {
      specNo: 'A 106',
      classOrType: '',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 134',
      classOrType: '',
      description:
        'Electric fusion welded pipe, single butt, straight or spiral (helical) seam',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'A 135',
      classOrType: '',
      description: 'Electric resistance welded pipe',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 139',
      classOrType: '',
      description:
        'Electric fusion welded pipe, straight or spiral (helical) seam',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'A 179',
      classOrType: '',
      description: 'Seamless tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 181',
      classOrType: '',
      description: 'Forgings',
      notes: '(9)',
      ej: 1.0,
    },
    {
      specNo: 'A 333',
      classOrType: '',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 333',
      classOrType: '',
      description: 'Electric resistance welded pipe',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 334',
      classOrType: '',
      description: 'Seamless tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 350',
      classOrType: '',
      description: 'Forgings',
      notes: '(9)',
      ej: 1.0,
    },
    {
      specNo: 'A 369',
      classOrType: '',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 381',
      classOrType: '',
      description: 'Electric fusion welded pipe, 100% radiographed',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 381',
      classOrType: '',
      description: 'Electric fusion welded pipe, spot radiographed',
      notes: '(19)',
      ej: 0.9,
    },
    {
      specNo: 'A 381',
      classOrType: '',
      description: 'Electric fusion welded pipe, as manufactured',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 524',
      classOrType: '',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 587',
      classOrType: '',
      description: 'Electric resistance welded pipe',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 671',
      classOrType: '12, 22, 32, 42, 52',
      description: 'Electric fusion welded pipe, 100% radiographed',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 671',
      classOrType: '13, 23, 33, 43, 53',
      description: 'Electric fusion welded pipe, double butt seam',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 672',
      classOrType: '12, 22, 32, 42, 52',
      description: 'Electric fusion welded pipe, 100% radiographed',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 672',
      classOrType: '13, 23, 33, 43, 53',
      description: 'Electric fusion welded pipe, double butt seam',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 691',
      classOrType: '12, 22, 32, 42, 52',
      description: 'Electric fusion welded pipe, 100% radiographed',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 691',
      classOrType: '13, 23, 33, 43, 53',
      description: 'Electric fusion welded pipe, double butt seam',
      notes: '',
      ej: 0.85,
    },
  ],
  'Low and Intermediate Alloy Steel': [
    {
      specNo: 'A 182',
      classOrType: '',
      description: 'Forgings',
      notes: '(9)',
      ej: 1.0,
    },
    {
      specNo: 'A 333',
      classOrType: '',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 333',
      classOrType: '',
      description: 'Electric resistance welded pipe',
      notes: '(78)',
      ej: 0.85,
    },
    {
      specNo: 'A 334',
      classOrType: '',
      description: 'Seamless tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 335',
      classOrType: '',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 350',
      classOrType: '',
      description: 'Forgings',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 369',
      classOrType: '',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 671',
      classOrType: '12, 22, 32, 42, 52',
      description: 'Electric fusion welded pipe, 100% radiographed',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 671',
      classOrType: '13, 23, 33, 43, 53',
      description: 'Electric fusion welded pipe, double butt seam',
      notes: '(78)',
      ej: 0.85,
    },
    {
      specNo: 'A 672',
      classOrType: '12, 22, 32, 42, 52',
      description: 'Electric fusion welded pipe, 100% radiographed',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 672',
      classOrType: '13, 23, 33, 43, 53',
      description: 'Electric fusion welded pipe, double butt seam',
      notes: '(78)',
      ej: 0.85,
    },
    {
      specNo: 'A 691',
      classOrType: '12, 22, 32, 42, 52',
      description: 'Electric fusion welded pipe, 100% radiographed',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 691',
      classOrType: '13, 23, 33, 43, 53',
      description: 'Electric fusion welded pipe, double butt seam',
      notes: '(78)',
      ej: 0.85,
    },
  ],
  'Stainless Steel': [
    {
      specNo: 'A 182',
      classOrType: '',
      description: 'Forgings',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 249',
      classOrType: '',
      description: 'Electric fusion welded tube, single butt seam',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'A 268',
      classOrType: '',
      description: 'Seamless tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 268',
      classOrType: '',
      description: 'Electric fusion welded tube, double butt seam',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 268',
      classOrType: '',
      description: 'Electric fusion welded tube, single butt seam',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'A 269',
      classOrType: '',
      description: 'Seamless tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 269',
      classOrType: '',
      description: 'Electric fusion welded tube, double butt seam',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 269',
      classOrType: '',
      description: 'Electric fusion welded tube, single butt seam',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'A 312',
      classOrType: '',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 312',
      classOrType: '',
      description: 'Electric fusion welded pipe, double butt seam',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 312',
      classOrType: '',
      description: 'Electric fusion welded pipe, single butt seam',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'A 312',
      classOrType: '',
      description: 'Electric fusion welded pipe, 100% radiographed',
      notes: '(46)',
      ej: 1.0,
    },
    {
      specNo: 'A 358',
      classOrType: '1, 3, 4',
      description: 'Electric fusion welded pipe, 100% radiographed',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 358',
      classOrType: '5',
      description: 'Electric fusion welded pipe, spot radiographed',
      notes: '',
      ej: 0.9,
    },
    {
      specNo: 'A 358',
      classOrType: '2',
      description: 'Electric fusion welded pipe, double butt seam',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 376',
      classOrType: '',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 409',
      classOrType: '',
      description: 'Electric fusion welded pipe, double butt seam',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 409',
      classOrType: '',
      description: 'Electric fusion welded pipe, single butt seam',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'A 487',
      classOrType: '',
      description: 'Steel castings',
      notes: '(9) (40)',
      ej: 0.8,
    },
    {
      specNo: 'A 789',
      classOrType: '',
      description: 'Seamless tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 789',
      classOrType: '',
      description: 'Electric fusion welded tube, 100% radiographed',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 789',
      classOrType: '',
      description: 'Electric fusion welded tube, double butt',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 789',
      classOrType: '',
      description: 'Electric fusion welded tube, single butt',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'A 790',
      classOrType: '',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 790',
      classOrType: '',
      description: 'Electric fusion welded pipe, 100% radiographed',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 790',
      classOrType: '',
      description: 'Electric fusion welded pipe, double butt',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 790',
      classOrType: '',
      description: 'Electric fusion welded pipe, single butt',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'A 813',
      classOrType: 'DW',
      description: 'Electric fusion welded, double butt',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 813',
      classOrType: 'SW',
      description: 'Electric fusion welded, single butt',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'A 814',
      classOrType: 'DW',
      description: 'Electric fusion welded, double butt',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'A 814',
      classOrType: 'SW',
      description: 'Electric fusion welded, single butt',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'A 928',
      classOrType: '1, 3, 4',
      description: 'Electric fusion welded pipe, 100% radiographed',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'A 928',
      classOrType: '5',
      description: 'Electric fusion welded pipe, spot radiographed',
      notes: '',
      ej: 0.9,
    },
    {
      specNo: 'A 928',
      classOrType: '2',
      description: 'Electric fusion welded pipe, double butt seam',
      notes: '',
      ej: 0.85,
    },
  ],
  'Copper and Copper Alloy': [
    {
      specNo: 'B 42',
      classOrType: '',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 43',
      classOrType: '',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 68',
      classOrType: '',
      description: 'Seamless tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 75',
      classOrType: '',
      description: 'Seamless tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 88',
      classOrType: '',
      description: 'Seamless water tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 280',
      classOrType: '',
      description: 'Seamless tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 466',
      classOrType: '',
      description: 'Seamless pipe and tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 467',
      classOrType: '',
      description: 'Electric resistance welded pipe',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'B 467',
      classOrType: '',
      description: 'Electric fusion welded pipe, double butt seam',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'B 467',
      classOrType: '',
      description: 'Electric fusion welded pipe, single butt seam',
      notes: '',
      ej: 0.8,
    },
  ],
  'Nickel and Nickel Alloy': [
    {
      specNo: 'B 160',
      classOrType: '',
      description: 'Forgings',
      notes: '(9)',
      ej: 1.0,
    },
    {
      specNo: 'B 161',
      classOrType: '',
      description: 'Seamless pipe and tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 164',
      classOrType: '',
      description: 'Forgings',
      notes: '(9)',
      ej: 1.0,
    },
    {
      specNo: 'B 165',
      classOrType: '',
      description: 'Seamless pipe and tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 167',
      classOrType: '',
      description: 'Seamless pipe and tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 407',
      classOrType: '',
      description: 'Seamless pipe and tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 444',
      classOrType: '',
      description: 'Seamless pipe and tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 464',
      classOrType: '',
      description: 'Welded pipe',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'B 474',
      classOrType: '1, 3, 4',
      description: 'Welded pipe, 100% radiographed',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 474',
      classOrType: '2',
      description: 'Electric fusion welded pipe, double butt seam',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'B 514',
      classOrType: '',
      description: 'Welded pipe',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'B 517',
      classOrType: '',
      description: 'Welded pipe',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'B 564',
      classOrType: '',
      description: 'Nickel alloy forgings',
      notes: '(9)',
      ej: 1.0,
    },
    {
      specNo: 'B 619',
      classOrType: '',
      description: 'Electric resistance welded pipe',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'B 619',
      classOrType: '',
      description: 'Electric fusion welded pipe, double butt seam',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'B 619',
      classOrType: '',
      description: 'Electric fusion welded pipe, single butt seam',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'B 622',
      classOrType: '',
      description: 'Seamless pipe and tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 626',
      classOrType: 'All',
      description: 'Electric resistance welded tube',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'B 626',
      classOrType: '',
      description: 'Electric fusion welded tube, double butt seam',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'B 626',
      classOrType: '',
      description: 'Electric fusion welded tube, single butt seam',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'B 668',
      classOrType: 'All',
      description: 'Seamless pipe and tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 675',
      classOrType: 'All',
      description: 'Welded pipe',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'B 690',
      classOrType: '',
      description: 'Seamless pipe and tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 705',
      classOrType: '',
      description: 'Welded pipe',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'B 725',
      classOrType: '',
      description: 'Electric fusion welded pipe, double butt seam',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'B 725',
      classOrType: '',
      description: 'Electric fusion welded pipe, single butt seam',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'B 729',
      classOrType: '',
      description: 'Seamless pipe and tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 804',
      classOrType: '1, 3, 5',
      description: 'Welded pipe, 100% radiographed',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 804',
      classOrType: '2, 4',
      description: 'Welded pipe, double fusion welded',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'B 804',
      classOrType: '6',
      description: 'Welded pipe, single fusion welded',
      notes: '',
      ej: 0.8,
    },
  ],
  'Titanium and Titanium Alloy': [
    {
      specNo: 'B 861',
      classOrType: '',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 862',
      classOrType: '',
      description: 'Welded pipe, double butt seam',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'B 862',
      classOrType: '',
      description: 'Welded pipe, single butt seam',
      notes: '',
      ej: 0.8,
    },
  ],
  'Zirconium and Zirconium Alloy': [
    {
      specNo: 'B 523',
      classOrType: '',
      description: 'Seamless tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 523',
      classOrType: '',
      description: 'Electric fusion welded tube',
      notes: '',
      ej: 0.8,
    },
    {
      specNo: 'B 658',
      classOrType: '',
      description: 'Seamless pipe',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 658',
      classOrType: '',
      description: 'Electric fusion welded pipe',
      notes: '',
      ej: 0.8,
    },
  ],
  'Aluminum Alloy': [
    {
      specNo: 'B 210',
      classOrType: '',
      description: 'Seamless tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 241',
      classOrType: '',
      description: 'Seamless pipe and tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 247',
      classOrType: '',
      description: 'Forgings and fittings',
      notes: '(9)',
      ej: 1.0,
    },
    {
      specNo: 'B 345',
      classOrType: '',
      description: 'Seamless pipe and tube',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 547',
      classOrType: '',
      description: 'Welded pipe and tube, 100% radiographed',
      notes: '',
      ej: 1.0,
    },
    {
      specNo: 'B 547',
      classOrType: '',
      description: 'Welded pipe, double butt seam',
      notes: '',
      ej: 0.85,
    },
    {
      specNo: 'B 547',
      classOrType: '',
      description: 'Welded pipe, single butt seam',
      notes: '',
      ej: 0.8,
    },
  ],
};

export const B31_3_TABLE_A_1B_NOTES: string[] = [
  'These quality factors are determined in accordance with para. 302.3.4(a). See also para. 302.3.4(b) and Table 302.3.4 for increased quality factors applicable in special cases. Specifications, except API, are ASTM.',
  '(9) Applies to forgings.',
  '(19) Spot radiographed.',
  '(40) Steel castings.',
  '(46) 100% radiographed.',
  '(78) Electric resistance welded pipe.',
  '(16) Indicates continuation of table.',
];

// ============================================================================
// 3. ASME B31.1 Weld Joint Design Rules Summary (Chapter V and BEP)
// ============================================================================

export const B31_1_WELD_RULES: WeldRuleSection[] = [
  {
    section: 'General Welded Joints (111)',
    summary:
      'Welded joints allowed for any permitted material if WPS/welders qualified. Includes butt, socket, fillet, seal welds. Restrictions on socket welds for size, service. Dimensions per ASME B16.5/B16.11. Branch connections per para. 104.3.1(B.4).',
  },
  {
    section: 'Welding Preparation (127.3)',
    summary:
      'End prep per B16.25/WPS; clean surfaces; alignment tolerances (<=1/16 in. mismatch); socket weld gap 1/16 in.; trim for misalignment <=30 deg.',
  },
  {
    section: 'Welding Procedure (127.4)',
    summary:
      'Full penetration for girth/longitudinal welds; reinforcement limits per Table 127.4.2; undercut <=1/32 in.; fillet sizes per Figs. 127.4.4; branch details per Figs. 127.4.8(A)-(F); reinforcement pads with vents; repair per WPS.',
  },
  {
    section: 'Qualification (127.5)',
    summary:
      'Per ASME Section IX with Code mods; employer responsible; records signed and welds identified.',
  },
  {
    section: 'Preheat (131)',
    summary:
      'Maintain min temp in 3 in./1.5t zone; per P-No. (e.g., P-No.1 >0.30%C/>1 in.: 175 deg F; P-No.6: 400 deg F). GTAW root may lower preheat.',
  },
  {
    section: 'PWHT (132)',
    summary:
      'Per Table 132 (temp range, hold time 1 hr/in.); exemptions; heating/cooling rates; band width 3t/2t; alternate temp/time per Table 132.1.',
  },
  {
    section: 'Bending and Forming (129)',
    summary:
      'Hot/cold per 102.4.5/104.2.1; post-bend HT for carbon steel >3/4 in. per Table 132.',
  },
  {
    section: 'Assembly (135)',
    summary:
      'No forcing; flanged uniform compression; threaded with compound/seal weld; tubing flared/flareless per mfr.',
  },
  {
    section: 'Boiler External Piping (BEP) Specifics',
    summary:
      'Applies to steam/feedwater/blowoff/drain/desuperheater external to boilers. Materials SA/SB/SFA or ASTM equivalent; certified. Welding by Section I authorized entities; Figs. PG-105.1-PG-105.3; data reports/inspection/stamping required. Preheat/PWHT per general rules.',
  },
];

// ============================================================================
// MATERIAL CATEGORIES (for easier lookup)
// ============================================================================

export const MATERIAL_CATEGORIES = [
  'Carbon Steel',
  'Low and Intermediate Alloy Steel',
  'Stainless Steel',
  'Copper and Copper Alloy',
  'Nickel and Nickel Alloy',
  'Titanium and Titanium Alloy',
  'Zirconium and Zirconium Alloy',
  'Aluminum Alloy',
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];
