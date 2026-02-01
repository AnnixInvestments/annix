// Calculation Results Display Standards
// =====================================================================
// This file documents the standard for displaying calc results across
// all forms (Pipes, Bends, Fittings). ALL calc results MUST be purely
// data-driven based on user input values, NOT based on item types.
//
// PRINCIPLE: "If the user didn't enter it, don't show it"
// =====================================================================

// =====================================================================
// DATA-DRIVEN DISPLAY RULES
// =====================================================================
//
// 1. NEVER use item type conditions for display:
//    ❌ {isSweepTee && value > 0 && <Display />}
//    ✅ {value > 0 && <Display />}
//
// 2. ALWAYS check the actual data value:
//    ❌ {bendItemType === 'SWEEP_TEE' && <Show saddle weld />}
//    ✅ {saddleWeldLength > 0 && <Show saddle weld />}
//
// 3. For arrays, check length:
//    ❌ {numberOfStubs > 0 && <Show stubs />}
//    ✅ {stubs?.length > 0 && stubs[0]?.nominalBoreMm && <Show stubs />}
//
// 4. For optional sections, check if the underlying calculation produced a value:
//    ✅ {tangentWeight > 0 && <Show tangent weight />}
//    ✅ {closureTotalWeight > 0 && <Show closure weight />}
//
// =====================================================================
// CALCULATION RULES
// =====================================================================
//
// Calculations SHOULD use the data to determine what to calculate, not types:
//
// ✅ Saddle weld: Calculate when there's branch/tee geometry
//    const hasBranchGeometry = mainOdMm > 0 && (branchOdMm > 0 || sweepTeePipeALengthMm > 0)
//    const saddleWeldLength = hasBranchGeometry ? STEINMETZ_FACTOR * mainOdMm : 0
//
// ✅ Mitre welds: Calculate when segments > 1
//    const mitreWeldCount = (numberOfSegments || 0) > 1 ? numberOfSegments - 1 : 0
//
// ✅ Tangent weight: Calculate when tangent lengths exist
//    const tangentWeight = tangentTotalLength > 0 ? calculateWeight(...) : 0
//
// ✅ Duckfoot welds: Calculate when duckfoot dimensions exist
//    const hasDuckfootGeometry = (duckfootBasePlateXMm || 0) > 0
//    const duckfootWelds = hasDuckfootGeometry ? calculateDuckfootWelds(...) : 0
//
// =====================================================================
// FORM RESPONSIBILITIES
// =====================================================================
//
// When item types change, forms MUST clear irrelevant data:
//
// - SWEEP_TEE selected:
//   → Clear: numberOfTangents, tangentLengths, numberOfStubs, stubs, closureLengthMm
//   → Keep/Set: sweepTeePipeALengthMm, bendDegrees (90°)
//
// - DUCKFOOT_BEND selected:
//   → Clear: numberOfTangents, tangentLengths, numberOfStubs, stubs
//   → Keep/Set: duckfoot dimensions, bendDegrees (90°)
//
// - Regular BEND selected:
//   → Clear: sweepTeePipeALengthMm, duckfoot dimensions
//   → Keep: tangent/stub configuration
//
// This ensures calc results naturally show only relevant information
// because the irrelevant data has been cleared.
//
// =====================================================================
// DISPLAY SECTION PATTERNS
// =====================================================================

export type CalcResultSection =
  | 'dimensions'
  | 'flanges'
  | 'weightBreakdown'
  | 'weldSummary'
  | 'surfaceArea'

export interface DataDrivenCondition {
  section: CalcResultSection
  showWhen: string
  description: string
}

