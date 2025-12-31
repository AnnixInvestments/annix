/**
 * Comprehensive Welding Table Data Structures
 * All data is in metric units for consistency.
 * - Pressures in bar
 * - Temperatures in °C
 * - Sizes in DN (mm)
 * - Wall thicknesses in mm
 *
 * Based on:
 * - Carbon Steel Seamless Pipes: ASTM A106/API 5L/ASTM A53 Equivalent
 * - Stainless Steel Pipes: ASTM A312 / ASME SA312
 * - Carbon Steel Weld Fittings: WPB Grade, ASME B31.1 Equivalent
 */

// Temperature breakpoints for carbon steel pipes (°C)
export const CARBON_STEEL_TEMP_BREAKPOINTS = [-29, 38, 205, 260, 350, 370, 400, 430, 450];

// Temperature breakpoints for carbon steel fittings (°C)
export const FITTING_TEMP_BREAKPOINTS = [20, 343, 371, 399, 427];

export interface CarbonSteelPipeData {
  dn: number;
  schedule: string;
  wallMm: number;
  pressuresBar: number[];
}

export interface StainlessSteelPipeData {
  dn: number;
  npsEquiv: string;
  schedule: string;
  odMm: number;
  wallMm: number;
  weightKgM: number;
  idMm: number;
  burstBar: number;
}

export interface FittingData {
  dn: number;
  odMm: number;
  wallMm: number;
  pressuresBar: number[];
}

