export const BLANK_FLANGE_WEIGHT: Record<string, Record<number, number>> = {
  'PN10': { 50: 2.5, 65: 3.5, 80: 4.5, 100: 6.0, 125: 8.5, 150: 11.0, 200: 16.5, 250: 25.0, 300: 36.0, 350: 46.0, 400: 58.0, 450: 72.0, 500: 90.0, 600: 120.0, 700: 155.0, 750: 175.0, 800: 200.0, 900: 250.0 },
  'PN16': { 50: 3.0, 65: 4.2, 80: 5.4, 100: 7.2, 125: 10.2, 150: 13.2, 200: 19.8, 250: 30.0, 300: 43.2, 350: 55.2, 400: 69.6, 450: 86.4, 500: 108.0, 600: 144.0, 700: 186.0, 750: 210.0, 800: 240.0, 900: 300.0 },
  'PN25': { 50: 4.0, 65: 5.6, 80: 7.2, 100: 9.6, 125: 13.6, 150: 17.6, 200: 26.4, 250: 40.0, 300: 57.6, 350: 73.6, 400: 92.8, 450: 115.2, 500: 144.0, 600: 192.0, 700: 248.0, 750: 280.0, 800: 320.0, 900: 400.0 },
  'PN40': { 50: 5.5, 65: 7.7, 80: 9.9, 100: 13.2, 125: 18.7, 150: 24.2, 200: 36.3, 250: 55.0, 300: 79.2, 350: 101.2, 400: 127.6, 450: 158.4, 500: 198.0, 600: 264.0, 700: 341.0, 750: 385.0, 800: 440.0, 900: 550.0 }
};

export const blankFlangeWeight = (nbMm: number, pressureClass: string): number => {
  const pcNormalized = pressureClass?.toUpperCase().replace(/\s+/g, '') || 'PN16';
  const pcLookup = pcNormalized.includes('PN40') || pcNormalized.includes('CLASS300') ? 'PN40' :
                   pcNormalized.includes('PN25') || pcNormalized.includes('CLASS150') ? 'PN25' :
                   pcNormalized.includes('PN10') ? 'PN10' : 'PN16';
  return BLANK_FLANGE_WEIGHT[pcLookup]?.[nbMm] || (nbMm * 0.15);
};

const FLANGE_OD: Record<number, number> = { 50: 165, 65: 185, 80: 200, 100: 220, 125: 250, 150: 285, 200: 340, 250: 395, 300: 445, 350: 505, 400: 565, 450: 615, 500: 670, 600: 780, 700: 885, 750: 940, 800: 1015, 900: 1115 };

export const blankFlangeSurfaceArea = (nbMm: number): { external: number; internal: number } => {
  const flangeOdMm = FLANGE_OD[nbMm] || nbMm * 1.7;
  const flangeThicknessMm = Math.max(20, nbMm * 0.08);
  const singleFaceAreaM2 = Math.PI * Math.pow(flangeOdMm / 2000, 2);
  const edgeAreaM2 = Math.PI * (flangeOdMm / 1000) * (flangeThicknessMm / 1000);
  return { external: singleFaceAreaM2 + edgeAreaM2, internal: singleFaceAreaM2 };
};

export const NB_TO_OD_LOOKUP: Record<number, number> = {
  15: 21.3, 20: 26.7, 25: 33.4, 32: 42.2, 40: 48.3, 50: 60.3, 65: 73.0, 80: 88.9,
  100: 114.3, 125: 139.7, 150: 168.3, 200: 219.1, 250: 273.0, 300: 323.9,
  350: 355.6, 400: 406.4, 450: 457.2, 500: 508.0, 600: 609.6, 700: 711.2,
  750: 762.0, 800: 812.8, 900: 914.4, 1000: 1016.0, 1050: 1066.8, 1200: 1219.2
};

