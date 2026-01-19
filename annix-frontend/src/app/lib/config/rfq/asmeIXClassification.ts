export interface PNumberGroup {
  pNumber: number
  group: number
  description: string
  typicalMaterials: string[]
  minTensileStrength?: number
  maxTensileStrength?: number
}

export interface WeldPosition {
  code: string
  name: string
  description: string
  type: 'groove' | 'fillet'
  qualified: string[]
}

export interface MaterialToPNumber {
  astmSpec: string
  grade?: string
  uns?: string
  pNumber: number
  group: number
  tensileStrengthKsi: number
  nominalComposition: string
  productForm: string
}

export const ASME_P_NUMBERS: Record<string, PNumberGroup> = {
  'P1-1': {
    pNumber: 1,
    group: 1,
    description: 'Carbon Steel',
    typicalMaterials: ['A106 Gr. A', 'A53 Gr. A', 'A135 Gr. A', 'A333 Gr. 1'],
    maxTensileStrength: 55,
  },
  'P1-2': {
    pNumber: 1,
    group: 2,
    description: 'Carbon Steel (Higher Strength)',
    typicalMaterials: ['A106 Gr. C', 'A381 Y52-Y60'],
    minTensileStrength: 55,
    maxTensileStrength: 75,
  },
  'P1-3': {
    pNumber: 1,
    group: 3,
    description: 'Carbon Steel (High Strength)',
    typicalMaterials: ['A333 Gr. 10'],
    minTensileStrength: 75,
  },
  'P3-1': {
    pNumber: 3,
    group: 1,
    description: 'Low Alloy Steel (0.5Mo)',
    typicalMaterials: ['A335 P1', 'A369 FP1'],
  },
  'P4-1': {
    pNumber: 4,
    group: 1,
    description: 'Low Alloy Steel (0.5-2Cr, 0.5Mo)',
    typicalMaterials: ['A335 P11', 'A335 P12', 'A369 FP11', 'A369 FP12'],
  },
  'P4-2': {
    pNumber: 4,
    group: 2,
    description: 'Low Alloy Steel (0.5Cr-0.5Mo)',
    typicalMaterials: ['A333 Gr. 4'],
  },
  'P5A-1': {
    pNumber: 5,
    group: 1,
    description: 'Cr-Mo Steel (2.25-3Cr)',
    typicalMaterials: ['A335 P21', 'A335 P22', 'A369 FP21', 'A369 FP22'],
  },
  'P5B-1': {
    pNumber: 5,
    group: 1,
    description: 'Cr-Mo Steel (5-9Cr)',
    typicalMaterials: ['A335 P5', 'A335 P9', 'A369 FP5', 'A369 FP9'],
  },
  'P8-1': {
    pNumber: 8,
    group: 1,
    description: 'Austenitic Stainless Steel (18Cr-8Ni)',
    typicalMaterials: ['A312 TP304', 'A312 TP304L', 'A312 TP316', 'A312 TP316L', 'A312 TP321', 'A312 TP347'],
  },
  'P8-2': {
    pNumber: 8,
    group: 2,
    description: 'Austenitic Stainless Steel (High Cr/Ni)',
    typicalMaterials: ['A312 TP309S', 'A312 TP310S'],
  },
  'P8-3': {
    pNumber: 8,
    group: 3,
    description: 'Austenitic Stainless Steel (High Mn)',
    typicalMaterials: ['A312 TPXM-19', 'A312 TPXM-29'],
  },
  'P8-4': {
    pNumber: 8,
    group: 4,
    description: 'Austenitic Stainless Steel (Super Austenitic)',
    typicalMaterials: ['A312 S31254', 'A312 S31725', 'A312 S34565'],
  },
  'P9A-1': {
    pNumber: 9,
    group: 1,
    description: 'Nickel Steel (2-2.5Ni)',
    typicalMaterials: ['A333 Gr. 7', 'A333 Gr. 9'],
  },
  'P9B-1': {
    pNumber: 9,
    group: 1,
    description: 'Nickel Steel (3.5Ni)',
    typicalMaterials: ['A333 Gr. 3'],
  },
  'P11A-1': {
    pNumber: 11,
    group: 1,
    description: 'High Nickel Steel (9Ni)',
    typicalMaterials: ['A333 Gr. 8'],
  },
  'P15E-1': {
    pNumber: 15,
    group: 1,
    description: 'Cr-Mo-V Steel (9Cr-1Mo-V)',
    typicalMaterials: ['A335 P91', 'A335 P92', 'A369 FP91', 'A369 FP92'],
  },
  'P45-1': {
    pNumber: 45,
    group: 1,
    description: 'High Alloy Austenitic (46Fe-24Ni-21Cr)',
    typicalMaterials: ['A312 N08367'],
  },
}