// 1. Carbon Steel Seamless Pipes (ASTM A106/API 5L/ASTM A53 Equivalent)
// Temperatures (°C): [-29 to 38, 205, 260, 350, 370, 400, 430, 450]
export const CARBON_STEEL_PIPES: CarbonSteelPipeData[] = [
  { dn: 15, schedule: 'STD (40)', wallMm: 2.77, pressuresBar: [344, 344, 325, 293, 289, 224, 186, 150] },
  { dn: 15, schedule: 'XS (80)', wallMm: 3.73, pressuresBar: [481, 481, 455, 409, 404, 313, 260, 209] },
  { dn: 15, schedule: '160', wallMm: 4.78, pressuresBar: [628, 628, 594, 534, 528, 408, 339, 273] },
  { dn: 15, schedule: 'XXS', wallMm: 7.47, pressuresBar: [982, 982, 928, 835, 825, 639, 531, 427] },
  { dn: 20, schedule: 'STD (40)', wallMm: 2.87, pressuresBar: [281, 281, 265, 239, 236, 182, 152, 122] },
  { dn: 20, schedule: 'XS (80)', wallMm: 3.91, pressuresBar: [394, 394, 372, 335, 331, 256, 213, 171] },
  { dn: 20, schedule: '160', wallMm: 5.56, pressuresBar: [582, 582, 550, 494, 488, 378, 314, 253] },
  { dn: 20, schedule: 'XXS', wallMm: 7.82, pressuresBar: [831, 831, 785, 706, 698, 540, 449, 362] },
  { dn: 25, schedule: 'STD (40)', wallMm: 3.38, pressuresBar: [263, 263, 248, 223, 220, 171, 142, 114] },
  { dn: 25, schedule: 'XS (80)', wallMm: 4.55, pressuresBar: [363, 363, 343, 309, 305, 236, 196, 158] },
  { dn: 25, schedule: '160', wallMm: 6.35, pressuresBar: [525, 525, 496, 446, 441, 341, 283, 228] },
  { dn: 25, schedule: 'XXS', wallMm: 9.09, pressuresBar: [770, 770, 728, 655, 647, 501, 416, 335] },
  { dn: 32, schedule: 'STD (40)', wallMm: 3.56, pressuresBar: [216, 216, 204, 184, 182, 140, 117, 94] },
  { dn: 32, schedule: 'XS (80)', wallMm: 4.85, pressuresBar: [302, 302, 285, 257, 253, 196, 163, 131] },
  { dn: 32, schedule: '160', wallMm: 6.35, pressuresBar: [406, 406, 384, 345, 341, 264, 219, 177] },
  { dn: 32, schedule: 'XXS', wallMm: 9.70, pressuresBar: [646, 646, 610, 549, 543, 420, 349, 281] },
  { dn: 40, schedule: 'STD (40)', wallMm: 3.68, pressuresBar: [194, 194, 184, 165, 163, 126, 105, 85] },
  { dn: 40, schedule: 'XS (80)', wallMm: 5.08, pressuresBar: [274, 274, 259, 233, 230, 178, 148, 119] },
  { dn: 40, schedule: '160', wallMm: 7.14, pressuresBar: [397, 397, 376, 338, 334, 259, 215, 173] },
  { dn: 40, schedule: 'XXS', wallMm: 10.16, pressuresBar: [588, 588, 556, 500, 494, 382, 317, 256] },
  { dn: 50, schedule: 'STD (40)', wallMm: 3.91, pressuresBar: [164, 164, 155, 139, 138, 106, 88, 71] },
  { dn: 50, schedule: 'XS (80)', wallMm: 5.54, pressuresBar: [237, 237, 224, 201, 199, 154, 128, 103] },
  { dn: 50, schedule: '160', wallMm: 8.74, pressuresBar: [389, 389, 367, 330, 327, 253, 210, 169] },
  { dn: 50, schedule: 'XXS', wallMm: 11.07, pressuresBar: [508, 508, 480, 432, 427, 330, 274, 221] },
  { dn: 65, schedule: 'STD (40)', wallMm: 5.16, pressuresBar: [179, 179, 169, 152, 150, 116, 97, 78] },
  { dn: 65, schedule: 'XS (80)', wallMm: 7.01, pressuresBar: [248, 248, 234, 211, 208, 161, 134, 108] },
  { dn: 65, schedule: '160', wallMm: 9.53, pressuresBar: [346, 346, 327, 294, 291, 225, 187, 151] },
  { dn: 65, schedule: 'XXS', wallMm: 14.02, pressuresBar: [531, 531, 502, 451, 446, 345, 287, 231] },
  { dn: 80, schedule: 'STD (40)', wallMm: 5.49, pressuresBar: [156, 156, 150, 132, 131, 101, 84, 68] },
  { dn: 80, schedule: 'XS (80)', wallMm: 7.62, pressuresBar: [220, 220, 208, 187, 185, 143, 119, 96] },
  { dn: 80, schedule: '160', wallMm: 11.13, pressuresBar: [331, 331, 313, 281, 278, 215, 179, 144] },
  { dn: 80, schedule: 'XXS', wallMm: 15.24, pressuresBar: [470, 470, 444, 399, 395, 305, 254, 204] },
  { dn: 100, schedule: 'STD (40)', wallMm: 6.02, pressuresBar: [132, 132, 125, 112, 111, 86, 71, 57] },
  { dn: 100, schedule: 'XS (80)', wallMm: 8.56, pressuresBar: [191, 191, 180, 162, 160, 124, 121, 83] },
  { dn: 100, schedule: '120', wallMm: 11.13, pressuresBar: [252, 252, 238, 214, 212, 164, 136, 110] },
  { dn: 100, schedule: '160', wallMm: 13.49, pressuresBar: [310, 310, 293, 264, 261, 202, 168, 132] },
  { dn: 100, schedule: 'XXS', wallMm: 17.12, pressuresBar: [403, 403, 381, 343, 339, 262, 218, 175] },
  { dn: 125, schedule: 'STD (40)', wallMm: 6.55, pressuresBar: [116, 116, 109, 98, 97, 75, 62, 50] },
  { dn: 125, schedule: 'XS (80)', wallMm: 9.53, pressuresBar: [171, 171, 161, 145, 143, 111, 92, 74] },
  { dn: 125, schedule: '120', wallMm: 12.70, pressuresBar: [231, 231, 219, 197, 194, 150, 125, 101] },
  { dn: 125, schedule: '160', wallMm: 15.88, pressuresBar: [294, 294, 278, 250, 247, 191, 159, 128] },
  { dn: 125, schedule: 'XXS', wallMm: 19.05, pressuresBar: [359, 359, 339, 305, 302, 233, 194, 156] },
  { dn: 150, schedule: 'STD (40)', wallMm: 7.11, pressuresBar: [106, 106, 99, 89, 88, 68, 54, 46] },
  { dn: 150, schedule: 'XS (80)', wallMm: 10.97, pressuresBar: [165, 165, 156, 140, 138, 107, 89, 72] },
  { dn: 150, schedule: '120', wallMm: 14.27, pressuresBar: [217, 217, 206, 184, 183, 141, 117, 95] },
  { dn: 150, schedule: 'XXS (160)', wallMm: 18.26, pressuresBar: [283, 283, 268, 241, 238, 184, 153, 123] },
  { dn: 200, schedule: '20', wallMm: 6.35, pressuresBar: [71, 71, 67, 61, 60, 46, 39, 31] },
  { dn: 200, schedule: '30', wallMm: 7.04, pressuresBar: [79, 79, 75, 67, 67, 51, 43, 34] },
  { dn: 200, schedule: 'STD (40)', wallMm: 8.18, pressuresBar: [92, 92, 87, 79, 78, 60, 50, 40] },
  { dn: 200, schedule: '60', wallMm: 10.31, pressuresBar: [117, 117, 111, 100, 99, 76, 63, 51] },
  { dn: 200, schedule: 'XS (80)', wallMm: 12.70, pressuresBar: [146, 146, 138, 124, 122, 95, 79, 63] },
  { dn: 200, schedule: '100', wallMm: 15.09, pressuresBar: [175, 175, 165, 148, 147, 113, 94, 76] },
  { dn: 200, schedule: '120', wallMm: 18.26, pressuresBar: [213, 213, 202, 181, 179, 139, 115, 93] },
  { dn: 200, schedule: '140', wallMm: 20.62, pressuresBar: [243, 243, 230, 207, 204, 158, 131, 106] },
  { dn: 200, schedule: 'XXS', wallMm: 22.23, pressuresBar: [263, 263, 249, 224, 221, 171, 142, 115] },
  { dn: 200, schedule: '160', wallMm: 23.01, pressuresBar: [273, 273, 258, 232, 230, 178, 148, 119] },
  { dn: 250, schedule: 'STD', wallMm: 9.27, pressuresBar: [72, 72, 69, 62, 61, 47, 39, 32] },
  { dn: 250, schedule: 'XS', wallMm: 12.70, pressuresBar: [100, 100, 96, 87, 86, 66, 55, 44] },
  { dn: 300, schedule: 'STD', wallMm: 9.53, pressuresBar: [62, 62, 60, 54, 53, 41, 34, 28] },
  { dn: 300, schedule: 'XS', wallMm: 12.70, pressuresBar: [83, 83, 80, 72, 71, 55, 46, 37] },
];