export const FLANGE_WEIGHT_BY_PRESSURE_CLASS: Record<string, Record<number, number>> = {
  'PN10': {
    15: 0.6, 20: 0.8, 25: 1.0, 32: 1.3, 40: 1.6, 50: 2.0, 65: 2.8, 80: 3.6,
    100: 4.8, 125: 6.8, 150: 8.8, 200: 12.8, 250: 19.2, 300: 28.0, 350: 36.0,
    400: 44.0, 450: 56.0, 500: 72.0, 600: 96.0, 700: 120.0, 750: 136.0,
    800: 152.0, 900: 192.0, 1000: 240.0, 1050: 280.0, 1200: 400.0
  },
  'PN16': {
    15: 0.8, 20: 1.0, 25: 1.2, 32: 1.6, 40: 2.0, 50: 2.5, 65: 3.5, 80: 4.5,
    100: 6.0, 125: 8.5, 150: 11.0, 200: 16.0, 250: 24.0, 300: 35.0, 350: 45.0,
    400: 55.0, 450: 70.0, 500: 90.0, 600: 120.0, 700: 150.0, 750: 170.0,
    800: 190.0, 900: 240.0, 1000: 300.0, 1050: 350.0, 1200: 500.0
  },
  'PN25': {
    15: 1.0, 20: 1.3, 25: 1.5, 32: 2.0, 40: 2.5, 50: 3.2, 65: 4.4, 80: 5.6,
    100: 7.5, 125: 10.6, 150: 13.8, 200: 20.0, 250: 30.0, 300: 43.8, 350: 56.3,
    400: 68.8, 450: 87.5, 500: 112.5, 600: 150.0, 700: 187.5, 750: 212.5,
    800: 237.5, 900: 300.0, 1000: 375.0, 1050: 437.5, 1200: 625.0
  },
  'PN40': {
    15: 1.2, 20: 1.5, 25: 1.8, 32: 2.4, 40: 3.0, 50: 3.8, 65: 5.3, 80: 6.8,
    100: 9.0, 125: 12.8, 150: 16.5, 200: 24.0, 250: 36.0, 300: 52.5, 350: 67.5,
    400: 82.5, 450: 105.0, 500: 135.0, 600: 180.0, 700: 225.0, 750: 255.0,
    800: 285.0, 900: 360.0, 1000: 450.0, 1050: 525.0, 1200: 750.0
  },
  'PN64': {
    15: 1.6, 20: 2.0, 25: 2.4, 32: 3.2, 40: 4.0, 50: 5.0, 65: 7.0, 80: 9.0,
    100: 12.0, 125: 17.0, 150: 22.0, 200: 32.0, 250: 48.0, 300: 70.0, 350: 90.0,
    400: 110.0, 450: 140.0, 500: 180.0, 600: 240.0, 700: 300.0, 750: 340.0,
    800: 380.0, 900: 480.0, 1000: 600.0, 1050: 700.0, 1200: 1000.0
  },
  'Class 150': {
    15: 0.8, 20: 1.0, 25: 1.2, 32: 1.6, 40: 2.0, 50: 2.5, 65: 3.5, 80: 4.5,
    100: 6.0, 125: 8.5, 150: 11.0, 200: 16.0, 250: 24.0, 300: 35.0, 350: 45.0,
    400: 55.0, 450: 70.0, 500: 90.0, 600: 120.0, 700: 150.0, 750: 170.0,
    800: 190.0, 900: 240.0, 1000: 300.0, 1050: 350.0, 1200: 500.0
  },
  'Class 300': {
    15: 1.2, 20: 1.5, 25: 1.8, 32: 2.4, 40: 3.0, 50: 3.8, 65: 5.3, 80: 6.8,
    100: 9.0, 125: 12.8, 150: 16.5, 200: 24.0, 250: 36.0, 300: 52.5, 350: 67.5,
    400: 82.5, 450: 105.0, 500: 135.0, 600: 180.0, 700: 225.0, 750: 255.0,
    800: 285.0, 900: 360.0, 1000: 450.0, 1050: 525.0, 1200: 750.0
  },
  'Class 600': {
    15: 2.0, 20: 2.5, 25: 3.0, 32: 4.0, 40: 5.0, 50: 6.3, 65: 8.8, 80: 11.3,
    100: 15.0, 125: 21.3, 150: 27.5, 200: 40.0, 250: 60.0, 300: 87.5, 350: 112.5,
    400: 137.5, 450: 175.0, 500: 225.0, 600: 300.0, 700: 375.0, 750: 425.0,
    800: 475.0, 900: 600.0, 1000: 750.0, 1050: 875.0, 1200: 1250.0
  },
};