export const GROOVE_WELD_POSITIONS: WeldPosition[] = [
  {
    code: '1G',
    name: 'Flat (Pipe Rotated)',
    description: 'Pipe horizontal, rotated during welding. Weld deposited from above.',
    type: 'groove',
    qualified: ['1G'],
  },
  {
    code: '2G',
    name: 'Horizontal (Pipe Vertical)',
    description: 'Pipe vertical, axis fixed. Weld made horizontally around circumference.',
    type: 'groove',
    qualified: ['1G', '2G'],
  },
  {
    code: '5G',
    name: 'Multiple (Pipe Horizontal Fixed)',
    description: 'Pipe horizontal, axis fixed in horizontal plane. Welding progresses around pipe without rotation.',
    type: 'groove',
    qualified: ['1G', '2G', '3G', '4G', '5G'],
  },
  {
    code: '6G',
    name: 'Multiple (Pipe 45° Fixed)',
    description: 'Pipe axis at 45° to horizontal, fixed. Most comprehensive qualification - qualifies all positions.',
    type: 'groove',
    qualified: ['1G', '2G', '3G', '4G', '5G', '6G'],
  },
  {
    code: '6GR',
    name: 'Multiple with Restriction',
    description: 'Same as 6G but with restriction ring simulating branch connection or structural constraint.',
    type: 'groove',
    qualified: ['1G', '2G', '3G', '4G', '5G', '6G', '6GR'],
  },
]

export const FILLET_WELD_POSITIONS: WeldPosition[] = [
  {
    code: '1F',
    name: 'Flat',
    description: 'Pipe axis at 45° from horizontal, rotated. Weld deposited from above.',
    type: 'fillet',
    qualified: ['1F'],
  },
  {
    code: '2F',
    name: 'Horizontal',
    description: 'Pipe vertical, fixed. Fillet weld made horizontal.',
    type: 'fillet',
    qualified: ['1F', '2F'],
  },
  {
    code: '2FR',
    name: 'Horizontal (Rotated)',
    description: 'Pipe horizontal, rotated during welding.',
    type: 'fillet',
    qualified: ['1F', '2F', '2FR'],
  },
  {
    code: '4F',
    name: 'Overhead',
    description: 'Pipe vertical, fixed. Fillet weld made overhead.',
    type: 'fillet',
    qualified: ['1F', '2F', '4F'],
  },
  {
    code: '5F',
    name: 'Multiple',
    description: 'Pipe horizontal, fixed. Welding progresses around pipe in all positions.',
    type: 'fillet',
    qualified: ['1F', '2F', '4F', '5F'],
  },
]

