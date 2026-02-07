// 3D Rendering Standards for Pipe Fabrication Previews
// Based on: ASME Y14.5, ISO 129-1:2018, AWS D1.1, Three.js PBR best practices

// =============================================================================
// MATERIAL STANDARDS (PBR - Physically Based Rendering)
// =============================================================================

// Steel pipe materials - high metalness for realistic industrial look
export const PIPE_MATERIALS = {
  outer: { color: "#2E8B57", metalness: 0.85, roughness: 0.25, envMapIntensity: 1.2 },
  inner: { color: "#1a3a1a", metalness: 0.7, roughness: 0.4, envMapIntensity: 0.8 },
  end: { color: "#4ADE80", metalness: 0.8, roughness: 0.2, envMapIntensity: 1.0 },
} as const;

// Weld materials - darker with matte finish to show weld bead texture
export const WELD_MATERIALS = {
  standard: { color: "#2a2a2a", metalness: 0.6, roughness: 0.7, envMapIntensity: 0.5 },
  highlighted: { color: "#444444", metalness: 0.5, roughness: 0.6, envMapIntensity: 0.6 },
} as const;

// Flange and bolt materials - polished machined surfaces
export const FLANGE_MATERIALS = {
  standard: { color: "#888888", metalness: 0.9, roughness: 0.15, envMapIntensity: 1.3 },
  bolt: { color: "#b0b0b0", metalness: 0.9, roughness: 0.15, envMapIntensity: 1.3 },
  blank: { color: "#cc3300", metalness: 0.85, roughness: 0.2, envMapIntensity: 1.2 },
} as const;

// Steelwork materials (base plates, gussets, ribs)
export const STEELWORK_MATERIALS = {
  basePlate: { color: "#555555", metalness: 0.85, roughness: 0.2, envMapIntensity: 1.2 },
  rib: { color: "#666666", metalness: 0.8, roughness: 0.25, envMapIntensity: 1.0 },
  gussetBlue: { color: "#0066cc", metalness: 0.8, roughness: 0.25, envMapIntensity: 1.0 },
  gussetYellow: { color: "#cc8800", metalness: 0.8, roughness: 0.25, envMapIntensity: 1.0 },
} as const;

// =============================================================================
// LIGHTING STANDARDS (Three-Point Setup for Industrial Rendering)
// =============================================================================

export const LIGHTING_CONFIG = {
  ambient: { intensity: 0.4 },
  keyLight: { position: [10, 15, 10] as [number, number, number], intensity: 2.5 },
  fillLight: { position: [-8, 10, -5] as [number, number, number], intensity: 1.5 },
  rimLight: { position: [0, -5, 0] as [number, number, number], intensity: 0.8 },
  environment: { preset: "warehouse" as const, background: false },
  shadowMapSize: 1024,
} as const;

// =============================================================================
// DIMENSION LINE STANDARDS (ASME Y14.5 / ISO 129-1:2018)
// =============================================================================

export const DIMENSION_STANDARDS = {
  // Extension lines
  extensionGap: 0.02,
  extensionOvershoot: 0.04,
  extensionLineWeight: 1.5,

  // Dimension lines
  dimensionLineWeight: 2,
  boldLineWeight: 3,

  // Arrow heads (20° angle per ASME/ISO)
  arrowAngle: Math.PI * 0.89,
  arrowLengthRatio: 0.08,
  arrowMaxLength: 0.1,
  arrowMinLength: 0.04,
  arrowWidthRatio: 0.4,

  // Text
  minFontSize: 0.12,
  fontSizeRatio: 0.35,
  textOffset: 0.12,

  // Colors by dimension type
  colors: {
    tangent1: "#0066cc",
    tangent2: "#cc0000",
    centerToFace: "#cc6600",
    closure: "#cc6600",
    pipeA: "#009900",
    rotatingFlange: "#ea580c",
    stub: "#9333ea",
    stubDistance: "#22c55e",
  },
} as const;

// =============================================================================
// WELD CALCULATION CONSTANTS (AWS D1.1)
// =============================================================================

