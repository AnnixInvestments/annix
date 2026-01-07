import {
  BLANK_FLANGE_WEIGHT,
  FLANGE_WEIGHT_BY_PRESSURE_CLASS,
  BOLT_HOLES_BY_NB_AND_PRESSURE,
  BNW_SET_WEIGHT_PER_HOLE,
  GASKET_WEIGHTS,
} from '../constants/flangeData';

export const normalizePressureClass = (designation: string): string => {
  if (!designation) return 'PN16';
  const upper = designation.toUpperCase().replace(/\s+/g, '');
  if (upper.includes('PN6') && !upper.includes('PN64')) return 'PN6';
  if (upper.includes('PN10')) return 'PN10';
  if (upper.includes('PN16') || upper.includes('1600')) return 'PN16';
  if (upper.includes('PN25') || upper.includes('2500')) return 'PN25';
  if (upper.includes('PN40') || upper.includes('4000')) return 'PN40';
  if (upper.includes('PN64') || upper.includes('6400')) return 'PN64';
  if (upper.includes('CLASS150') || upper === '150') return 'Class 150';
  if (upper.includes('CLASS300') || upper === '300') return 'Class 300';
  if (upper.includes('CLASS600') || upper === '600') return 'Class 600';
  if (upper.includes('CLASS900') || upper === '900') return 'Class 600';
  if (upper.includes('CLASS1500') || upper === '1500') return 'Class 600';
  if (upper.includes('CLASS2500') || upper === '2500') return 'Class 600';
  const match = upper.match(/PN(\d+)/);
  if (match) {
    const pn = parseInt(match[1], 10);
    if (pn <= 6) return 'PN6';
    if (pn <= 10) return 'PN10';
    if (pn <= 16) return 'PN16';
    if (pn <= 25) return 'PN25';
    if (pn <= 40) return 'PN40';
    return 'PN64';
  }
  return 'PN16';
};

export const blankFlangeWeight = (nbMm: number, pressureClass: string): number => {
  const pcNormalized = pressureClass?.toUpperCase().replace(/\s+/g, '') || 'PN16';
  const pcLookup = pcNormalized.includes('PN40') || pcNormalized.includes('CLASS300') ? 'PN40' :
                   pcNormalized.includes('PN25') || pcNormalized.includes('CLASS150') ? 'PN25' :
                   pcNormalized.includes('PN10') ? 'PN10' : 'PN16';
  return BLANK_FLANGE_WEIGHT[pcLookup]?.[nbMm] || (nbMm * 0.15);
};

export const blankFlangeSurfaceArea = (nbMm: number): { external: number; internal: number } => {
  const FLANGE_OD: Record<number, number> = { 50: 165, 65: 185, 80: 200, 100: 220, 125: 250, 150: 285, 200: 340, 250: 395, 300: 445, 350: 505, 400: 565, 450: 615, 500: 670, 600: 780, 700: 885, 750: 940, 800: 1015, 900: 1115 };
  const flangeOdMm = FLANGE_OD[nbMm] || nbMm * 1.7;
  const flangeThicknessMm = Math.max(20, nbMm * 0.08);
  const singleFaceAreaM2 = Math.PI * Math.pow(flangeOdMm / 2000, 2);
  const edgeAreaM2 = Math.PI * (flangeOdMm / 1000) * (flangeThicknessMm / 1000);
  return { external: singleFaceAreaM2 + edgeAreaM2, internal: singleFaceAreaM2 };
};

export const boltHolesPerFlange = (nbMm: number, pressureClass: string): number => {
  const normalized = normalizePressureClass(pressureClass);
  const classData = BOLT_HOLES_BY_NB_AND_PRESSURE[normalized];
  if (!classData) return 8;
  return classData[nbMm] || 8;
};

export const bnwSetInfo = (nbMm: number, pressureClass: string): { boltSize: string; weightPerHole: number; holesPerFlange: number } => {
  const normalized = normalizePressureClass(pressureClass);
  const classData = BNW_SET_WEIGHT_PER_HOLE[normalized];
  const holesPerFlange = boltHolesPerFlange(nbMm, normalized);

  if (!classData || !classData[nbMm]) {
    return { boltSize: 'M16x65', weightPerHole: 0.18, holesPerFlange };
  }

  return {
    boltSize: classData[nbMm].boltSize,
    weightPerHole: classData[nbMm].weight,
    holesPerFlange
  };
};

export const gasketWeight = (gasketType: string, nbMm: number): number => {
  const sizes = Object.keys(GASKET_WEIGHTS).map(Number).sort((a, b) => a - b);
  let closestSize = sizes[0];
  sizes.forEach(size => {
    if (size <= nbMm) closestSize = size;
  });

  const weights = GASKET_WEIGHTS[closestSize];
  if (!weights) return 0;

  if (gasketType.startsWith('SW-') || gasketType.includes('Spiral')) {
    return weights.spiralWound;
  }
  if (gasketType.includes('RTJ') || gasketType.includes('Ring')) {
    return weights.rtj;
  }
  if (gasketType.includes('PTFE') || gasketType.includes('Teflon')) {
    return weights.ptfe;
  }
  if (gasketType.includes('Graphite') || gasketType.includes('Flexible')) {
    return weights.graphite;
  }
  if (gasketType.includes('CAF') || gasketType.includes('Compressed')) {
    return weights.caf;
  }
  if (gasketType.includes('Rubber') || gasketType.includes('EPDM') || gasketType.includes('NBR')) {
    return weights.rubber;
  }
  return weights.caf;
};

export const flangeWeight = (
  nbMm: number,
  pressureClass: string,
  flangeStandardCode?: string
): number => {
  const normalized = normalizePressureClass(pressureClass);
  let classWeights = FLANGE_WEIGHT_BY_PRESSURE_CLASS[normalized];

  if (!classWeights) {
    if (normalized.includes('Class')) {
      const classNum = parseInt(normalized.replace('Class ', ''), 10);
      if (classNum >= 600) {
        classWeights = FLANGE_WEIGHT_BY_PRESSURE_CLASS['Class 600'];
      } else if (classNum >= 300) {
        classWeights = FLANGE_WEIGHT_BY_PRESSURE_CLASS['Class 300'];
      } else {
        classWeights = FLANGE_WEIGHT_BY_PRESSURE_CLASS['Class 150'];
      }
    } else {
      classWeights = FLANGE_WEIGHT_BY_PRESSURE_CLASS['PN16'];
    }
  }

  if (classWeights && classWeights[nbMm]) {
    return classWeights[nbMm];
  }

  const sizes = Object.keys(classWeights || {}).map(Number).sort((a, b) => a - b);
  if (sizes.length === 0) {
    return nbMm * 0.35;
  }

  let lowerSize = sizes[0];
  let upperSize = sizes[sizes.length - 1];
  sizes.forEach((size, index) => {
    if (size <= nbMm) lowerSize = size;
    if (size > nbMm && (index === 0 || sizes[index - 1] <= nbMm)) upperSize = size;
  });

  if (nbMm <= lowerSize) return classWeights![lowerSize];
  if (nbMm >= upperSize) return classWeights![upperSize];

  const lowerWeight = classWeights![lowerSize];
  const upperWeight = classWeights![upperSize];
  const fraction = (nbMm - lowerSize) / (upperSize - lowerSize);
  return lowerWeight + (upperWeight - lowerWeight) * fraction;
};