// 2. Stainless Steel Pipes (ASTM A312 / ASME SA312)
// Burst pressure at ambient temp; derate for higher temps per ASME B31.3
export const STAINLESS_STEEL_PIPES: StainlessSteelPipeData[] = [
  { dn: 6, npsEquiv: '1/8', schedule: '5S/5', odMm: 10.29, wallMm: 0.89, weightKgM: 0.21, idMm: 8.51, burstBar: 834 },
  { dn: 6, npsEquiv: '1/8', schedule: '10S/10', odMm: 10.29, wallMm: 1.24, weightKgM: 0.28, idMm: 9.40, burstBar: 1168 },
  { dn: 6, npsEquiv: '1/8', schedule: '40S/STD/40', odMm: 10.29, wallMm: 1.73, weightKgM: 0.36, idMm: 6.83, burstBar: 1621 },
  { dn: 6, npsEquiv: '1/8', schedule: '80S/XH/80', odMm: 10.29, wallMm: 2.41, weightKgM: 0.47, idMm: 5.46, burstBar: 2265 },
  { dn: 8, npsEquiv: '1/4', schedule: '5S/5', odMm: 13.72, wallMm: 1.24, weightKgM: 0.38, idMm: 11.23, burstBar: 876 },
  { dn: 8, npsEquiv: '1/4', schedule: '10S/10', odMm: 13.72, wallMm: 1.65, weightKgM: 0.49, idMm: 10.41, burstBar: 1162 },
  { dn: 8, npsEquiv: '1/4', schedule: '40S/STD/40', odMm: 13.72, wallMm: 2.24, weightKgM: 0.63, idMm: 9.25, burstBar: 1573 },
  { dn: 8, npsEquiv: '1/4', schedule: '80S/XH/80', odMm: 13.72, wallMm: 3.02, weightKgM: 0.80, idMm: 7.67, burstBar: 2128 },
  { dn: 10, npsEquiv: '3/8', schedule: '5S/5', odMm: 17.15, wallMm: 1.24, weightKgM: 0.49, idMm: 14.66, burstBar: 701 },
  { dn: 10, npsEquiv: '3/8', schedule: '10S/10', odMm: 17.15, wallMm: 1.65, weightKgM: 0.63, idMm: 13.84, burstBar: 930 },
  { dn: 10, npsEquiv: '3/8', schedule: '40S/STD/40', odMm: 17.15, wallMm: 2.31, weightKgM: 0.84, idMm: 12.53, burstBar: 1301 },
  { dn: 10, npsEquiv: '3/8', schedule: '80S/XH/80', odMm: 17.15, wallMm: 3.20, weightKgM: 1.10, idMm: 10.74, burstBar: 1802 },
  { dn: 15, npsEquiv: '1/2', schedule: '5S/5', odMm: 21.34, wallMm: 1.65, weightKgM: 0.80, idMm: 18.03, burstBar: 930 },
  { dn: 15, npsEquiv: '1/2', schedule: '10S/10', odMm: 21.34, wallMm: 2.11, weightKgM: 1.00, idMm: 17.12, burstBar: 1187 },
  { dn: 15, npsEquiv: '1/2', schedule: '40S/STD/40', odMm: 21.34, wallMm: 2.77, weightKgM: 1.27, idMm: 15.80, burstBar: 2102 },
  { dn: 15, npsEquiv: '1/2', schedule: '80S/XH/80', odMm: 21.34, wallMm: 3.73, weightKgM: 1.62, idMm: 13.87, burstBar: 4204 },
  { dn: 20, npsEquiv: '3/4', schedule: '5S/5', odMm: 26.67, wallMm: 1.65, weightKgM: 1.02, idMm: 23.37, burstBar: 597 },
  { dn: 20, npsEquiv: '3/4', schedule: '10S/10', odMm: 26.67, wallMm: 2.11, weightKgM: 1.28, idMm: 22.45, burstBar: 1038 },
  { dn: 20, npsEquiv: '3/4', schedule: '40S/STD/40', odMm: 26.67, wallMm: 2.87, weightKgM: 1.68, idMm: 20.93, burstBar: 1038 },
  { dn: 20, npsEquiv: '3/4', schedule: '80S/XH/80', odMm: 26.67, wallMm: 3.91, weightKgM: 2.20, idMm: 18.85, burstBar: 2013 },
  { dn: 20, npsEquiv: '3/4', schedule: 'XXH', odMm: 26.67, wallMm: 7.82, weightKgM: 3.63, idMm: 11.03, burstBar: 2832 },
  { dn: 25, npsEquiv: '1', schedule: '5S/5', odMm: 33.40, wallMm: 1.65, weightKgM: 1.29, idMm: 30.10, burstBar: 477 },
  { dn: 25, npsEquiv: '1', schedule: '10S/10', odMm: 33.40, wallMm: 2.77, weightKgM: 2.09, idMm: 27.86, burstBar: 976 },
  { dn: 25, npsEquiv: '1', schedule: '40S/STD/40', odMm: 33.40, wallMm: 3.38, weightKgM: 2.50, idMm: 26.64, burstBar: 976 },
  { dn: 25, npsEquiv: '1', schedule: '80S/XH/80', odMm: 33.40, wallMm: 4.55, weightKgM: 3.24, idMm: 24.30, burstBar: 1835 },
  { dn: 25, npsEquiv: '1', schedule: 'XXH', odMm: 33.40, wallMm: 9.09, weightKgM: 5.45, idMm: 15.22, burstBar: 2628 },
];