export const WELD_CONSTANTS = {
  // Steinmetz curve factor for 90° equal-diameter pipe intersection
  // Derived from elliptic integral of bicylindric curve arc length
  STEINMETZ_FACTOR: 2.7,

  // AWS D1.1 Clause 9.6.1.3(4) effective weld length factor
  // Under factored loads, effective length = total length × (1/1.5)
  AWS_EFFECTIVE_FACTOR: 1 / 1.5,

  // Fillet weld leg size ratio to wall thickness
  FILLET_LEG_RATIO: 0.7,

  // Tack weld constants
  TACK_WELD_COUNT_PER_END: 8,
  TACK_WELD_LENGTH_MM: 20,
} as const;

// =============================================================================
// GEOMETRY SCALE AND PRECISION
// =============================================================================

export const GEOMETRY_CONSTANTS = {
  // Standard scale factor (mm to scene units)
  SCALE: 200,

  // Minimum visual wall thickness ratio
  MIN_VISUAL_WALL_RATIO: 0.08,

  // Tube geometry segments
  TUBE_RADIAL_SEGMENTS: 32,
  TUBE_TUBULAR_SEGMENTS: 64,

  // Arc/curve segments
  ARC_SEGMENTS: 32,
  CURVE_SEGMENTS: 64,

  // Weld tube thickness ratio
  WELD_TUBE_RATIO: 0.06,
} as const;

// =============================================================================
// STEELWORK STANDARDS (Duckfoot bends)
// =============================================================================

export const STEELWORK_STANDARDS = {
  // Gusset positioning - positioned at extrados of bend
  // Support foot at transition point where horizontal meets vertical

  // Base plate sizing by nominal bore (mm)
  duckfootDefaults: {
    200: { x: 355, y: 230, h: 255 },
    250: { x: 405, y: 280, h: 280 },
    300: { x: 460, y: 330, h: 305 },
    350: { x: 510, y: 380, h: 330 },
    400: { x: 560, y: 430, h: 355 },
    450: { x: 610, y: 485, h: 380 },
    500: { x: 660, y: 535, h: 405 },
    550: { x: 710, y: 585, h: 430 },
    600: { x: 760, y: 635, h: 460 },
    650: { x: 815, y: 693, h: 485 },
    700: { x: 865, y: 733, h: 510 },
    750: { x: 915, y: 793, h: 535 },
    800: { x: 970, y: 833, h: 560 },
    850: { x: 1020, y: 883, h: 585 },
    900: { x: 1070, y: 933, h: 610 },
  } as Record<number, { x: number; y: number; h: number }>,

  // Default gusset angles (degrees)
  defaultPointD: 15,
  defaultPointC: 75,

  // Default plate thicknesses
  defaultPlateThickness: 12,
  defaultRibThickness: 10,
} as const;

// =============================================================================
// NOMINAL BORE TO OD LOOKUP
// =============================================================================

export const NB_TO_OD_LOOKUP: Record<number, number> = {
  15: 21.3,
  20: 26.7,
  25: 33.4,
  32: 42.2,
  40: 48.3,
  50: 60.3,
  65: 73.0,
  80: 88.9,
  100: 114.3,
  125: 139.7,
  150: 168.3,
  200: 219.1,
  250: 273.0,
  300: 323.9,
  350: 355.6,
  400: 406.4,
  450: 457.2,
  500: 508.0,
  550: 559.0,
  600: 609.6,
  650: 660.4,
  700: 711.2,
  750: 762.0,
  800: 812.8,
  850: 863.6,
  900: 914.4,
};

export const nbToOd = (nb: number): number => NB_TO_OD_LOOKUP[nb] || nb * 1.05;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export const calculateVisualWallThickness = (od: number, actualWt: number): number => {
  const minVisualWt = od * GEOMETRY_CONSTANTS.MIN_VISUAL_WALL_RATIO;
  return Math.max(actualWt, minVisualWt);
};

export const calculateArrowSize = (dimensionLength: number): { length: number; width: number } => {
  const length = Math.min(
    DIMENSION_STANDARDS.arrowMaxLength,
    Math.max(
      DIMENSION_STANDARDS.arrowMinLength,
      dimensionLength * DIMENSION_STANDARDS.arrowLengthRatio,
    ),
  );
  return {
    length,
    width: length * DIMENSION_STANDARDS.arrowWidthRatio,
  };
};

export const calculateSteinmetzWeldLength = (odMm: number): number => {
  return WELD_CONSTANTS.STEINMETZ_FACTOR * odMm;
};

export const calculateEffectiveWeldLength = (totalLength: number): number => {
  return totalLength * WELD_CONSTANTS.AWS_EFFECTIVE_FACTOR;
};