export const CALC_RESULT_DISPLAY_CONDITIONS: DataDrivenCondition[] = [
  // Dimensions Section
  {
    section: 'dimensions',
    showWhen: 'Always show if calculation exists',
    description: 'Shows center-to-face, radius, main length. Sub-items conditional:'
  },
  {
    section: 'dimensions',
    showWhen: 'sweepTeePipeALengthMm > 0',
    description: 'Show Pipe A length'
  },
  {
    section: 'dimensions',
    showWhen: 'stubLengthDisplay !== ""',
    description: 'Show stub lengths (calculated from stubs array data)'
  },
  {
    section: 'dimensions',
    showWhen: 'closureLengthMm > 0',
    description: 'Show closure length'
  },

  // Flanges Section
  {
    section: 'flanges',
    showWhen: 'totalFlanges > 0',
    description: 'Show total flanges count and breakdown'
  },
  {
    section: 'flanges',
    showWhen: 'bendFlangeCount > 0',
    description: 'Show main bend flange count'
  },
  {
    section: 'flanges',
    showWhen: 'stub1FlangeCount > 0',
    description: 'Show stub 1 flange count'
  },
  {
    section: 'flanges',
    showWhen: 'stub2FlangeCount > 0',
    description: 'Show stub 2 flange count'
  },

  // Weight Breakdown Section
  {
    section: 'weightBreakdown',
    showWhen: 'Always show if calculation exists',
    description: 'Shows total weight. Sub-items conditional:'
  },
  {
    section: 'weightBreakdown',
    showWhen: 'bendWeightOnly > 0',
    description: 'Show bend weight'
  },
  {
    section: 'weightBreakdown',
    showWhen: 'tangentWeight > 0',
    description: 'Show tangent weight'
  },
  {
    section: 'weightBreakdown',
    showWhen: 'pipeAWeight > 0',
    description: 'Show Pipe A weight'
  },
  {
    section: 'weightBreakdown',
    showWhen: 'stub1PipeWeight > 0 && stubs?.[0]?.nominalBoreMm',
    description: 'Show stub 1 weight with NB'
  },
  {
    section: 'weightBreakdown',
    showWhen: 'stub2PipeWeight > 0 && stubs?.[1]?.nominalBoreMm',
    description: 'Show stub 2 weight with NB'
  },
  {
    section: 'weightBreakdown',
    showWhen: 'dynamicTotalFlangeWeight > 0',
    description: 'Show flange weight'
  },
  {
    section: 'weightBreakdown',
    showWhen: 'totalBlankFlangeWeight > 0',
    description: 'Show blank flange weight'
  },
  {
    section: 'weightBreakdown',
    showWhen: 'closureTotalWeight > 0',
    description: 'Show closure weight'
  },

  // Weld Summary Section
  {
    section: 'weldSummary',
    showWhen: 'calculatedTotalWeld > 0',
    description: 'Show total weld length. Sub-items conditional:'
  },
  {
    section: 'weldSummary',
    showWhen: 'mitreWeldCount > 0',
    description: 'Show mitre weld breakdown'
  },
  {
    section: 'weldSummary',
    showWhen: 'buttWeldCount > 0',
    description: 'Show butt weld breakdown'
  },
  {
    section: 'weldSummary',
    showWhen: 'bendFlangeWeldCount > 0',
    description: 'Show flange weld breakdown'
  },
  {
    section: 'weldSummary',
    showWhen: 'saddleWeldLinear > 0',
    description: 'Show saddle weld (for sweep tees with branch geometry)'
  },
  {
    section: 'weldSummary',
    showWhen: 'totalDuckfootWeld > 0',
    description: 'Show duckfoot weld breakdown (when duckfoot geometry exists)'
  },
  {
    section: 'weldSummary',
    showWhen: 'tackWeldLinear > 0',
    description: 'Show tack weld (for loose flange configs)'
  },
  {
    section: 'weldSummary',
    showWhen: 'teeStub1Circ > 0 && stubs?.[0]?.nominalBoreMm',
    description: 'Show tee stub 1 weld'
  },
  {
    section: 'weldSummary',
    showWhen: 'teeStub2Circ > 0 && stubs?.[1]?.nominalBoreMm',
    description: 'Show tee stub 2 weld'
  },

  // Surface Area Section
  {
    section: 'surfaceArea',
    showWhen: 'requiredProducts.includes("surface_protection") && mainOdMm > 0',
    description: 'Show surface area calculations for lining/coating'
  },
]

// =====================================================================
// HELPER: Check if value should be displayed
// =====================================================================

export const shouldDisplay = {
  number: (value: number | undefined | null): boolean =>
    value !== undefined && value !== null && !isNaN(value) && value > 0,

  string: (value: string | undefined | null): boolean =>
    value !== undefined && value !== null && value.trim() !== '',

  array: <T>(value: T[] | undefined | null): boolean =>
    Array.isArray(value) && value.length > 0,

  object: <T extends object>(value: T | undefined | null, requiredKey?: keyof T): boolean => {
    if (value === undefined || value === null) return false
    if (!requiredKey) return Object.keys(value).length > 0
    const keyValue = value[requiredKey]
    if (typeof keyValue === 'number') return keyValue > 0
    if (typeof keyValue === 'string') return keyValue.trim() !== ''
    return keyValue !== undefined && keyValue !== null
  },
}

// =====================================================================
// REFERENCE: Type-based conditions that MUST be removed
// =====================================================================
//
// The following patterns MUST be replaced with data-driven conditions:
//
// ❌ isSweepTeeItem && ... → ✅ data-based condition
// ❌ isSweepTee && ... → ✅ data-based condition
// ❌ isDuckfootBend && ... → ✅ data-based condition
// ❌ entry.specs?.bendItemType === 'SWEEP_TEE' && ... → ✅ data-based condition
// ❌ entry.specs?.bendItemType === 'DUCKFOOT_BEND' && ... → ✅ data-based condition
//
// Exception: Item type CAN be used in CALCULATION logic to determine
// what to calculate, but the DISPLAY must be based on whether the
// calculation produced a non-zero value.
//
// =====================================================================