export const NB_TO_FLANGE_WEIGHT_LOOKUP = FLANGE_WEIGHT_BY_PRESSURE_CLASS['PN16'];

export const BOLT_HOLES_BY_NB_AND_PRESSURE: Record<string, Record<number, number>> = {
  'PN6': { 15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 4, 65: 4, 80: 8, 100: 8, 125: 8, 150: 8, 200: 12, 250: 12, 300: 12, 350: 16, 400: 16, 450: 20, 500: 20, 600: 20, 700: 24, 800: 24, 900: 28, 1000: 28, 1200: 32 },
  'PN10': { 15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 4, 65: 4, 80: 8, 100: 8, 125: 8, 150: 8, 200: 8, 250: 12, 300: 12, 350: 16, 400: 16, 450: 20, 500: 20, 600: 20, 700: 24, 800: 24, 900: 28, 1000: 28, 1200: 32 },
  'PN16': { 15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 4, 65: 4, 80: 8, 100: 8, 125: 8, 150: 8, 200: 12, 250: 12, 300: 12, 350: 16, 400: 16, 450: 20, 500: 20, 600: 20, 700: 24, 800: 24, 900: 28, 1000: 28, 1200: 32 },
  'PN25': { 15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 4, 65: 8, 80: 8, 100: 8, 125: 8, 150: 8, 200: 12, 250: 12, 300: 16, 350: 16, 400: 16, 450: 20, 500: 20, 600: 20 },
  'PN40': { 15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 4, 65: 8, 80: 8, 100: 8, 125: 8, 150: 8, 200: 12, 250: 12, 300: 16, 350: 16, 400: 16, 450: 20, 500: 20 },
  'PN64': { 15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 8, 65: 8, 80: 8, 100: 8, 125: 8, 150: 12, 200: 12, 250: 16, 300: 20, 350: 20, 400: 20, 450: 24, 500: 24, 600: 24, 700: 28, 800: 32, 900: 36, 1000: 36, 1200: 44 },
  'Class 150': { 15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 4, 65: 4, 80: 4, 100: 8, 125: 8, 150: 8, 200: 8, 250: 12, 300: 12, 350: 12, 400: 16, 450: 16, 500: 20, 600: 20, 700: 28, 800: 28, 900: 32, 1000: 36, 1200: 40 },
  'Class 300': { 15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 8, 65: 8, 80: 8, 100: 8, 125: 8, 150: 12, 200: 12, 250: 16, 300: 16, 350: 20, 400: 20, 450: 24, 500: 24, 600: 24, 700: 28, 800: 28, 900: 32, 1000: 32, 1200: 32 },
  'Class 600': { 15: 4, 20: 4, 25: 4, 32: 4, 40: 4, 50: 8, 65: 8, 80: 8, 100: 8, 125: 8, 150: 12, 200: 16, 250: 16, 300: 20, 350: 20, 400: 20, 450: 20, 500: 24, 600: 24, 700: 28 }
};