// 3. Carbon Steel Weld Fittings (WPB Grade, ASME B31.1 Equivalent)
// THIS IS THE WELD THICKNESS DATA
// Temperatures (°C): [20-343, 371, 399, 427]
export const CARBON_STEEL_FITTINGS: Record<string, FittingData[]> = {
  'STD': [
    { dn: 15, odMm: 21.3, wallMm: 2.77, pressuresBar: [299, 287, 259, 215] },
    { dn: 20, odMm: 26.7, wallMm: 2.87, pressuresBar: [248, 238, 215, 179] },
    { dn: 25, odMm: 33.4, wallMm: 3.38, pressuresBar: [227, 218, 197, 164] },
    { dn: 32, odMm: 42.2, wallMm: 3.56, pressuresBar: [187, 179, 162, 134] },
    { dn: 40, odMm: 48.3, wallMm: 3.68, pressuresBar: [168, 161, 145, 121] },
    { dn: 50, odMm: 60.3, wallMm: 3.91, pressuresBar: [141, 135, 122, 102] },
    { dn: 65, odMm: 73.0, wallMm: 5.16, pressuresBar: [155, 149, 134, 111] },
    { dn: 80, odMm: 88.9, wallMm: 5.49, pressuresBar: [134, 129, 116, 97] },
    { dn: 90, odMm: 101.6, wallMm: 5.74, pressuresBar: [122, 117, 106, 88] },
    { dn: 100, odMm: 114.3, wallMm: 6.02, pressuresBar: [113, 109, 98, 82] },
    { dn: 125, odMm: 141.3, wallMm: 6.55, pressuresBar: [100, 95, 86, 72] },
    { dn: 150, odMm: 168.3, wallMm: 7.11, pressuresBar: [90, 87, 78, 65] },
    { dn: 200, odMm: 219.1, wallMm: 8.18, pressuresBar: [79, 76, 69, 57] },
    { dn: 250, odMm: 273.0, wallMm: 9.27, pressuresBar: [72, 69, 62, 52] },
    { dn: 300, odMm: 323.9, wallMm: 9.53, pressuresBar: [62, 60, 54, 45] },
  ],
  'XH': [
    { dn: 15, odMm: 21.3, wallMm: 3.73, pressuresBar: [420, 404, 364, 303] },
    { dn: 20, odMm: 26.7, wallMm: 3.91, pressuresBar: [351, 337, 304, 252] },
    { dn: 25, odMm: 33.4, wallMm: 4.55, pressuresBar: [316, 303, 274, 227] },
    { dn: 32, odMm: 42.2, wallMm: 4.85, pressuresBar: [262, 251, 226, 188] },
    { dn: 40, odMm: 48.3, wallMm: 5.08, pressuresBar: [237, 228, 206, 171] },
    { dn: 50, odMm: 60.3, wallMm: 5.54, pressuresBar: [205, 196, 177, 147] },
    { dn: 65, odMm: 73.0, wallMm: 7.01, pressuresBar: [215, 206, 186, 154] },
    { dn: 80, odMm: 88.9, wallMm: 7.62, pressuresBar: [190, 182, 164, 137] },
    { dn: 100, odMm: 114.3, wallMm: 8.56, pressuresBar: [164, 158, 143, 118] },
    { dn: 125, odMm: 141.3, wallMm: 9.53, pressuresBar: [147, 141, 128, 106] },
    { dn: 150, odMm: 168.3, wallMm: 10.97, pressuresBar: [142, 136, 123, 102] },
    { dn: 200, odMm: 219.1, wallMm: 12.70, pressuresBar: [125, 120, 109, 90] },
    { dn: 250, odMm: 273.0, wallMm: 12.70, pressuresBar: [100, 96, 87, 72] },
    { dn: 300, odMm: 323.9, wallMm: 12.70, pressuresBar: [83, 80, 72, 60] },
  ],
  'XXH': [
    { dn: 15, odMm: 21.3, wallMm: 7.47, pressuresBar: [1004, 964, 870, 724] },
    { dn: 20, odMm: 26.7, wallMm: 7.82, pressuresBar: [813, 780, 704, 585] },
    { dn: 25, odMm: 33.4, wallMm: 9.09, pressuresBar: [719, 691, 623, 518] },
    { dn: 32, odMm: 42.2, wallMm: 9.70, pressuresBar: [583, 560, 505, 420] },
    { dn: 40, odMm: 48.3, wallMm: 10.16, pressuresBar: [523, 502, 453, 377] },
    { dn: 50, odMm: 60.3, wallMm: 11.07, pressuresBar: [447, 429, 387, 322] },
    { dn: 65, odMm: 73.0, wallMm: 14.02, pressuresBar: [469, 450, 406, 338] },
    { dn: 80, odMm: 88.9, wallMm: 15.24, pressuresBar: [411, 394, 356, 296] },
    { dn: 100, odMm: 114.3, wallMm: 17.12, pressuresBar: [352, 338, 305, 253] },
    { dn: 125, odMm: 141.3, wallMm: 19.05, pressuresBar: [312, 300, 270, 225] },
    { dn: 150, odMm: 168.3, wallMm: 22.23, pressuresBar: [301, 289, 261, 217] },
    { dn: 200, odMm: 219.1, wallMm: 22.23, pressuresBar: [228, 219, 198, 164] },
    { dn: 250, odMm: 273.0, wallMm: 25.40, pressuresBar: [208, 199, 180, 150] },
    { dn: 300, odMm: 323.9, wallMm: 25.40, pressuresBar: [173, 166, 150, 124] },
  ],
};

