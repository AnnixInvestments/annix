import {
  STEEL_DENSITY_KG_M3,
  STEEL_DENSITY_KG_MM3,
  TACK_WELD_CONFIG,
  CLOSURE_LENGTH_CONFIG,
  RETAINING_RING_CONFIG,
  tackWeldConfig,
  TackWeldConfig,
} from './constants';

export const BLANK_FLANGE_WEIGHT: Record<string, Record<number, number>> = {
  'PN6': { 15: 0.44, 20: 0.59, 25: 0.72, 32: 1.16, 40: 1.35, 50: 1.9, 65: 2.5, 80: 3.8, 100: 4.8, 125: 6.0, 150: 7.5, 200: 11.5, 250: 17.0, 300: 24.0, 350: 33.0, 400: 43.0, 450: 54.0, 500: 60.0, 600: 85.0, 700: 115.0, 750: 130.0, 800: 150.0, 900: 190.0, 1000: 240.0, 1200: 350.0 },
  'PN10': { 15: 0.67, 20: 0.94, 25: 1.1, 32: 1.8, 40: 2.1, 50: 2.7, 65: 3.5, 80: 4.5, 100: 5.8, 125: 7.5, 150: 10.0, 200: 16.5, 250: 25.0, 300: 36.0, 350: 48.0, 400: 62.0, 450: 78.0, 500: 95.0, 600: 135.0, 700: 180.0, 750: 205.0, 800: 235.0, 900: 300.0, 1000: 380.0, 1200: 560.0 },
  'PN16': { 15: 0.81, 20: 1.1, 25: 1.3, 32: 2.2, 40: 2.5, 50: 3.3, 65: 4.2, 80: 5.4, 100: 7.2, 125: 10.2, 150: 13.2, 200: 20.0, 250: 32.0, 300: 48.0, 350: 65.0, 400: 85.0, 450: 108.0, 500: 135.0, 600: 195.0, 700: 265.0, 750: 305.0, 800: 350.0, 900: 450.0, 1000: 570.0, 1200: 850.0 },
  'PN25': { 15: 0.95, 20: 1.3, 25: 1.5, 32: 2.6, 40: 3.0, 50: 4.0, 65: 5.5, 80: 7.0, 100: 9.5, 125: 13.5, 150: 18.0, 200: 30.0, 250: 48.0, 300: 72.0, 350: 100.0, 400: 135.0, 450: 175.0, 500: 220.0, 600: 320.0, 700: 440.0, 750: 510.0, 800: 590.0, 900: 760.0, 1000: 970.0 },
  'PN40': { 15: 1.1, 20: 1.5, 25: 1.8, 32: 3.0, 40: 3.5, 50: 4.8, 65: 6.5, 80: 8.5, 100: 12.0, 125: 17.0, 150: 23.0, 200: 40.0, 250: 65.0, 300: 100.0, 350: 140.0, 400: 190.0, 450: 250.0, 500: 320.0, 600: 480.0 },
  'Class 150': { 15: 0.7, 20: 1.0, 25: 1.2, 32: 1.8, 40: 2.2, 50: 3.0, 65: 4.5, 80: 5.5, 100: 8.0, 125: 11.0, 150: 15.0, 200: 24.0, 250: 38.0, 300: 55.0, 350: 75.0, 400: 100.0, 450: 130.0, 500: 165.0, 600: 240.0 },
  'Class 300': { 15: 1.0, 20: 1.5, 25: 1.8, 32: 2.5, 40: 3.5, 50: 4.5, 65: 6.5, 80: 8.5, 100: 13.0, 125: 18.0, 150: 25.0, 200: 42.0, 250: 68.0, 300: 100.0, 350: 140.0, 400: 190.0, 450: 250.0, 500: 320.0, 600: 480.0 },
  'Class 600': { 15: 1.5, 20: 2.2, 25: 2.8, 32: 4.0, 40: 5.5, 50: 7.5, 65: 11.0, 80: 15.0, 100: 22.0, 125: 32.0, 150: 45.0, 200: 78.0, 250: 130.0, 300: 195.0, 350: 280.0, 400: 385.0, 450: 510.0, 500: 660.0, 600: 1000.0 }
};

export const blankFlangeWeight = (nbMm: number, pressureClass: string): number => {
  const pcNormalized = pressureClass?.toUpperCase().replace(/\s+/g, '') || 'PN16';
  const pcLookup = pcNormalized.includes('PN40') || pcNormalized.includes('CLASS300') ? 'PN40' :
                   pcNormalized.includes('PN25') || pcNormalized.includes('CLASS150') ? 'PN25' :
                   pcNormalized.includes('PN10') ? 'PN10' : 'PN16';
  return BLANK_FLANGE_WEIGHT[pcLookup]?.[nbMm] || (nbMm * 0.15);
};

const FLANGE_OD: Record<number, number> = {
  15: 95, 20: 105, 25: 115, 32: 140, 40: 150, 50: 165, 65: 185, 80: 200,
  100: 220, 125: 250, 150: 285, 200: 340, 250: 395, 300: 445, 350: 505,
  400: 565, 450: 615, 500: 670, 600: 780, 700: 885, 750: 940, 800: 1015,
  900: 1115, 1000: 1230, 1050: 1290, 1200: 1455, 1400: 1675, 1500: 1785,
  1600: 1915, 1800: 2115, 2000: 2325, 2200: 2550, 2400: 2760, 2500: 2880
};

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
  750: 762.0, 800: 812.8, 900: 914.4, 1000: 1016.0, 1050: 1066.8, 1200: 1219.2,
  1400: 1422.4, 1500: 1524.0, 1600: 1625.6, 1800: 1828.8, 2000: 2032.0,
  2200: 2235.2, 2400: 2438.4, 2500: 2540.0
};