export const PIPE_MATERIAL_TO_P_NUMBER: MaterialToPNumber[] = [
  { astmSpec: 'A53', grade: 'A', uns: 'K02504', pNumber: 1, group: 1, tensileStrengthKsi: 48, nominalComposition: 'C', productForm: 'E.R.W./Seamless pipe' },
  { astmSpec: 'A53', grade: 'B', uns: 'K03005', pNumber: 1, group: 1, tensileStrengthKsi: 60, nominalComposition: 'C', productForm: 'E.R.W./Seamless pipe' },
  { astmSpec: 'A106', grade: 'A', uns: 'K02501', pNumber: 1, group: 1, tensileStrengthKsi: 48, nominalComposition: 'C-Si', productForm: 'Seamless pipe' },
  { astmSpec: 'A106', grade: 'B', uns: 'K03006', pNumber: 1, group: 1, tensileStrengthKsi: 60, nominalComposition: 'C-Mn-Si', productForm: 'Seamless pipe' },
  { astmSpec: 'A106', grade: 'C', uns: 'K03501', pNumber: 1, group: 2, tensileStrengthKsi: 70, nominalComposition: 'C-Mn-Si', productForm: 'Seamless pipe' },
  { astmSpec: 'A312', grade: 'TP304', uns: 'S30400', pNumber: 8, group: 1, tensileStrengthKsi: 75, nominalComposition: '18Cr-8Ni', productForm: 'Seamless/welded pipe' },
  { astmSpec: 'A312', grade: 'TP304L', uns: 'S30403', pNumber: 8, group: 1, tensileStrengthKsi: 70, nominalComposition: '18Cr-8Ni', productForm: 'Seamless/welded pipe' },
  { astmSpec: 'A312', grade: 'TP304H', uns: 'S30409', pNumber: 8, group: 1, tensileStrengthKsi: 75, nominalComposition: '18Cr-8Ni', productForm: 'Seamless/welded pipe' },
  { astmSpec: 'A312', grade: 'TP316', uns: 'S31600', pNumber: 8, group: 1, tensileStrengthKsi: 75, nominalComposition: '16Cr-12Ni-2Mo', productForm: 'Seamless/welded pipe' },
  { astmSpec: 'A312', grade: 'TP316L', uns: 'S31603', pNumber: 8, group: 1, tensileStrengthKsi: 70, nominalComposition: '16Cr-12Ni-2Mo', productForm: 'Seamless/welded pipe' },
  { astmSpec: 'A312', grade: 'TP316H', uns: 'S31609', pNumber: 8, group: 1, tensileStrengthKsi: 75, nominalComposition: '16Cr-12Ni-2Mo', productForm: 'Seamless/welded pipe' },
  { astmSpec: 'A312', grade: 'TP321', uns: 'S32100', pNumber: 8, group: 1, tensileStrengthKsi: 75, nominalComposition: '18Cr-10Ni-Ti', productForm: 'Seamless/welded pipe' },
  { astmSpec: 'A312', grade: 'TP321H', uns: 'S32109', pNumber: 8, group: 1, tensileStrengthKsi: 75, nominalComposition: '18Cr-10Ni-Ti', productForm: 'Seamless/welded pipe' },
  { astmSpec: 'A312', grade: 'TP347', uns: 'S34700', pNumber: 8, group: 1, tensileStrengthKsi: 75, nominalComposition: '18Cr-10Ni-Nb', productForm: 'Seamless/welded pipe' },
  { astmSpec: 'A312', grade: 'TP347H', uns: 'S34709', pNumber: 8, group: 1, tensileStrengthKsi: 75, nominalComposition: '18Cr-10Ni-Nb', productForm: 'Seamless/welded pipe' },
  { astmSpec: 'A312', grade: 'TP309S', uns: 'S30908', pNumber: 8, group: 2, tensileStrengthKsi: 75, nominalComposition: '23Cr-12Ni', productForm: 'Seamless/welded pipe' },
  { astmSpec: 'A312', grade: 'TP310S', uns: 'S31008', pNumber: 8, group: 2, tensileStrengthKsi: 75, nominalComposition: '25Cr-20Ni', productForm: 'Seamless/welded pipe' },
  { astmSpec: 'A312', grade: 'S31254', uns: 'S31254', pNumber: 8, group: 4, tensileStrengthKsi: 95, nominalComposition: '20Cr-18Ni-6Mo', productForm: 'Seamless/welded pipe' },
  { astmSpec: 'A333', grade: '1', uns: 'K03008', pNumber: 1, group: 1, tensileStrengthKsi: 55, nominalComposition: 'C-Mn', productForm: 'Seamless/welded pipe (low temp)' },
  { astmSpec: 'A333', grade: '6', uns: 'K03006', pNumber: 1, group: 1, tensileStrengthKsi: 60, nominalComposition: 'C-Mn-Si', productForm: 'Seamless/welded pipe (low temp)' },
  { astmSpec: 'A333', grade: '3', uns: 'K31918', pNumber: 9, group: 1, tensileStrengthKsi: 65, nominalComposition: '3.5Ni', productForm: 'Seamless/welded pipe (low temp)' },
  { astmSpec: 'A333', grade: '8', uns: 'K81340', pNumber: 11, group: 1, tensileStrengthKsi: 100, nominalComposition: '9Ni', productForm: 'Seamless/welded pipe (cryogenic)' },
  { astmSpec: 'A335', grade: 'P1', uns: 'K11522', pNumber: 3, group: 1, tensileStrengthKsi: 55, nominalComposition: 'C-0.5Mo', productForm: 'Seamless pipe (high temp)' },
  { astmSpec: 'A335', grade: 'P11', uns: 'K11597', pNumber: 4, group: 1, tensileStrengthKsi: 60, nominalComposition: '1.25Cr-0.5Mo', productForm: 'Seamless pipe (high temp)' },
  { astmSpec: 'A335', grade: 'P12', uns: 'K11562', pNumber: 4, group: 1, tensileStrengthKsi: 60, nominalComposition: '1Cr-0.5Mo', productForm: 'Seamless pipe (high temp)' },
  { astmSpec: 'A335', grade: 'P22', uns: 'K21590', pNumber: 5, group: 1, tensileStrengthKsi: 60, nominalComposition: '2.25Cr-1Mo', productForm: 'Seamless pipe (high temp)' },
  { astmSpec: 'A335', grade: 'P5', uns: 'K41545', pNumber: 5, group: 1, tensileStrengthKsi: 60, nominalComposition: '5Cr-0.5Mo', productForm: 'Seamless pipe (high temp)' },
  { astmSpec: 'A335', grade: 'P9', uns: 'K90941', pNumber: 5, group: 1, tensileStrengthKsi: 60, nominalComposition: '9Cr-1Mo', productForm: 'Seamless pipe (high temp)' },
  { astmSpec: 'A335', grade: 'P91', uns: 'K90901', pNumber: 15, group: 1, tensileStrengthKsi: 85, nominalComposition: '9Cr-1Mo-V', productForm: 'Seamless pipe (high temp)' },
  { astmSpec: 'A335', grade: 'P92', uns: 'K92460', pNumber: 15, group: 1, tensileStrengthKsi: 90, nominalComposition: '9Cr-2W', productForm: 'Seamless pipe (high temp)' },
  { astmSpec: 'A358', grade: '304', uns: 'S30400', pNumber: 8, group: 1, tensileStrengthKsi: 75, nominalComposition: '18Cr-8Ni', productForm: 'Electric-fusion welded pipe' },
  { astmSpec: 'A358', grade: '316', uns: 'S31600', pNumber: 8, group: 1, tensileStrengthKsi: 75, nominalComposition: '16Cr-12Ni-2Mo', productForm: 'Electric-fusion welded pipe' },
  { astmSpec: 'A358', grade: '321', uns: 'S32100', pNumber: 8, group: 1, tensileStrengthKsi: 75, nominalComposition: '18Cr-10Ni-Ti', productForm: 'Electric-fusion welded pipe' },
  { astmSpec: 'A181', grade: 'Cl. 60', uns: 'K03502', pNumber: 1, group: 1, tensileStrengthKsi: 60, nominalComposition: 'C-Si', productForm: 'Forging (flanges, fittings)' },
  { astmSpec: 'A181', grade: 'Cl. 70', uns: 'K03502', pNumber: 1, group: 2, tensileStrengthKsi: 70, nominalComposition: 'C-Si', productForm: 'Forging (flanges, fittings)' },
  { astmSpec: 'API 5L', grade: 'B', uns: 'K03005', pNumber: 1, group: 1, tensileStrengthKsi: 60, nominalComposition: 'C-Mn', productForm: 'Line pipe' },
  { astmSpec: 'API 5L', grade: 'X42', uns: 'K03005', pNumber: 1, group: 1, tensileStrengthKsi: 60, nominalComposition: 'C-Mn', productForm: 'Line pipe' },
  { astmSpec: 'API 5L', grade: 'X52', uns: 'K03005', pNumber: 1, group: 2, tensileStrengthKsi: 66, nominalComposition: 'C-Mn', productForm: 'Line pipe' },
  { astmSpec: 'API 5L', grade: 'X60', uns: 'K03005', pNumber: 1, group: 2, tensileStrengthKsi: 75, nominalComposition: 'C-Mn', productForm: 'Line pipe' },
]