export const BNW_SET_WEIGHT_PER_HOLE: Record<string, Record<number, { boltSize: string; weight: number }>> = {
  'PN6': {
    15: { boltSize: 'M12x50', weight: 0.056 }, 20: { boltSize: 'M12x50', weight: 0.056 }, 25: { boltSize: 'M12x50', weight: 0.056 }, 32: { boltSize: 'M16x55', weight: 0.113 }, 40: { boltSize: 'M16x55', weight: 0.113 }, 50: { boltSize: 'M16x60', weight: 0.123 }, 65: { boltSize: 'M16x60', weight: 0.123 }, 80: { boltSize: 'M16x65', weight: 0.131 }, 100: { boltSize: 'M16x65', weight: 0.131 }, 125: { boltSize: 'M16x70', weight: 0.138 }, 150: { boltSize: 'M20x80', weight: 0.256 }, 200: { boltSize: 'M20x85', weight: 0.268 }, 250: { boltSize: 'M24x95', weight: 0.436 }, 300: { boltSize: 'M24x110', weight: 0.487 }, 350: { boltSize: 'M24x110', weight: 0.487 }, 400: { boltSize: 'M24x120', weight: 0.522 }, 450: { boltSize: 'M24x130', weight: 0.554 }, 500: { boltSize: 'M30x140', weight: 0.984 }, 600: { boltSize: 'M30x160', weight: 1.092 }, 700: { boltSize: 'M30x170', weight: 1.146 }, 800: { boltSize: 'M36x200', weight: 1.961 }, 900: { boltSize: 'M36x210', weight: 2.027 }, 1000: { boltSize: 'M36x220', weight: 2.105 }, 1200: { boltSize: 'M42x250', weight: 2.55 }
  },
  'PN10': {
    15: { boltSize: 'M12x50', weight: 0.056 }, 20: { boltSize: 'M12x50', weight: 0.056 }, 25: { boltSize: 'M12x50', weight: 0.056 }, 32: { boltSize: 'M16x55', weight: 0.113 }, 40: { boltSize: 'M16x55', weight: 0.113 }, 50: { boltSize: 'M16x55', weight: 0.113 }, 65: { boltSize: 'M16x60', weight: 0.123 }, 80: { boltSize: 'M16x60', weight: 0.123 }, 100: { boltSize: 'M16x60', weight: 0.123 }, 125: { boltSize: 'M16x65', weight: 0.131 }, 150: { boltSize: 'M20x75', weight: 0.244 }, 200: { boltSize: 'M20x80', weight: 0.256 }, 250: { boltSize: 'M20x80', weight: 0.256 }, 300: { boltSize: 'M20x85', weight: 0.268 }, 350: { boltSize: 'M20x90', weight: 0.28 }, 400: { boltSize: 'M24x95', weight: 0.436 }, 450: { boltSize: 'M24x110', weight: 0.487 }, 500: { boltSize: 'M24x110', weight: 0.487 }, 600: { boltSize: 'M24x130', weight: 0.554 }, 700: { boltSize: 'M24x140', weight: 0.588 }, 800: { boltSize: 'M30x160', weight: 1.092 }, 900: { boltSize: 'M30x170', weight: 1.146 }, 1000: { boltSize: 'M30x180', weight: 1.201 }, 1200: { boltSize: 'M36x210', weight: 2.027 }
  },
  'PN16': {
    15: { boltSize: 'M12x60', weight: 0.067 }, 20: { boltSize: 'M12x65', weight: 0.071 }, 25: { boltSize: 'M12x65', weight: 0.071 }, 32: { boltSize: 'M16x70', weight: 0.138 }, 40: { boltSize: 'M16x70', weight: 0.138 }, 50: { boltSize: 'M16x75', weight: 0.146 }, 65: { boltSize: 'M16x75', weight: 0.146 }, 80: { boltSize: 'M16x75', weight: 0.146 }, 100: { boltSize: 'M16x75', weight: 0.146 }, 125: { boltSize: 'M16x80', weight: 0.153 }, 150: { boltSize: 'M20x85', weight: 0.268 }, 200: { boltSize: 'M20x90', weight: 0.28 }, 250: { boltSize: 'M24x100', weight: 0.453 }, 300: { boltSize: 'M24x110', weight: 0.487 }, 350: { boltSize: 'M24x110', weight: 0.487 }, 400: { boltSize: 'M27x130', weight: 0.73 }, 450: { boltSize: 'M27x130', weight: 0.73 }, 500: { boltSize: 'M30x150', weight: 1.038 }, 600: { boltSize: 'M33x170', weight: 1.416 }, 700: { boltSize: 'M33x180', weight: 1.482 }, 800: { boltSize: 'M36x200', weight: 1.961 }, 900: { boltSize: 'M36x210', weight: 2.027 }, 1000: { boltSize: 'M39x230', weight: 2.624 }, 1200: { boltSize: 'M45x270', weight: 4.095 }
  },
  'PN25': {
    15: { boltSize: 'M12x60', weight: 0.067 }, 20: { boltSize: 'M12x60', weight: 0.067 }, 25: { boltSize: 'M12x65', weight: 0.071 }, 32: { boltSize: 'M16x75', weight: 0.146 }, 40: { boltSize: 'M16x75', weight: 0.146 }, 50: { boltSize: 'M16x75', weight: 0.146 }, 65: { boltSize: 'M16x80', weight: 0.153 }, 80: { boltSize: 'M16x80', weight: 0.153 }, 100: { boltSize: 'M20x90', weight: 0.28 }, 125: { boltSize: 'M24x110', weight: 0.487 }, 150: { boltSize: 'M24x110', weight: 0.487 }, 200: { boltSize: 'M24x110', weight: 0.487 }, 250: { boltSize: 'M24x110', weight: 0.487 }, 300: { boltSize: 'M24x110', weight: 0.487 }, 350: { boltSize: 'M30x130', weight: 0.929 }, 400: { boltSize: 'M30x140', weight: 0.984 }, 450: { boltSize: 'M30x150', weight: 1.038 }, 500: { boltSize: 'M30x160', weight: 1.092 }, 600: { boltSize: 'M36x190', weight: 1.882 }
  },
  'PN40': {
    15: { boltSize: 'M12x60', weight: 0.067 }, 20: { boltSize: 'M12x60', weight: 0.067 }, 25: { boltSize: 'M12x65', weight: 0.071 }, 32: { boltSize: 'M16x75', weight: 0.146 }, 40: { boltSize: 'M16x75', weight: 0.146 }, 50: { boltSize: 'M16x75', weight: 0.146 }, 65: { boltSize: 'M16x80', weight: 0.153 }, 80: { boltSize: 'M16x80', weight: 0.153 }, 100: { boltSize: 'M20x90', weight: 0.28 }, 125: { boltSize: 'M24x110', weight: 0.487 }, 150: { boltSize: 'M24x110', weight: 0.487 }, 200: { boltSize: 'M24x110', weight: 0.487 }, 250: { boltSize: 'M30x140', weight: 0.984 }, 300: { boltSize: 'M30x140', weight: 0.984 }, 350: { boltSize: 'M30x150', weight: 1.038 }, 400: { boltSize: 'M36x170', weight: 1.725 }, 450: { boltSize: 'M36x190', weight: 1.882 }, 500: { boltSize: 'M36x210', weight: 2.027 }
  },
  'PN64': {
    15: { boltSize: 'M16x65', weight: 0.18 }, 20: { boltSize: 'M16x70', weight: 0.20 }, 25: { boltSize: 'M16x75', weight: 0.22 }, 32: { boltSize: 'M20x80', weight: 0.35 }, 40: { boltSize: 'M20x85', weight: 0.38 }, 50: { boltSize: 'M20x90', weight: 0.40 }, 65: { boltSize: 'M24x95', weight: 0.55 }, 80: { boltSize: 'M24x100', weight: 0.58 }, 100: { boltSize: 'M27x110', weight: 0.80 }, 125: { boltSize: 'M30x120', weight: 1.08 }, 150: { boltSize: 'M33x130', weight: 1.40 }, 200: { boltSize: 'M36x150', weight: 1.90 }, 250: { boltSize: 'M39x170', weight: 2.50 }, 300: { boltSize: 'M42x190', weight: 3.20 }, 350: { boltSize: 'M45x210', weight: 3.90 }, 400: { boltSize: 'M48x230', weight: 4.70 }, 450: { boltSize: 'M52x250', weight: 5.75 }, 500: { boltSize: 'M56x275', weight: 7.00 }, 600: { boltSize: 'M60x305', weight: 8.60 }, 700: { boltSize: 'M64x340', weight: 10.50 }, 800: { boltSize: 'M72x385', weight: 14.00 }, 900: { boltSize: 'M76x425', weight: 16.50 }, 1000: { boltSize: 'M80x470', weight: 19.50 }, 1200: { boltSize: 'M90x560', weight: 27.00 }
  },
  'Class 150': {
    15: { boltSize: '1/2"x55', weight: 0.061 }, 20: { boltSize: '1/2"x60', weight: 0.067 }, 25: { boltSize: '1/2"x60', weight: 0.067 }, 32: { boltSize: '1/2"x65', weight: 0.071 }, 40: { boltSize: '1/2"x65', weight: 0.071 }, 50: { boltSize: '5/8"x75', weight: 0.146 }, 65: { boltSize: '5/8"x80', weight: 0.153 }, 80: { boltSize: '5/8"x85', weight: 0.161 }, 100: { boltSize: '5/8"x85', weight: 0.161 }, 125: { boltSize: '3/4"x90', weight: 0.28 }, 150: { boltSize: '3/4"x95', weight: 0.292 }, 200: { boltSize: '3/4"x100', weight: 0.304 }, 250: { boltSize: '7/8"x110', weight: 0.399 }, 300: { boltSize: '7/8"x110', weight: 0.399 }, 350: { boltSize: '1"x120', weight: 0.522 }, 400: { boltSize: '1"x120', weight: 0.522 }, 450: { boltSize: '1 1/8"x130', weight: 0.73 }, 500: { boltSize: '1 1/8"x140', weight: 0.774 }, 600: { boltSize: '1 1/4"x160', weight: 1.092 }, 700: { boltSize: '1 1/4"x200', weight: 1.309 }, 800: { boltSize: '1 1/2"x230', weight: 2.184 }, 900: { boltSize: '1 1/2"x250', weight: 2.34 }, 1000: { boltSize: '1 1/2"x250', weight: 2.34 }, 1200: { boltSize: '1 1/2"x270', weight: 2.497 }
  },
  'Class 300': {
    15: { boltSize: '1/2"x60', weight: 0.067 }, 20: { boltSize: '5/8"x70', weight: 0.138 }, 25: { boltSize: '5/8"x70', weight: 0.138 }, 32: { boltSize: '5/8"x75', weight: 0.146 }, 40: { boltSize: '3/4"x85', weight: 0.268 }, 50: { boltSize: '5/8"x80', weight: 0.153 }, 65: { boltSize: '3/4"x95', weight: 0.292 }, 80: { boltSize: '3/4"x100', weight: 0.304 }, 100: { boltSize: '3/4"x110', weight: 0.328 }, 125: { boltSize: '3/4"x110', weight: 0.328 }, 150: { boltSize: '3/4"x120', weight: 0.352 }, 200: { boltSize: '7/8"x130', weight: 0.455 }, 250: { boltSize: '1"x150', weight: 0.623 }, 300: { boltSize: '1 1/8"x160', weight: 0.862 }, 350: { boltSize: '1 1/8"x160', weight: 0.862 }, 400: { boltSize: '1 1/4"x170', weight: 1.146 }, 450: { boltSize: '1 1/4"x180', weight: 1.201 }, 500: { boltSize: '1 1/4"x190', weight: 1.255 }, 600: { boltSize: '1 1/2"x210', weight: 2.027 }, 700: { boltSize: '1 5/8"x250', weight: 2.809 }, 800: { boltSize: '1 7/8"x280', weight: 4.218 }, 900: { boltSize: '2"x300', weight: 5.149 }, 1000: { boltSize: '1 5/8"x300', weight: 3.27 }, 1200: { boltSize: '1 3/4"x330', weight: 2.55 }
  },
  'Class 600': {
    15: { boltSize: '1/2"x75', weight: 0.079 }, 20: { boltSize: '5/8"x80', weight: 0.153 }, 25: { boltSize: '5/8"x85', weight: 0.161 }, 32: { boltSize: '5/8"x90', weight: 0.169 }, 40: { boltSize: '3/4"x100', weight: 0.304 }, 50: { boltSize: '5/8"x100', weight: 0.184 }, 65: { boltSize: '3/4"x110', weight: 0.328 }, 80: { boltSize: '3/4"x120', weight: 0.352 }, 100: { boltSize: '7/8"x130', weight: 0.455 }, 125: { boltSize: '1"x150', weight: 0.623 }, 150: { boltSize: '1"x160', weight: 0.657 }, 200: { boltSize: '1 1/8"x180', weight: 0.95 }, 250: { boltSize: '1 1/4"x200', weight: 1.309 }, 300: { boltSize: '1 1/4"x210', weight: 1.355 }, 400: { boltSize: '1 1/2"x230', weight: 2.184 }, 450: { boltSize: '1 5/8"x250', weight: 2.809 }, 500: { boltSize: '1 5/8"x270', weight: 2.993 }, 600: { boltSize: '1 7/8"x300', weight: 4.464 }, 700: { boltSize: '2"x330', weight: 5.569 }
  }
};