export const FLANGE_WEIGHT_BY_PRESSURE_CLASS: Record<string, Record<number, number>> = {
  'PN6': {
    15: 0.40, 20: 0.59, 25: 0.72, 32: 1.16, 40: 1.35, 50: 1.48, 65: 1.86, 80: 2.95,
    100: 3.26, 125: 4.32, 150: 4.76, 200: 6.88, 250: 8.92, 300: 11.9, 350: 16.8,
    400: 19.8, 450: 24.0, 500: 26.3, 600: 34.7, 700: 52.4, 750: 62.0,
    800: 71.3, 900: 95.0, 1000: 125.0, 1050: 145.0, 1200: 200.0
  },
  'PN10': {
    15: 0.67, 20: 0.94, 25: 1.11, 32: 1.82, 40: 2.08, 50: 2.73, 65: 3.16, 80: 3.60,
    100: 4.39, 125: 5.41, 150: 7.14, 200: 9.27, 250: 11.8, 300: 13.6, 350: 20.4,
    400: 27.5, 450: 34.0, 500: 40.1, 600: 54.3, 700: 82.8, 750: 98.0,
    800: 116.5, 900: 155.0, 1000: 200.0, 1050: 230.0, 1200: 320.0
  },
  'PN16': {
    15: 0.67, 20: 0.94, 25: 1.11, 32: 1.82, 40: 2.08, 50: 2.73, 65: 3.48, 80: 4.32,
    100: 6.07, 125: 8.19, 150: 10.3, 200: 17.9, 250: 29.3, 300: 45.1, 350: 66.7,
    400: 97.1, 450: 75.0, 500: 63.8, 600: 101.3, 700: 111.1, 750: 135.0,
    800: 158.6, 900: 210.0, 1000: 280.0, 1050: 330.0, 1200: 480.0
  },
  'PN25': {
    15: 0.67, 20: 0.94, 25: 1.11, 32: 1.82, 40: 2.08, 50: 2.73, 65: 3.48, 80: 4.32,
    100: 6.07, 125: 8.19, 150: 10.3, 200: 17.9, 250: 29.3, 300: 45.1, 350: 66.7,
    400: 97.1, 450: 120.0, 500: 86.7, 600: 126.9, 700: 193.0, 750: 230.0,
    800: 266.3, 900: 360.0, 1000: 480.0, 1050: 560.0, 1200: 820.0
  },
  'PN40': {
    15: 0.80, 20: 1.1, 25: 1.3, 32: 2.2, 40: 2.5, 50: 3.3, 65: 4.2, 80: 5.2,
    100: 7.3, 125: 9.8, 150: 12.4, 200: 21.5, 250: 35.2, 300: 54.0, 350: 80.0,
    400: 116.0, 450: 145.0, 500: 105.0, 600: 155.0, 700: 235.0, 750: 280.0,
    800: 320.0, 900: 430.0, 1000: 580.0, 1050: 680.0, 1200: 1000.0
  },
  'PN64': {
    15: 1.0, 20: 1.4, 25: 1.6, 32: 2.8, 40: 3.2, 50: 4.2, 65: 5.4, 80: 6.6,
    100: 9.4, 125: 12.5, 150: 16.0, 200: 28.0, 250: 45.0, 300: 70.0, 350: 105.0,
    400: 150.0, 450: 190.0, 500: 140.0, 600: 210.0, 700: 320.0, 750: 380.0,
    800: 440.0, 900: 590.0, 1000: 800.0, 1050: 940.0, 1200: 1400.0
  },
  'Class 150': {
    15: 0.5, 20: 0.9, 25: 0.9, 32: 1.4, 40: 1.4, 50: 2.3, 65: 3.6, 80: 4.1,
    100: 5.9, 125: 6.8, 150: 8.6, 200: 13.5, 250: 19.4, 300: 28.8, 350: 40.5,
    400: 47.7, 450: 58.5, 500: 74.3, 600: 99.0, 700: 130.0, 750: 150.0,
    800: 175.0, 900: 230.0, 1000: 300.0, 1050: 350.0, 1200: 500.0
  },
  'Class 300': {
    15: 0.9, 20: 1.4, 25: 1.4, 32: 2.0, 40: 2.9, 50: 3.2, 65: 4.5, 80: 5.9,
    100: 10.6, 125: 13.0, 150: 17.6, 200: 26.1, 250: 36.5, 300: 51.8, 350: 74.3,
    400: 94.5, 450: 113.9, 500: 141.8, 600: 220.5, 700: 290.0, 750: 340.0,
    800: 400.0, 900: 530.0, 1000: 700.0, 1050: 820.0, 1200: 1200.0
  },
  'Class 600': {
    15: 1.4, 20: 2.0, 25: 2.3, 32: 3.2, 40: 4.5, 50: 5.0, 65: 7.3, 80: 9.5,
    100: 16.8, 125: 21.0, 150: 28.5, 200: 45.0, 250: 65.0, 300: 95.0, 350: 140.0,
    400: 185.0, 450: 235.0, 500: 300.0, 600: 480.0, 700: 650.0, 750: 770.0,
    800: 900.0, 900: 1200.0, 1000: 1600.0, 1050: 1900.0, 1200: 2800.0
  },
};

export const NB_TO_FLANGE_WEIGHT_LOOKUP = FLANGE_WEIGHT_BY_PRESSURE_CLASS['PN16'];

export const SANS_1123_PLATE_FLANGE_WEIGHT: Record<string, Record<number, number>> = {
  '600/3': {
    15: 0.35, 20: 0.50, 25: 0.60, 32: 0.95, 40: 1.10, 50: 1.20, 65: 1.50, 80: 2.40,
    100: 2.65, 125: 3.50, 150: 3.85, 200: 5.55, 250: 7.20, 300: 9.60, 350: 13.5,
    400: 16.0, 450: 19.4, 500: 21.2, 600: 28.0, 700: 42.3, 750: 50.0,
    800: 57.5, 900: 76.5, 1000: 100.0, 1050: 118.0, 1200: 165.0
  },
  '1000/3': {
    15: 0.54, 20: 0.76, 25: 0.90, 32: 1.47, 40: 1.68, 50: 2.21, 65: 2.55, 80: 2.90,
    100: 3.55, 125: 4.37, 150: 5.77, 200: 7.50, 250: 9.50, 300: 11.0, 350: 16.5,
    400: 22.2, 450: 27.5, 500: 32.84, 600: 44.5, 700: 67.0, 750: 79.5,
    800: 94.5, 900: 126.0, 1000: 154.84, 1050: 178.0, 1200: 248.0
  },
  '1600/3': {
    15: 0.54, 20: 0.76, 25: 0.90, 32: 1.47, 40: 1.68, 50: 2.21, 65: 2.81, 80: 3.50,
    100: 4.90, 125: 6.61, 150: 8.32, 200: 14.5, 250: 23.7, 300: 36.4, 350: 53.8,
    400: 60.5, 450: 50.0, 500: 52.5, 600: 83.5, 700: 91.5, 750: 111.0,
    800: 130.5, 900: 173.0, 1000: 232.0, 1050: 273.0, 1200: 396.0
  },
  '2500/3': {
    15: 0.54, 20: 0.76, 25: 0.90, 32: 1.47, 40: 1.68, 50: 2.21, 65: 2.81, 80: 3.50,
    100: 4.90, 125: 6.61, 150: 8.32, 200: 14.5, 250: 23.7, 300: 36.4, 350: 53.8,
    400: 78.4, 450: 97.0, 500: 71.4, 600: 104.5, 700: 159.0, 750: 189.5,
    800: 219.3, 900: 296.5, 1000: 396.0, 1050: 462.0, 1200: 676.0
  },
  '4000/3': {
    15: 0.65, 20: 0.89, 25: 1.05, 32: 1.78, 40: 2.02, 50: 2.67, 65: 3.40, 80: 4.20,
    100: 5.90, 125: 7.92, 150: 10.0, 200: 17.4, 250: 28.4, 300: 43.6, 350: 64.5,
    400: 93.7, 450: 117.0, 500: 86.6, 600: 128.0, 700: 194.0, 750: 231.0,
    800: 264.5, 900: 354.0, 1000: 479.0, 1050: 561.0, 1200: 823.0
  }
};

export const SANS_1123_BACKING_RING_WEIGHT: Record<string, Record<number, number>> = {
  '600/1': {
    15: 0.18, 20: 0.25, 25: 0.30, 32: 0.48, 40: 0.55, 50: 0.60, 65: 0.75, 80: 1.20,
    100: 1.33, 125: 1.75, 150: 1.93, 200: 2.78, 250: 3.60, 300: 4.80, 350: 6.75,
    400: 8.0, 450: 9.7, 500: 10.6, 600: 14.0, 700: 21.2, 750: 25.0,
    800: 28.8, 900: 38.3, 1000: 50.0, 1050: 59.0, 1200: 82.5
  },
  '1000/1': {
    15: 0.27, 20: 0.38, 25: 0.45, 32: 0.74, 40: 0.84, 50: 1.11, 65: 1.28, 80: 1.45,
    100: 1.78, 125: 2.19, 150: 2.89, 200: 3.75, 250: 4.75, 300: 5.50, 350: 8.25,
    400: 11.1, 450: 13.75, 500: 16.42, 600: 22.25, 700: 33.5, 750: 39.75,
    800: 47.25, 900: 63.0, 1000: 77.42, 1050: 89.0, 1200: 124.0
  },
  '1600/1': {
    15: 0.27, 20: 0.38, 25: 0.45, 32: 0.74, 40: 0.84, 50: 1.11, 65: 1.41, 80: 1.75,
    100: 2.45, 125: 3.31, 150: 4.16, 200: 7.25, 250: 11.85, 300: 18.2, 350: 26.9,
    400: 30.25, 450: 25.0, 500: 26.25, 600: 41.75, 700: 45.75, 750: 55.5,
    800: 65.25, 900: 86.5, 1000: 116.0, 1050: 136.5, 1200: 198.0
  },
  '2500/1': {
    15: 0.27, 20: 0.38, 25: 0.45, 32: 0.74, 40: 0.84, 50: 1.11, 65: 1.41, 80: 1.75,
    100: 2.45, 125: 3.31, 150: 4.16, 200: 7.25, 250: 11.85, 300: 18.2, 350: 26.9,
    400: 39.2, 450: 48.5, 500: 35.7, 600: 52.25, 700: 79.5, 750: 94.75,
    800: 109.65, 900: 148.25, 1000: 198.0, 1050: 231.0, 1200: 338.0
  },
  '4000/1': {
    15: 0.33, 20: 0.45, 25: 0.53, 32: 0.89, 40: 1.01, 50: 1.34, 65: 1.70, 80: 2.10,
    100: 2.95, 125: 3.96, 150: 5.0, 200: 8.7, 250: 14.2, 300: 21.8, 350: 32.25,
    400: 46.85, 450: 58.5, 500: 43.3, 600: 64.0, 700: 97.0, 750: 115.5,
    800: 132.25, 900: 177.0, 1000: 239.5, 1050: 280.5, 1200: 411.5
  }
};