// Schedule name normalization map
export const SCHEDULE_TO_FITTING_CLASS: Record<string, string> = {
  // STD mappings
  'STD': 'STD',
  'STD (40)': 'STD',
  '40': 'STD',
  'Sch 40': 'STD',
  'Sch40': 'STD',
  'SCH40': 'STD',
  'Sch 40/STD': 'STD',
  // XH/XS mappings
  'XH': 'XH',
  'XS': 'XH',
  'XS (80)': 'XH',
  '80': 'XH',
  'Sch 80': 'XH',
  'Sch80': 'XH',
  'SCH80': 'XH',
  'Sch 80/XS': 'XH',
  // XXH/XXS mappings
  'XXH': 'XXH',
  'XXS': 'XXH',
  'Sch 160': 'XXH',
  '160': 'XXH',
  'Sch160': 'XXH',
  'SCH160': 'XXH',
};

// OD lookup by DN
export const DN_TO_OD_MM: Record<number, number> = {
  15: 21.3,
  20: 26.7,
  25: 33.4,
  32: 42.2,
  40: 48.3,
  50: 60.3,
  65: 73.0,
  80: 88.9,
  90: 101.6,
  100: 114.3,
  125: 141.3,
  150: 168.3,
  200: 219.1,
  250: 273.0,
  300: 323.9,
  350: 355.6,
  400: 406.4,
  450: 457.2,
  500: 508.0,
  600: 609.6,
};