export const GASKET_WEIGHTS: Record<number, { spiralWound: number; rtj: number; ptfe: number; graphite: number; caf: number; rubber: number }> = {
  15: { spiralWound: 0.025, rtj: 0.045, ptfe: 0.003, graphite: 0.002, caf: 0.004, rubber: 0.003 },
  20: { spiralWound: 0.030, rtj: 0.055, ptfe: 0.004, graphite: 0.003, caf: 0.005, rubber: 0.004 },
  25: { spiralWound: 0.035, rtj: 0.065, ptfe: 0.005, graphite: 0.004, caf: 0.007, rubber: 0.005 },
  32: { spiralWound: 0.045, rtj: 0.080, ptfe: 0.007, graphite: 0.005, caf: 0.009, rubber: 0.006 },
  40: { spiralWound: 0.055, rtj: 0.095, ptfe: 0.009, graphite: 0.007, caf: 0.012, rubber: 0.008 },
  50: { spiralWound: 0.070, rtj: 0.120, ptfe: 0.013, graphite: 0.010, caf: 0.017, rubber: 0.011 },
  65: { spiralWound: 0.090, rtj: 0.150, ptfe: 0.018, graphite: 0.014, caf: 0.023, rubber: 0.015 },
  80: { spiralWound: 0.110, rtj: 0.180, ptfe: 0.024, graphite: 0.018, caf: 0.031, rubber: 0.020 },
  100: { spiralWound: 0.150, rtj: 0.250, ptfe: 0.035, graphite: 0.027, caf: 0.045, rubber: 0.030 },
  125: { spiralWound: 0.200, rtj: 0.320, ptfe: 0.050, graphite: 0.038, caf: 0.064, rubber: 0.042 },
  150: { spiralWound: 0.260, rtj: 0.400, ptfe: 0.068, graphite: 0.052, caf: 0.087, rubber: 0.057 },
  200: { spiralWound: 0.400, rtj: 0.600, ptfe: 0.110, graphite: 0.085, caf: 0.140, rubber: 0.092 },
  250: { spiralWound: 0.550, rtj: 0.850, ptfe: 0.165, graphite: 0.127, caf: 0.210, rubber: 0.138 },
  300: { spiralWound: 0.720, rtj: 1.100, ptfe: 0.220, graphite: 0.170, caf: 0.285, rubber: 0.187 },
  350: { spiralWound: 0.900, rtj: 1.400, ptfe: 0.290, graphite: 0.225, caf: 0.375, rubber: 0.245 },
  400: { spiralWound: 1.100, rtj: 1.700, ptfe: 0.370, graphite: 0.285, caf: 0.475, rubber: 0.310 },
  450: { spiralWound: 1.350, rtj: 2.000, ptfe: 0.460, graphite: 0.355, caf: 0.590, rubber: 0.385 },
  500: { spiralWound: 1.600, rtj: 2.400, ptfe: 0.560, graphite: 0.430, caf: 0.720, rubber: 0.470 },
  600: { spiralWound: 2.200, rtj: 3.300, ptfe: 0.780, graphite: 0.600, caf: 1.000, rubber: 0.655 },
  700: { spiralWound: 2.900, rtj: 4.300, ptfe: 1.050, graphite: 0.810, caf: 1.350, rubber: 0.880 },
  800: { spiralWound: 3.700, rtj: 5.500, ptfe: 1.350, graphite: 1.040, caf: 1.730, rubber: 1.130 },
  900: { spiralWound: 4.600, rtj: 6.900, ptfe: 1.700, graphite: 1.310, caf: 2.180, rubber: 1.420 },
  1000: { spiralWound: 5.600, rtj: 8.400, ptfe: 2.100, graphite: 1.620, caf: 2.700, rubber: 1.760 },
  1200: { spiralWound: 7.900, rtj: 11.800, ptfe: 3.000, graphite: 2.310, caf: 3.850, rubber: 2.510 }
};