export const SANS_1123_WELD_NECK_WEIGHT: Record<string, Record<number, number>> = {
  '600/2': {
    15: 0.46, 20: 0.65, 25: 0.78, 32: 1.24, 40: 1.43, 50: 1.56, 65: 1.95, 80: 3.12,
    100: 3.45, 125: 4.55, 150: 5.01, 200: 7.22, 250: 9.36, 300: 12.48, 350: 17.55,
    400: 20.8, 450: 25.22, 500: 27.56, 600: 36.4, 700: 54.99, 750: 65.0,
    800: 74.75, 900: 99.45, 1000: 130.0, 1050: 153.4, 1200: 214.5
  },
  '1000/2': {
    15: 0.70, 20: 0.99, 25: 1.17, 32: 1.91, 40: 2.18, 50: 2.87, 65: 3.32, 80: 3.77,
    100: 4.62, 125: 5.68, 150: 7.50, 200: 9.75, 250: 12.35, 300: 14.3, 350: 21.45,
    400: 28.86, 450: 35.75, 500: 42.69, 600: 57.85, 700: 87.1, 750: 103.35,
    800: 122.85, 900: 163.8, 1000: 201.29, 1050: 231.4, 1200: 322.4
  },
  '1600/2': {
    15: 0.70, 20: 0.99, 25: 1.17, 32: 1.91, 40: 2.18, 50: 2.87, 65: 3.65, 80: 4.55,
    100: 6.37, 125: 8.59, 150: 10.82, 200: 18.85, 250: 30.81, 300: 47.32, 350: 69.94,
    400: 78.65, 450: 65.0, 500: 68.25, 600: 108.55, 700: 118.95, 750: 144.3,
    800: 169.65, 900: 224.9, 1000: 301.6, 1050: 354.9, 1200: 514.8
  },
  '2500/2': {
    15: 0.70, 20: 0.99, 25: 1.17, 32: 1.91, 40: 2.18, 50: 2.87, 65: 3.65, 80: 4.55,
    100: 6.37, 125: 8.59, 150: 10.82, 200: 18.85, 250: 30.81, 300: 47.32, 350: 69.94,
    400: 101.92, 450: 126.1, 500: 92.82, 600: 135.85, 700: 206.7, 750: 246.35,
    800: 285.09, 900: 385.45, 1000: 514.8, 1050: 600.6, 1200: 878.8
  },
  '4000/2': {
    15: 0.85, 20: 1.16, 25: 1.37, 32: 2.31, 40: 2.63, 50: 3.47, 65: 4.42, 80: 5.46,
    100: 7.67, 125: 10.30, 150: 13.0, 200: 22.62, 250: 36.92, 300: 56.68, 350: 83.85,
    400: 121.81, 450: 152.1, 500: 112.58, 600: 166.4, 700: 252.2, 750: 300.3,
    800: 343.85, 900: 460.2, 1000: 622.7, 1050: 729.3, 1200: 1069.9
  }
};

export const SANS_1123_THREADED_WEIGHT: Record<string, Record<number, number>> = {
  '600/4': {
    15: 0.32, 20: 0.45, 25: 0.54, 32: 0.86, 40: 0.99, 50: 1.08, 65: 1.35, 80: 2.16,
    100: 2.39, 125: 3.15, 150: 3.47, 200: 4.99, 250: 6.48, 300: 8.64
  },
  '1000/4': {
    15: 0.49, 20: 0.68, 25: 0.81, 32: 1.32, 40: 1.51, 50: 1.99, 65: 2.30, 80: 2.61,
    100: 3.20, 125: 3.93, 150: 5.19, 200: 6.75, 250: 8.55, 300: 9.9
  },
  '1600/4': {
    15: 0.49, 20: 0.68, 25: 0.81, 32: 1.32, 40: 1.51, 50: 1.99, 65: 2.53, 80: 3.15,
    100: 4.41, 125: 5.95, 150: 7.49, 200: 13.05, 250: 21.33, 300: 32.76
  }
};

export const SANS_1123_SLIP_ON_BOSS_WEIGHT: Record<string, Record<number, number>> = {
  '600/5': {
    15: 0.39, 20: 0.55, 25: 0.66, 32: 1.04, 40: 1.21, 50: 1.32, 65: 1.65, 80: 2.64,
    100: 2.92, 125: 3.85, 150: 4.24, 200: 6.11, 250: 7.92, 300: 10.56, 350: 14.85,
    400: 17.6, 450: 21.34, 500: 23.32, 600: 30.8, 700: 46.53, 750: 55.0,
    800: 63.25, 900: 84.15, 1000: 110.0, 1050: 129.8, 1200: 181.5
  },
  '1000/5': {
    15: 0.59, 20: 0.84, 25: 0.99, 32: 1.62, 40: 1.85, 50: 2.43, 65: 2.81, 80: 3.19,
    100: 3.91, 125: 4.81, 150: 6.35, 200: 8.25, 250: 10.45, 300: 12.1, 350: 18.15,
    400: 24.42, 450: 30.25, 500: 36.12, 600: 48.95, 700: 73.7, 750: 87.45,
    800: 103.95, 900: 138.6, 1000: 170.32, 1050: 195.8, 1200: 272.8
  },
  '1600/5': {
    15: 0.59, 20: 0.84, 25: 0.99, 32: 1.62, 40: 1.85, 50: 2.43, 65: 3.09, 80: 3.85,
    100: 5.39, 125: 7.27, 150: 9.15, 200: 15.95, 250: 26.07, 300: 40.04, 350: 59.18,
    400: 66.55, 450: 55.0, 500: 57.75, 600: 91.85, 700: 100.65, 750: 122.1,
    800: 143.55, 900: 190.3, 1000: 255.2, 1050: 300.3, 1200: 435.6
  },
  '2500/5': {
    15: 0.59, 20: 0.84, 25: 0.99, 32: 1.62, 40: 1.85, 50: 2.43, 65: 3.09, 80: 3.85,
    100: 5.39, 125: 7.27, 150: 9.15, 200: 15.95, 250: 26.07, 300: 40.04, 350: 59.18,
    400: 86.24, 450: 106.7, 500: 78.54, 600: 114.95, 700: 174.9, 750: 208.45,
    800: 241.23, 900: 326.15, 1000: 435.6, 1050: 508.2, 1200: 743.6
  },
  '4000/5': {
    15: 0.72, 20: 0.98, 25: 1.16, 32: 1.96, 40: 2.22, 50: 2.94, 65: 3.74, 80: 4.62,
    100: 6.49, 125: 8.71, 150: 11.0, 200: 19.14, 250: 31.24, 300: 47.96, 350: 70.95,
    400: 103.07, 450: 128.7, 500: 95.26, 600: 140.8, 700: 213.4, 750: 254.1,
    800: 290.95, 900: 389.4, 1000: 526.9, 1050: 617.1, 1200: 905.3
  }
};