export const BEND_TEST_REQUIREMENTS = {
  transverseSideBend: {
    description: 'Weld transverse to specimen length, bent so side surface becomes convex',
    applicableThickness: 'Over 3/8" (10mm)',
    bendRadius: '4t for most materials',
  },
  transverseFaceBend: {
    description: 'Weld transverse to specimen length, bent so face surface becomes convex',
    applicableThickness: 'Up to 3/8" (10mm)',
    bendRadius: '4t for most materials',
  },
  transverseRootBend: {
    description: 'Weld transverse to specimen length, bent so root surface becomes convex',
    applicableThickness: 'Up to 3/8" (10mm)',
    bendRadius: '4t for most materials',
  },
  acceptanceCriteria: {
    maxOpenDiscontinuity: '1/8" (3mm) in any direction',
    cornerCracks: 'Cracks at corners not counted unless evidence of slag inclusion or fusion defect',
  },
}

export function pNumberForMaterial(astmSpec: string, grade?: string): { pNumber: number; group: number } | null {
  const normalizedSpec = astmSpec.toUpperCase().replace(/\s+/g, '').replace('ASTM', '').replace('ASME', '').replace('SA-', 'A').replace('SA', 'A')
  const entry = PIPE_MATERIAL_TO_P_NUMBER.find(m => {
    const specMatch = m.astmSpec.toUpperCase().replace(/\s+/g, '') === normalizedSpec || normalizedSpec.includes(m.astmSpec.toUpperCase())
    if (!specMatch) return false
    if (grade && m.grade) {
      return m.grade.toUpperCase() === grade.toUpperCase()
    }
    return true
  })
  if (entry) {
    return { pNumber: entry.pNumber, group: entry.group }
  }
  return null
}

export function qualifiedPositionsForTest(testPosition: string, weldType: 'groove' | 'fillet'): string[] {
  const positions = weldType === 'groove' ? GROOVE_WELD_POSITIONS : FILLET_WELD_POSITIONS
  const position = positions.find(p => p.code === testPosition.toUpperCase())
  return position?.qualified || []
}

export function materialDescription(pNumber: number, group: number): string {
  const key = `P${pNumber}-${group}`
  const pGroup = ASME_P_NUMBERS[key]
  return pGroup?.description || `P-No. ${pNumber} Group ${group}`
}