export const normalizePressureClass = (designation: string): string => {
  if (!designation) return 'PN16';

  const trimmed = designation.trim().toUpperCase();

  const sabsMatch = trimmed.match(/^(\d+)\/\d+$/);
  if (sabsMatch) {
    const kpa = parseInt(sabsMatch[1]);
    if (kpa <= 1000) return 'PN10';
    if (kpa <= 1600) return 'PN16';
    if (kpa <= 2500) return 'PN25';
    if (kpa <= 4000) return 'PN40';
    if (kpa <= 6400) return 'PN64';
    return 'PN64';
  }

  const pnMatch = trimmed.match(/^PN\s*(\d+)/i);
  if (pnMatch) {
    const pnValue = parseInt(pnMatch[1]);
    if (pnValue <= 10) return 'PN10';
    if (pnValue <= 16) return 'PN16';
    if (pnValue <= 25) return 'PN25';
    if (pnValue <= 40) return 'PN40';
    if (pnValue <= 64 || pnValue === 63) return 'PN64';
    return 'PN64';
  }

  const classMatch = trimmed.match(/^CLASS\s*(\d+)/i);
  if (classMatch) {
    const classValue = parseInt(classMatch[1]);
    if (classValue <= 150) return 'Class 150';
    if (classValue <= 300) return 'Class 300';
    return 'Class 600';
  }

  const numericMatch = trimmed.match(/^(\d+)$/);
  if (numericMatch) {
    const value = parseInt(numericMatch[1]);
    if (value >= 1000) {
      if (value <= 1000) return 'PN10';
      if (value <= 1600) return 'PN16';
      if (value <= 2500) return 'PN25';
      if (value <= 4000) return 'PN40';
      if (value <= 6400) return 'PN64';
      return 'PN64';
    } else {
      if (value <= 150) return 'Class 150';
      if (value <= 300) return 'Class 300';
      return 'Class 600';
    }
  }

  return designation;
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
  for (const size of sizes) {
    if (size <= nbMm) closestSize = size;
    else break;
  }

  const weights = GASKET_WEIGHTS[closestSize];
  if (!weights) return 0;

  if (gasketType.startsWith('SW-') || gasketType.includes('Spiral')) {
    return weights.spiralWound;
  } else if (gasketType.startsWith('RTJ-')) {
    return weights.rtj;
  } else if (gasketType.startsWith('PTFE-') || gasketType.includes('PTFE')) {
    return weights.ptfe;
  } else if (gasketType.startsWith('Graphite-') || gasketType.includes('Graphite')) {
    return weights.graphite;
  } else if (gasketType.startsWith('CAF-')) {
    return weights.caf;
  } else if (gasketType.startsWith('Rubber-') || gasketType.includes('EPDM') || gasketType.includes('NBR')) {
    return weights.rubber;
  }

  return weights.spiralWound;
};

export const flangeWeight = (
  nominalBoreMm: number,
  pressureClassDesignation?: string
): number => {
  const pressureClass = normalizePressureClass(pressureClassDesignation || 'PN16');

  if (FLANGE_WEIGHT_BY_PRESSURE_CLASS[pressureClass]) {
    const weight = FLANGE_WEIGHT_BY_PRESSURE_CLASS[pressureClass][nominalBoreMm];
    if (weight) {
      return weight;
    }
  }

  const defaultWeight = NB_TO_FLANGE_WEIGHT_LOOKUP[nominalBoreMm];
  if (defaultWeight) {
    return defaultWeight;
  }

  return nominalBoreMm < 100 ? 5 : nominalBoreMm < 200 ? 12 : nominalBoreMm < 400 ? 40 : nominalBoreMm < 600 ? 80 : 150;
};