export const SANS_1123_BLIND_FLANGE_WEIGHT: Record<string, Record<number, number>> = {
  '600/8': {
    15: 0.36, 20: 0.48, 25: 0.58, 32: 0.94, 40: 1.09, 50: 1.54, 65: 2.02, 80: 3.07,
    100: 3.88, 125: 4.85, 150: 6.06, 200: 9.30, 250: 13.8, 300: 19.4, 350: 26.7,
    400: 34.8, 450: 43.6, 500: 48.5, 600: 68.5, 700: 93.0, 750: 105.0,
    800: 121.0, 900: 154.0, 1000: 194.0, 1200: 283.0
  },
  '1000/8': {
    15: 0.54, 20: 0.76, 25: 0.89, 32: 1.46, 40: 1.70, 50: 2.19, 65: 2.83, 80: 3.65,
    100: 4.70, 125: 6.07, 150: 8.08, 200: 13.4, 250: 20.2, 300: 29.1, 350: 38.8,
    400: 50.1, 450: 63.1, 500: 76.8, 600: 109.0, 700: 146.0, 750: 166.0,
    800: 190.0, 900: 243.0, 1000: 307.0, 1200: 453.0
  },
  '1600/8': {
    15: 0.66, 20: 0.89, 25: 1.05, 32: 1.78, 40: 2.02, 50: 2.67, 65: 3.40, 80: 4.37,
    100: 5.82, 125: 8.25, 150: 10.7, 200: 16.2, 250: 25.9, 300: 38.8, 350: 52.6,
    400: 68.8, 450: 87.4, 500: 109.0, 600: 158.0, 700: 214.0, 750: 247.0,
    800: 283.0, 900: 364.0, 1000: 461.0, 1200: 687.0
  },
  '2500/8': {
    15: 0.77, 20: 1.05, 25: 1.21, 32: 2.10, 40: 2.43, 50: 3.24, 65: 4.46, 80: 5.67,
    100: 7.69, 125: 10.9, 150: 14.6, 200: 24.3, 250: 38.8, 300: 58.3, 350: 80.9,
    400: 109.0, 450: 142.0, 500: 178.0, 600: 259.0, 700: 356.0, 750: 413.0,
    800: 477.0, 900: 614.0, 1000: 785.0
  },
  '4000/8': {
    15: 0.89, 20: 1.21, 25: 1.46, 32: 2.43, 40: 2.83, 50: 3.88, 65: 5.26, 80: 6.88,
    100: 9.71, 125: 13.8, 150: 18.6, 200: 32.4, 250: 52.6, 300: 80.9, 350: 113.0,
    400: 154.0, 450: 202.0, 500: 259.0, 600: 389.0
  }
};

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

export const normalizePressureClass = (designation: string, flangeStandard?: string): string => {
  if (!designation) return 'PN16';

  const trimmed = designation.trim().toUpperCase();

  const slashMatch = trimmed.match(/^(\d+)\/\d+$/);
  if (slashMatch) {
    const value = parseInt(slashMatch[1]);
    const isBs4504 = flangeStandard?.toUpperCase().includes('BS') && flangeStandard?.includes('4504');
    const isSabs1123 = flangeStandard?.toUpperCase().includes('SABS') && flangeStandard?.includes('1123');

    if (isBs4504 || value <= 160) {
      if (value <= 6) return 'PN6';
      if (value <= 10) return 'PN10';
      if (value <= 16) return 'PN16';
      if (value <= 25) return 'PN25';
      if (value <= 40) return 'PN40';
      if (value <= 64) return 'PN64';
      if (value <= 100) return 'PN64';
      return 'PN64';
    } else if (isSabs1123 || value >= 600) {
      if (value <= 1000) return 'PN10';
      if (value <= 1600) return 'PN16';
      if (value <= 2500) return 'PN25';
      if (value <= 4000) return 'PN40';
      if (value <= 6400) return 'PN64';
      return 'PN64';
    }
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
  pressureClassDesignation?: string,
  flangeStandard?: string,
  flangeTypeCode?: string
): number => {
  const designation = pressureClassDesignation || 'PN16';

  const isSabsSans1123 = flangeStandard && (
    flangeStandard.toUpperCase().includes('SABS') && flangeStandard.includes('1123') ||
    flangeStandard.toUpperCase().includes('SANS') && flangeStandard.includes('1123')
  );

  const isBs4504 = flangeStandard && (
    flangeStandard.toUpperCase().includes('BS') && flangeStandard.includes('4504') ||
    flangeStandard.toUpperCase().includes('EN') && flangeStandard.includes('1092')
  );

  const sansTableMatch = designation.match(/^(\d+)\/(\d)$/);
  const numericMatch = designation.match(/^(\d+)$/);

  if (sansTableMatch || isSabsSans1123) {
    let kpa: number;
    let flangeType: string;

    if (sansTableMatch) {
      kpa = parseInt(sansTableMatch[1]);
      // Use explicit flangeTypeCode if provided, otherwise fall back to type from designation
      flangeType = flangeTypeCode ? flangeTypeCode.replace('/', '') : sansTableMatch[2];
    } else if (numericMatch) {
      kpa = parseInt(numericMatch[1]);
      flangeType = flangeTypeCode ? flangeTypeCode.replace('/', '') : '3';
    } else {
      const kpaMatch = designation.match(/(\d{3,4})/);
      kpa = kpaMatch ? parseInt(kpaMatch[1]) : 1000;
      flangeType = flangeTypeCode ? flangeTypeCode.replace('/', '') : '3';
    }

    const tableDesignation = `${kpa}/${flangeType}`;
    const fallbackKpa = kpa <= 600 ? '600' : kpa <= 1000 ? '1000' : kpa <= 1600 ? '1600' : kpa <= 2500 ? '2500' : '4000';
    const fallbackDesignation = `${fallbackKpa}/${flangeType}`;

    let weightTable: Record<string, Record<number, number>> | null = null;

    if (flangeType === '1') {
      weightTable = SANS_1123_BACKING_RING_WEIGHT;
    } else if (flangeType === '2') {
      weightTable = SANS_1123_WELD_NECK_WEIGHT;
    } else if (flangeType === '3') {
      weightTable = SANS_1123_PLATE_FLANGE_WEIGHT;
    } else if (flangeType === '4') {
      weightTable = SANS_1123_THREADED_WEIGHT;
    } else if (flangeType === '5') {
      weightTable = SANS_1123_SLIP_ON_BOSS_WEIGHT;
    } else if (flangeType === '8') {
      weightTable = SANS_1123_BLIND_FLANGE_WEIGHT;
    } else {
      weightTable = SANS_1123_PLATE_FLANGE_WEIGHT;
    }

    if (weightTable) {
      const exactWeight = weightTable[tableDesignation]?.[nominalBoreMm];
      if (exactWeight) {
        return exactWeight;
      }

      const fallbackWeight = weightTable[fallbackDesignation]?.[nominalBoreMm];
      if (fallbackWeight) {
        return fallbackWeight;
      }

      const plateWeight = SANS_1123_PLATE_FLANGE_WEIGHT[`${fallbackKpa}/3`]?.[nominalBoreMm];
      if (plateWeight) {
        if (flangeType === '1') return plateWeight * 0.5;
        if (flangeType === '2') return plateWeight * 1.3;
        if (flangeType === '4') return plateWeight * 0.9;
        if (flangeType === '5') return plateWeight * 1.1;
        if (flangeType === '8') return plateWeight * 1.5;
        return plateWeight;
      }
    }
  }

  const pressureClass = normalizePressureClass(designation, flangeStandard);

  if (isBs4504 && flangeTypeCode) {
    const typeNum = flangeTypeCode.replace('/', '');

    if (typeNum === '2') {
      const weldNeckWeight = BS_4504_WELD_NECK_WEIGHT[pressureClass]?.[nominalBoreMm];
      if (weldNeckWeight) {
        return weldNeckWeight;
      }
    } else if (typeNum === '3') {
      const plateWeight = BS_4504_PLATE_FLANGE_WEIGHT[pressureClass]?.[nominalBoreMm];
      if (plateWeight) {
        return plateWeight;
      }
    } else if (typeNum === '8') {
      const blindWeight = BLANK_FLANGE_WEIGHT[pressureClass]?.[nominalBoreMm];
      if (blindWeight) {
        return blindWeight;
      }
    } else if (typeNum === '1') {
      const plateWeight = BS_4504_PLATE_FLANGE_WEIGHT[pressureClass]?.[nominalBoreMm];
      if (plateWeight) {
        return plateWeight * 0.5;
      }
    } else if (typeNum === '4') {
      const plateWeight = BS_4504_PLATE_FLANGE_WEIGHT[pressureClass]?.[nominalBoreMm];
      if (plateWeight) {
        return plateWeight * 0.9;
      }
    } else if (typeNum === '5') {
      const plateWeight = BS_4504_PLATE_FLANGE_WEIGHT[pressureClass]?.[nominalBoreMm];
      if (plateWeight) {
        return plateWeight * 1.1;
      }
    }
  }

  const isAsmeB165 = flangeStandard && (
    flangeStandard.toUpperCase().includes('ASME') && flangeStandard.includes('B16.5') ||
    flangeStandard.toUpperCase().includes('B16-5')
  );

  const isAsmeB1647A = flangeStandard && (
    flangeStandard.toUpperCase().includes('B16.47') && flangeStandard.toUpperCase().includes('A') ||
    flangeStandard.toUpperCase().includes('B16-47') && flangeStandard.toUpperCase().includes('A')
  );

  const isAsmeB1647B = flangeStandard && (
    flangeStandard.toUpperCase().includes('B16.47') && flangeStandard.toUpperCase().includes('B') ||
    flangeStandard.toUpperCase().includes('B16-47') && flangeStandard.toUpperCase().includes('B')
  );

  if (isAsmeB165 || isAsmeB1647A || isAsmeB1647B) {
    const typeCode = flangeTypeCode?.replace('/', '') || 'WN';

    if (isAsmeB165) {
      if (typeCode === 'WN' || typeCode === '2') {
        const weight = ASME_B16_5_WELD_NECK_WEIGHT[pressureClass]?.[nominalBoreMm];
        if (weight) return weight;
      } else if (typeCode === 'SO' || typeCode === '3') {
        const weight = ASME_B16_5_SLIP_ON_WEIGHT[pressureClass]?.[nominalBoreMm];
        if (weight) return weight;
      } else if (typeCode === 'BL' || typeCode === '8') {
        const weight = ASME_B16_5_BLIND_WEIGHT[pressureClass]?.[nominalBoreMm];
        if (weight) return weight;
      } else if (typeCode === 'LJ' || typeCode === '4') {
        const soWeight = ASME_B16_5_SLIP_ON_WEIGHT[pressureClass]?.[nominalBoreMm];
        if (soWeight) return soWeight * 0.85;
      } else if (typeCode === 'SW' || typeCode === '5') {
        const wnWeight = ASME_B16_5_WELD_NECK_WEIGHT[pressureClass]?.[nominalBoreMm];
        if (wnWeight) return wnWeight * 0.9;
      } else if (typeCode === 'TH' || typeCode === '6') {
        const soWeight = ASME_B16_5_SLIP_ON_WEIGHT[pressureClass]?.[nominalBoreMm];
        if (soWeight) return soWeight * 0.95;
      }
      const defaultWeight = ASME_B16_5_WELD_NECK_WEIGHT[pressureClass]?.[nominalBoreMm];
      if (defaultWeight) return defaultWeight;
    }

    if (isAsmeB1647A) {
      if (typeCode === 'WN' || typeCode === '2') {
        const weight = ASME_B16_47A_WELD_NECK_WEIGHT[pressureClass]?.[nominalBoreMm];
        if (weight) return weight;
      } else if (typeCode === 'BL' || typeCode === '8') {
        const weight = ASME_B16_47A_BLIND_WEIGHT[pressureClass]?.[nominalBoreMm];
        if (weight) return weight;
      }
      const defaultWeight = ASME_B16_47A_WELD_NECK_WEIGHT[pressureClass]?.[nominalBoreMm];
      if (defaultWeight) return defaultWeight;
    }

    if (isAsmeB1647B) {
      if (typeCode === 'WN' || typeCode === '2') {
        const weight = ASME_B16_47B_WELD_NECK_WEIGHT[pressureClass]?.[nominalBoreMm];
        if (weight) return weight;
      } else if (typeCode === 'BL' || typeCode === '8') {
        const weight = ASME_B16_47B_BLIND_WEIGHT[pressureClass]?.[nominalBoreMm];
        if (weight) return weight;
      }
      const defaultWeight = ASME_B16_47B_WELD_NECK_WEIGHT[pressureClass]?.[nominalBoreMm];
      if (defaultWeight) return defaultWeight;
    }
  }

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

export const sansBlankFlangeWeight = (nbMm: number, tableDesignation: string): number => {
  const tableMatch = tableDesignation.match(/^(\d+)/);
  if (!tableMatch) return blankFlangeWeight(nbMm, 'PN16');

  const kpa = parseInt(tableMatch[1]);
  const blindTable = kpa <= 600 ? '600/8' : kpa <= 1000 ? '1000/8' : kpa <= 1600 ? '1600/8' : kpa <= 2500 ? '2500/8' : '4000/8';

  const weight = SANS_1123_BLIND_FLANGE_WEIGHT[blindTable]?.[nbMm];
  if (weight) {
    return weight;
  }

  return blankFlangeWeight(nbMm, normalizePressureClass(tableDesignation));
};

export interface Sabs1123FlangeType {
  code: string;
  name: string;
  description: string;
}

export const SABS_1123_FLANGE_TYPES: Sabs1123FlangeType[] = [
  { code: '/1', name: 'Backing Ring', description: 'BR - Backing Ring flange for rotating flange assemblies' },
  { code: '/2', name: 'Weld Neck', description: 'WN - Weld Neck flange for high pressure applications' },
  { code: '/3', name: 'Slip-On', description: 'SO - Slip-On Plate flange, most common type' },
  { code: '/4', name: 'Threaded', description: 'THD - Screwed/Threaded flange for low pressure services' },
  { code: '/5', name: 'Slip-On Boss', description: 'SOB - Slip-On Boss flange' },
  { code: '/8', name: 'Blind', description: 'BL - Blind/Blank flange to close pipe ends' },
];

export const SABS_1123_PRESSURE_CLASSES = [
  { value: 600, label: '600 kPa' },
  { value: 1000, label: '1000 kPa' },
  { value: 1600, label: '1600 kPa' },
  { value: 2500, label: '2500 kPa' },
  { value: 4000, label: '4000 kPa' },
];

export const BS_4504_FLANGE_TYPES: Sabs1123FlangeType[] = [
  { code: '/1', name: 'Backing Ring', description: 'BR - Backing Ring flange for rotating flange assemblies' },
  { code: '/2', name: 'Weld Neck', description: 'WN - Weld Neck flange for high pressure applications' },
  { code: '/3', name: 'Slip-On', description: 'SO - Slip-On Plate flange, most common type' },
  { code: '/4', name: 'Threaded', description: 'THD - Screwed/Threaded flange for low pressure services' },
  { code: '/5', name: 'Slip-On Boss', description: 'SOB - Slip-On Boss flange' },
  { code: '/8', name: 'Blind', description: 'BL - Blind/Blank flange to close pipe ends' },
];

export const BS_4504_PRESSURE_CLASSES = [
  { value: 6, label: 'PN6' },
  { value: 10, label: 'PN10' },
  { value: 16, label: 'PN16' },
  { value: 25, label: 'PN25' },
  { value: 40, label: 'PN40' },
  { value: 64, label: 'PN64' },
  { value: 100, label: 'PN100' },
  { value: 160, label: 'PN160' },
];

export const BS_4504_WELD_NECK_WEIGHT: Record<string, Record<number, number>> = {
  'PN6': {
    15: 0.8, 20: 0.9, 25: 1.0, 32: 1.6, 40: 1.8, 50: 2.4, 65: 2.6, 80: 3.2,
    100: 3.6, 125: 5.2, 150: 6.0, 200: 9.2, 250: 12.4, 300: 14.4, 350: 19.6,
    400: 23.6, 450: 31.6, 500: 40.0, 600: 56.0, 700: 72.0, 750: 80.0,
    800: 92.0, 900: 116.0, 1000: 148.0
  },
  'PN10': {
    15: 1.0, 20: 1.0, 25: 1.0, 32: 2.0, 40: 2.0, 50: 3.0, 65: 3.0, 80: 4.0,
    100: 4.5, 125: 6.5, 150: 7.5, 200: 11.5, 250: 15.5, 300: 18.0, 350: 24.5,
    400: 29.5, 450: 36.0, 500: 39.5, 600: 56.0, 700: 65.0, 750: 76.0,
    800: 87.0, 900: 106.0, 1000: 123.0, 1200: 180.0
  },
  'PN16': {
    15: 1.0, 20: 1.0, 25: 1.0, 32: 2.0, 40: 2.0, 50: 3.0, 65: 3.0, 80: 4.0,
    100: 4.5, 125: 6.5, 150: 7.5, 200: 11.0, 250: 16.5, 300: 22.0, 350: 32.0,
    400: 40.0, 450: 54.5, 500: 74.0, 600: 116.5, 700: 87.0, 750: 98.0,
    800: 111.0, 900: 129.0, 1000: 169.0, 1200: 250.0
  },
  'PN25': {
    15: 1.0, 20: 1.0, 25: 1.0, 32: 2.0, 40: 2.0, 50: 3.0, 65: 3.5, 80: 4.5,
    100: 5.5, 125: 7.5, 150: 9.5, 200: 16.0, 250: 25.0, 300: 35.0, 350: 50.0,
    400: 68.0, 450: 80.0, 500: 100.0, 600: 160.0, 700: 110.0, 750: 130.0,
    800: 150.0, 900: 180.0, 1000: 220.0
  },
  'PN40': {
    15: 1.0, 20: 1.0, 25: 1.0, 32: 2.0, 40: 2.0, 50: 3.0, 65: 4.0, 80: 5.0,
    100: 6.5, 125: 9.0, 150: 11.5, 200: 21.0, 250: 34.0, 300: 47.5, 350: 69.0,
    400: 98.0, 450: 106.0, 500: 130.0, 600: 211.0
  },
  'PN64': {
    15: 1.2, 20: 1.4, 25: 1.6, 32: 2.5, 40: 3.0, 50: 4.0, 65: 5.5, 80: 7.0,
    100: 9.0, 125: 12.5, 150: 16.5, 200: 30.0, 250: 50.0, 300: 75.0, 350: 110.0,
    400: 155.0, 450: 200.0, 500: 260.0, 600: 400.0
  },
  'Class 150': {
    15: 0.8, 20: 1.1, 25: 1.3, 32: 1.9, 40: 2.3, 50: 3.2, 65: 4.8, 80: 5.8,
    100: 8.5, 125: 11.7, 150: 16.0, 200: 25.5, 250: 40.5, 300: 58.5, 350: 80.0,
    400: 106.5, 450: 138.5, 500: 175.5, 600: 255.5
  },
  'Class 300': {
    15: 1.2, 20: 1.9, 25: 2.3, 32: 3.2, 40: 4.5, 50: 5.0, 65: 7.0, 80: 9.2,
    100: 16.5, 125: 20.3, 150: 27.5, 200: 40.5, 250: 56.5, 300: 80.5, 350: 115.5,
    400: 147.0, 450: 177.5, 500: 221.0, 600: 343.5
  },
  'Class 600': {
    15: 1.8, 20: 2.6, 25: 3.3, 32: 4.7, 40: 6.5, 50: 8.8, 65: 13.0, 80: 17.5,
    100: 26.0, 125: 37.5, 150: 52.5, 200: 91.0, 250: 152.0, 300: 228.0, 350: 327.5,
    400: 450.0, 450: 595.5, 500: 770.0, 600: 1170.0
  },
};

export const BS_4504_PLATE_FLANGE_WEIGHT: Record<string, Record<number, number>> = {
  'PN6': {
    15: 0.35, 20: 0.50, 25: 0.60, 32: 0.95, 40: 1.10, 50: 1.20, 65: 1.50, 80: 2.40,
    100: 2.65, 125: 3.50, 150: 3.85, 200: 5.55, 250: 7.20, 300: 9.60, 350: 13.5,
    400: 16.0, 450: 19.4, 500: 21.2, 600: 28.0, 700: 42.3, 750: 50.0,
    800: 57.5, 900: 76.5, 1000: 100.0
  },
  'PN10': {
    15: 0.54, 20: 0.76, 25: 0.90, 32: 1.47, 40: 1.68, 50: 2.21, 65: 2.55, 80: 2.90,
    100: 3.55, 125: 4.37, 150: 5.77, 200: 7.50, 250: 9.50, 300: 11.0, 350: 16.5,
    400: 22.2, 450: 27.5, 500: 32.8, 600: 44.5, 700: 67.0, 750: 79.5,
    800: 94.5, 900: 126.0, 1000: 155.0, 1200: 248.0
  },
  'PN16': {
    15: 0.67, 20: 0.93, 25: 1.11, 32: 1.82, 40: 2.08, 50: 2.72, 65: 3.31, 80: 3.59,
    100: 4.38, 125: 5.39, 150: 7.12, 200: 9.71, 250: 14.16, 300: 18.93, 350: 28.12,
    400: 35.75, 450: 46.0, 500: 63.83, 600: 101.29, 700: 111.10, 750: 125.0,
    800: 158.56, 900: 192.24, 1000: 269.55, 1200: 400.0
  },
  'PN25': {
    15: 0.67, 20: 0.93, 25: 1.11, 32: 1.82, 40: 2.08, 50: 2.72, 65: 3.31, 80: 3.90,
    100: 5.00, 125: 6.50, 150: 8.50, 200: 13.5, 250: 20.0, 300: 28.0, 350: 42.0,
    400: 55.0, 450: 70.0, 500: 90.0, 600: 145.0
  },
  'PN40': {
    15: 0.80, 20: 1.1, 25: 1.3, 32: 2.2, 40: 2.5, 50: 3.3, 65: 4.0, 80: 4.8,
    100: 6.0, 125: 8.0, 150: 10.5, 200: 18.0, 250: 28.0, 300: 40.0, 350: 60.0,
    400: 85.0, 450: 95.0, 500: 115.0, 600: 185.0
  },
  'PN64': {
    15: 1.0, 20: 1.4, 25: 1.6, 32: 2.8, 40: 3.2, 50: 4.2, 65: 5.2, 80: 6.2,
    100: 8.0, 125: 11.0, 150: 14.5, 200: 25.0, 250: 40.0, 300: 60.0, 350: 90.0,
    400: 130.0, 450: 165.0, 500: 210.0, 600: 340.0
  },
  'Class 150': {
    15: 0.5, 20: 0.9, 25: 0.9, 32: 1.4, 40: 1.4, 50: 2.3, 65: 3.6, 80: 4.1,
    100: 5.9, 125: 6.8, 150: 8.6, 200: 13.5, 250: 19.4, 300: 28.8, 350: 40.5,
    400: 47.7, 450: 58.5, 500: 74.3, 600: 99.0
  },
  'Class 300': {
    15: 0.9, 20: 1.4, 25: 1.4, 32: 2.0, 40: 2.9, 50: 3.2, 65: 4.5, 80: 5.9,
    100: 10.6, 125: 13.0, 150: 17.6, 200: 26.1, 250: 36.5, 300: 51.8, 350: 74.3,
    400: 94.5, 450: 113.9, 500: 141.8, 600: 220.5
  },
  'Class 600': {
    15: 1.4, 20: 2.0, 25: 2.3, 32: 3.2, 40: 4.5, 50: 5.0, 65: 7.3, 80: 9.5,
    100: 16.8, 125: 21.0, 150: 28.5, 200: 45.0, 250: 65.0, 300: 95.0, 350: 140.0,
    400: 185.0, 450: 235.0, 500: 300.0, 600: 480.0
  },
};

export const ASME_B16_5_WELD_NECK_WEIGHT: Record<string, Record<number, number>> = {
  '150': {
    15: 0.5, 20: 0.6, 25: 0.8, 32: 1.1, 40: 1.4, 50: 1.8, 65: 2.5, 80: 3.2,
    100: 4.5, 125: 6.4, 150: 8.2, 200: 13.6, 250: 20.4, 300: 29.5, 350: 40.8,
    400: 52.2, 450: 65.8, 500: 81.6, 600: 120.0
  },
  '300': {
    15: 0.9, 20: 1.1, 25: 1.4, 32: 2.0, 40: 2.5, 50: 3.4, 65: 4.5, 80: 5.9,
    100: 8.2, 125: 11.4, 150: 15.0, 200: 25.4, 250: 38.6, 300: 54.5, 350: 77.1,
    400: 99.8, 450: 127.0, 500: 158.8, 600: 236.0
  },
  '400': {
    15: 1.1, 20: 1.4, 25: 1.8, 32: 2.5, 40: 3.2, 50: 4.3, 65: 5.7, 80: 7.5,
    100: 10.5, 125: 14.5, 150: 19.1, 200: 32.3, 250: 49.1, 300: 69.5, 350: 98.2,
    400: 127.1, 450: 161.8, 500: 202.0, 600: 300.5
  },
  '600': {
    15: 1.4, 20: 1.8, 25: 2.3, 32: 3.2, 40: 4.1, 50: 5.4, 65: 7.3, 80: 9.5,
    100: 13.2, 125: 18.6, 150: 24.5, 200: 41.4, 250: 63.2, 300: 89.1, 350: 126.0,
    400: 163.2, 450: 207.7, 500: 259.1, 600: 385.5
  },
  '900': {
    15: 2.0, 20: 2.7, 25: 3.6, 40: 6.4, 50: 9.1, 65: 13.2, 80: 17.3,
    100: 25.5, 150: 50.0, 200: 86.4, 250: 136.4, 300: 195.5, 350: 272.7,
    400: 354.5, 450: 454.5, 500: 568.2, 600: 859.1
  },
  '1500': {
    15: 3.2, 20: 4.1, 25: 5.9, 40: 10.9, 50: 16.4, 80: 31.8,
    100: 49.1, 150: 99.1, 200: 172.7, 250: 281.8, 300: 418.2
  },
  '2500': {
    15: 5.0, 20: 6.4, 25: 9.5, 40: 19.1, 50: 31.8, 80: 68.2,
    100: 113.6, 150: 254.5, 200: 472.7, 250: 781.8, 300: 1159.1
  }
};

export const ASME_B16_5_SLIP_ON_WEIGHT: Record<string, Record<number, number>> = {
  '150': {
    15: 0.4, 20: 0.5, 25: 0.6, 32: 0.9, 40: 1.1, 50: 1.4, 65: 1.9, 80: 2.5,
    100: 3.4, 125: 4.8, 150: 6.1, 200: 10.0, 250: 14.8, 300: 21.4, 350: 29.1,
    400: 37.3, 450: 46.8, 500: 58.2, 600: 85.0
  },
  '300': {
    15: 0.7, 20: 0.9, 25: 1.1, 32: 1.6, 40: 2.0, 50: 2.7, 65: 3.5, 80: 4.5,
    100: 6.1, 125: 8.4, 150: 11.0, 200: 18.2, 250: 27.3, 300: 38.2, 350: 54.1,
    400: 69.5, 450: 88.2, 500: 110.0, 600: 163.6
  },
  '400': {
    15: 0.9, 20: 1.1, 25: 1.4, 32: 2.0, 40: 2.5, 50: 3.4, 65: 4.5, 80: 5.7,
    100: 7.7, 125: 10.7, 150: 14.1, 200: 23.2, 250: 34.5, 300: 48.6, 350: 68.6,
    400: 88.2, 450: 111.8, 500: 139.5, 600: 207.7
  },
  '600': {
    15: 1.1, 20: 1.4, 25: 1.8, 32: 2.5, 40: 3.2, 50: 4.3, 65: 5.7, 80: 7.3,
    100: 9.8, 125: 13.6, 150: 18.0, 200: 29.5, 250: 44.1, 300: 62.3, 350: 87.7,
    400: 113.2, 450: 143.6, 500: 179.1, 600: 266.4
  }
};

export const ASME_B16_5_BLIND_WEIGHT: Record<string, Record<number, number>> = {
  '150': {
    15: 0.5, 20: 0.7, 25: 0.9, 32: 1.2, 40: 1.5, 50: 2.0, 65: 2.8, 80: 3.6,
    100: 5.0, 125: 7.0, 150: 9.1, 200: 15.0, 250: 22.3, 300: 32.3, 350: 45.0,
    400: 57.7, 450: 72.7, 500: 90.5, 600: 133.2
  },
  '300': {
    15: 1.0, 20: 1.2, 25: 1.5, 32: 2.2, 40: 2.8, 50: 3.7, 65: 5.0, 80: 6.4,
    100: 9.1, 125: 12.5, 150: 16.4, 200: 27.7, 250: 42.7, 300: 60.5, 350: 85.0,
    400: 110.5, 450: 140.9, 500: 176.4, 600: 262.7
  },
  '400': {
    15: 1.2, 20: 1.5, 25: 2.0, 32: 2.8, 40: 3.5, 50: 4.7, 65: 6.4, 80: 8.2,
    100: 11.6, 125: 15.9, 150: 21.0, 200: 35.5, 250: 54.5, 300: 77.3, 350: 108.6,
    400: 141.4, 450: 180.0, 500: 225.5, 600: 335.9
  },
  '600': {
    15: 1.5, 20: 2.0, 25: 2.5, 32: 3.5, 40: 4.5, 50: 6.0, 65: 8.2, 80: 10.5,
    100: 14.8, 125: 20.5, 150: 27.0, 200: 45.5, 250: 70.0, 300: 99.1, 350: 140.0,
    400: 181.8, 450: 231.8, 500: 290.0, 600: 432.7
  },
  '900': {
    15: 2.2, 20: 3.0, 25: 4.0, 40: 7.0, 50: 10.0, 65: 14.5, 80: 19.1,
    100: 28.2, 150: 55.5, 200: 95.5, 250: 150.9, 300: 216.4, 350: 302.3,
    400: 393.2, 450: 504.5, 500: 631.4, 600: 954.5
  },
  '1500': {
    15: 3.6, 20: 4.5, 25: 6.6, 40: 12.0, 50: 18.2, 80: 35.0,
    100: 54.5, 150: 110.0, 200: 191.4, 250: 313.2, 300: 464.5
  },
  '2500': {
    15: 5.5, 20: 7.1, 25: 10.5, 40: 21.4, 50: 35.5, 80: 75.9,
    100: 126.4, 150: 283.2, 200: 527.3, 250: 871.4, 300: 1293.2
  }
};

export const ASME_B16_47A_WELD_NECK_WEIGHT: Record<string, Record<number, number>> = {
  '150': {
    650: 159.1, 700: 181.8, 750: 204.5, 800: 236.4, 850: 268.2, 900: 304.5,
    1000: 386.4, 1050: 427.3, 1200: 545.5, 1350: 686.4, 1500: 854.5
  },
  '300': {
    650: 313.6, 700: 363.6, 750: 418.2, 800: 481.8, 850: 545.5, 900: 618.2,
    1000: 790.9, 1050: 881.8, 1200: 1136.4, 1350: 1436.4, 1500: 1795.5
  },
  '400': {
    650: 400.0, 700: 463.6, 750: 531.8, 800: 613.6, 850: 695.5, 900: 790.9,
    1000: 1009.1, 1050: 1127.3, 1200: 1454.5, 1350: 1840.9, 1500: 2304.5
  },
  '600': {
    650: 513.6, 700: 595.5, 750: 686.4, 800: 790.9, 850: 895.5, 900: 1018.2,
    1000: 1300.0, 1050: 1454.5, 1200: 1881.8, 1350: 2381.8, 1500: 2986.4
  },
  '900': {
    650: 754.5, 700: 877.3, 750: 1013.6, 800: 1172.7, 850: 1331.8, 900: 1518.2,
    1000: 1950.0, 1050: 2186.4, 1200: 2845.5
  }
};

export const ASME_B16_47A_BLIND_WEIGHT: Record<string, Record<number, number>> = {
  '150': {
    650: 177.3, 700: 204.5, 750: 231.8, 800: 268.2, 850: 304.5, 900: 345.5,
    1000: 440.9, 1050: 490.9, 1200: 631.8, 1350: 800.0, 1500: 1000.0
  },
  '300': {
    650: 350.0, 700: 409.1, 750: 472.7, 800: 545.5, 850: 618.2, 900: 700.0,
    1000: 900.0, 1050: 1004.5, 1200: 1300.0, 1350: 1654.5, 1500: 2077.3
  },
  '400': {
    650: 445.5, 700: 518.2, 750: 600.0, 800: 695.5, 850: 790.9, 900: 900.0,
    1000: 1154.5, 1050: 1295.5, 1200: 1681.8, 1350: 2136.4, 1500: 2686.4
  },
  '600': {
    650: 572.7, 700: 668.2, 750: 772.7, 800: 895.5, 900: 1154.5,
    1000: 1486.4, 1050: 1668.2, 1200: 2168.2, 1350: 2754.5, 1500: 3468.2
  },
  '900': {
    650: 840.9, 700: 986.4, 750: 1145.5, 800: 1331.8, 850: 1518.2, 900: 1731.8,
    1000: 2236.4, 1050: 2513.6, 1200: 3281.8
  }
};

export const ASME_B16_47B_WELD_NECK_WEIGHT: Record<string, Record<number, number>> = {
  '75': {
    650: 95.5, 700: 109.1, 750: 122.7, 800: 140.9, 850: 159.1, 900: 181.8,
    1000: 231.8, 1050: 259.1, 1200: 336.4, 1350: 427.3, 1500: 536.4
  },
  '150': {
    650: 131.8, 700: 150.0, 750: 168.2, 800: 195.5, 850: 222.7, 900: 254.5,
    1000: 327.3, 1050: 363.6, 1200: 468.2, 1350: 590.9, 1500: 740.9
  },
  '300': {
    650: 254.5, 700: 295.5, 750: 340.9, 800: 395.5, 850: 450.0, 900: 513.6,
    1000: 659.1, 1050: 740.9, 1200: 963.6, 1350: 1227.3, 1500: 1540.9
  }
};

export const ASME_B16_47B_BLIND_WEIGHT: Record<string, Record<number, number>> = {
  '75': {
    650: 106.4, 700: 122.7, 750: 140.9, 800: 163.6, 850: 186.4, 900: 213.6,
    1000: 277.3, 1050: 313.6, 1200: 413.6, 1350: 531.8, 1500: 677.3
  },
  '150': {
    650: 150.0, 700: 172.7, 750: 195.5, 800: 227.3, 850: 259.1, 900: 295.5,
    1000: 381.8, 1050: 427.3, 1200: 554.5, 1350: 704.5, 1500: 886.4
  },
  '300': {
    650: 286.4, 700: 336.4, 750: 390.9, 800: 454.5, 850: 518.2, 900: 590.9,
    1000: 763.6, 1050: 859.1, 1200: 1122.7, 1350: 1436.4, 1500: 1813.6
  }
};

export const tackWeldWeight = (
  nominalBoreMm: number,
  tackWeldEnds: number = 0,
  configOverrides?: Partial<TackWeldConfig>
): number => {
  if (tackWeldEnds <= 0) return 0;

  const config = tackWeldConfig(configOverrides);
  const legSizeMm = Math.max(
    config.minLegSizeMm,
    Math.min(config.maxLegSizeMm, nominalBoreMm * config.legSizeFactor)
  );

  const totalTacks = config.tacksPerEnd * tackWeldEnds;
  const totalTackLengthMm = totalTacks * config.tackLengthMm;

  const volumePerMmMm3 = (legSizeMm * legSizeMm) / 2;
  const totalVolumeMm3 = volumePerMmMm3 * totalTackLengthMm;

  const weightKg = totalVolumeMm3 * STEEL_DENSITY_KG_MM3;

  return Math.round(weightKg * 1000) / 1000;
};

export const closureWeight = (
  nominalBoreMm: number,
  closureLengthMm: number,
  wallThicknessMm: number
): number => {
  if (!closureLengthMm || closureLengthMm <= 0) return 0;

  const pipeOd = NB_TO_OD_LOOKUP[nominalBoreMm] || nominalBoreMm * 1.1;
  const pipeId = pipeOd - (2 * wallThicknessMm);

  const closureLengthM = closureLengthMm / 1000;
  const odM = pipeOd / 1000;
  const idM = pipeId / 1000;

  const volumeM3 = Math.PI * ((Math.pow(odM, 2) - Math.pow(idM, 2)) / 4) * closureLengthM;
  const weightKg = volumeM3 * STEEL_DENSITY_KG_M3;

  return Math.round(weightKg * 100) / 100;
};

export const closureLengthLimits = (nominalBoreMm: number): { min: number; max: number; recommended: number } => {
  const { absoluteMinMm, absoluteMaxMm, minLengthFactor, maxLengthFactor, recommendedFactor, recommendedMinMm, recommendedMaxMm } = CLOSURE_LENGTH_CONFIG;
  const minLength = Math.max(absoluteMinMm, nominalBoreMm * minLengthFactor);
  const maxLength = Math.min(absoluteMaxMm, nominalBoreMm * maxLengthFactor);
  const recommended = Math.max(recommendedMinMm, Math.min(recommendedMaxMm, nominalBoreMm * recommendedFactor));

  return {
    min: Math.round(minLength),
    max: Math.round(maxLength),
    recommended: Math.round(recommended)
  };
};

const RETAINING_RING_WEIGHT_LOOKUP: Record<number, number> = {
  200: 1.8, 250: 2.5, 300: 3.4, 350: 4.5, 400: 5.8, 450: 7.2, 500: 8.8,
  550: 10.5, 600: 12.5, 650: 14.8, 700: 17.2, 750: 19.8, 800: 22.6,
  850: 25.6, 900: 28.8, 950: 32.2, 1000: 35.8, 1050: 39.6, 1200: 52.0
};

export const retainingRingWeight = (nbMm: number, pipeOdMm?: number): number => {
  const lookupWeight = RETAINING_RING_WEIGHT_LOOKUP[nbMm];
  if (lookupWeight) {
    return lookupWeight;
  }

  const pipeOd = pipeOdMm || NB_TO_OD_LOOKUP[nbMm] || nbMm * 1.05;
  const { odMultiplier, minThicknessMm, maxThicknessMm, thicknessFactor } = RETAINING_RING_CONFIG;

  const ringOdMm = pipeOd * odMultiplier;
  const ringIdMm = pipeOd;
  const ringThicknessMm = Math.max(minThicknessMm, Math.min(maxThicknessMm, nbMm * thicknessFactor));

  const ringOdM = ringOdMm / 1000;
  const ringIdM = ringIdMm / 1000;
  const thicknessM = ringThicknessMm / 1000;

  const volumeM3 = Math.PI * ((Math.pow(ringOdM, 2) - Math.pow(ringIdM, 2)) / 4) * thicknessM;
  const weightKg = volumeM3 * STEEL_DENSITY_KG_M3;

  return Math.round(weightKg * 100) / 100;
};
