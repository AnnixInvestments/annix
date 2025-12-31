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

interface CarbonSteelPipeData {
  dn: number;
  schedule: string;
  wall_mm: number;
  pressures_bar: number[];
}

interface StainlessSteelPipeData {
  dn: number;
  nps_equiv: string;
  schedule: string;
  od_mm: number;
  wall_mm: number;
  weight_kg_m: number;
  id_mm: number;
  burst_bar: number;
}

interface FittingData {
  dn: number;
  od_mm: number;
  wall_mm: number;
  pressures_bar: number[];
}

// 1. Carbon Steel Seamless Pipes (ASTM A106/API 5L/ASTM A53 Equivalent)
// Temperatures (°C): [-29 to 38, 205, 260, 350, 370, 400, 430, 450]
export const CARBON_STEEL_PIPES: CarbonSteelPipeData[] = [
  { dn: 15, schedule: 'STD (40)', wall_mm: 2.77, pressures_bar: [344, 344, 325, 293, 289, 224, 186, 150] },
  { dn: 15, schedule: 'XS (80)', wall_mm: 3.73, pressures_bar: [481, 481, 455, 409, 404, 313, 260, 209] },
  { dn: 15, schedule: '160', wall_mm: 4.78, pressures_bar: [628, 628, 594, 534, 528, 408, 339, 273] },
  { dn: 15, schedule: 'XXS', wall_mm: 7.47, pressures_bar: [982, 982, 928, 835, 825, 639, 531, 427] },
  { dn: 20, schedule: 'STD (40)', wall_mm: 2.87, pressures_bar: [281, 281, 265, 239, 236, 182, 152, 122] },
  { dn: 20, schedule: 'XS (80)', wall_mm: 3.91, pressures_bar: [394, 394, 372, 335, 331, 256, 213, 171] },
  { dn: 20, schedule: '160', wall_mm: 5.56, pressures_bar: [582, 582, 550, 494, 488, 378, 314, 253] },
  { dn: 20, schedule: 'XXS', wall_mm: 7.82, pressures_bar: [831, 831, 785, 706, 698, 540, 449, 362] },
  { dn: 25, schedule: 'STD (40)', wall_mm: 3.38, pressures_bar: [263, 263, 248, 223, 220, 171, 142, 114] },
  { dn: 25, schedule: 'XS (80)', wall_mm: 4.55, pressures_bar: [363, 363, 343, 309, 305, 236, 196, 158] },
  { dn: 25, schedule: '160', wall_mm: 6.35, pressures_bar: [525, 525, 496, 446, 441, 341, 283, 228] },
  { dn: 25, schedule: 'XXS', wall_mm: 9.09, pressures_bar: [770, 770, 728, 655, 647, 501, 416, 335] },
  { dn: 32, schedule: 'STD (40)', wall_mm: 3.56, pressures_bar: [216, 216, 204, 184, 182, 140, 117, 94] },
  { dn: 32, schedule: 'XS (80)', wall_mm: 4.85, pressures_bar: [302, 302, 285, 257, 253, 196, 163, 131] },
  { dn: 32, schedule: '160', wall_mm: 6.35, pressures_bar: [406, 406, 384, 345, 341, 264, 219, 177] },
  { dn: 32, schedule: 'XXS', wall_mm: 9.70, pressures_bar: [646, 646, 610, 549, 543, 420, 349, 281] },
  { dn: 40, schedule: 'STD (40)', wall_mm: 3.68, pressures_bar: [194, 194, 184, 165, 163, 126, 105, 85] },
  { dn: 40, schedule: 'XS (80)', wall_mm: 5.08, pressures_bar: [274, 274, 259, 233, 230, 178, 148, 119] },
  { dn: 40, schedule: '160', wall_mm: 7.14, pressures_bar: [397, 397, 376, 338, 334, 259, 215, 173] },
  { dn: 40, schedule: 'XXS', wall_mm: 10.16, pressures_bar: [588, 588, 556, 500, 494, 382, 317, 256] },
  { dn: 50, schedule: 'STD (40)', wall_mm: 3.91, pressures_bar: [164, 164, 155, 139, 138, 106, 88, 71] },
  { dn: 50, schedule: 'XS (80)', wall_mm: 5.54, pressures_bar: [237, 237, 224, 201, 199, 154, 128, 103] },
  { dn: 50, schedule: '160', wall_mm: 8.74, pressures_bar: [389, 389, 367, 330, 327, 253, 210, 169] },
  { dn: 50, schedule: 'XXS', wall_mm: 11.07, pressures_bar: [508, 508, 480, 432, 427, 330, 274, 221] },
  { dn: 65, schedule: 'STD (40)', wall_mm: 5.16, pressures_bar: [179, 179, 169, 152, 150, 116, 97, 78] },
  { dn: 65, schedule: 'XS (80)', wall_mm: 7.01, pressures_bar: [248, 248, 234, 211, 208, 161, 134, 108] },
  { dn: 65, schedule: '160', wall_mm: 9.53, pressures_bar: [346, 346, 327, 294, 291, 225, 187, 151] },
  { dn: 65, schedule: 'XXS', wall_mm: 14.02, pressures_bar: [531, 531, 502, 451, 446, 345, 287, 231] },
  { dn: 80, schedule: 'STD (40)', wall_mm: 5.49, pressures_bar: [156, 156, 150, 132, 131, 101, 84, 68] },
  { dn: 80, schedule: 'XS (80)', wall_mm: 7.62, pressures_bar: [220, 220, 208, 187, 185, 143, 119, 96] },
  { dn: 80, schedule: '160', wall_mm: 11.13, pressures_bar: [331, 331, 313, 281, 278, 215, 179, 144] },
  { dn: 80, schedule: 'XXS', wall_mm: 15.24, pressures_bar: [470, 470, 444, 399, 395, 305, 254, 204] },
  { dn: 100, schedule: 'STD (40)', wall_mm: 6.02, pressures_bar: [132, 132, 125, 112, 111, 86, 71, 57] },
  { dn: 100, schedule: 'XS (80)', wall_mm: 8.56, pressures_bar: [191, 191, 180, 162, 160, 124, 121, 83] },
  { dn: 100, schedule: '120', wall_mm: 11.13, pressures_bar: [252, 252, 238, 214, 212, 164, 136, 110] },
  { dn: 100, schedule: '160', wall_mm: 13.49, pressures_bar: [310, 310, 293, 264, 261, 202, 168, 132] },
  { dn: 100, schedule: 'XXS', wall_mm: 17.12, pressures_bar: [403, 403, 381, 343, 339, 262, 218, 175] },
  { dn: 125, schedule: 'STD (40)', wall_mm: 6.55, pressures_bar: [116, 116, 109, 98, 97, 75, 62, 50] },
  { dn: 125, schedule: 'XS (80)', wall_mm: 9.53, pressures_bar: [171, 171, 161, 145, 143, 111, 92, 74] },
  { dn: 125, schedule: '120', wall_mm: 12.70, pressures_bar: [231, 231, 219, 197, 194, 150, 125, 101] },
  { dn: 125, schedule: '160', wall_mm: 15.88, pressures_bar: [294, 294, 278, 250, 247, 191, 159, 128] },
  { dn: 125, schedule: 'XXS', wall_mm: 19.05, pressures_bar: [359, 359, 339, 305, 302, 233, 194, 156] },
  { dn: 150, schedule: 'STD (40)', wall_mm: 7.11, pressures_bar: [106, 106, 99, 89, 88, 68, 54, 46] },
  { dn: 150, schedule: 'XS (80)', wall_mm: 10.97, pressures_bar: [165, 165, 156, 140, 138, 107, 89, 72] },
  { dn: 150, schedule: '120', wall_mm: 14.27, pressures_bar: [217, 217, 206, 184, 183, 141, 117, 95] },
  { dn: 150, schedule: 'XXS (160)', wall_mm: 18.26, pressures_bar: [283, 283, 268, 241, 238, 184, 153, 123] },
  { dn: 200, schedule: '20', wall_mm: 6.35, pressures_bar: [71, 71, 67, 61, 60, 46, 39, 31] },
  { dn: 200, schedule: '30', wall_mm: 7.04, pressures_bar: [79, 79, 75, 67, 67, 51, 43, 34] },
  { dn: 200, schedule: 'STD (40)', wall_mm: 8.18, pressures_bar: [92, 92, 87, 79, 78, 60, 50, 40] },
  { dn: 200, schedule: '60', wall_mm: 10.31, pressures_bar: [117, 117, 111, 100, 99, 76, 63, 51] },
  { dn: 200, schedule: 'XS (80)', wall_mm: 12.70, pressures_bar: [146, 146, 138, 124, 122, 95, 79, 63] },
  { dn: 200, schedule: '100', wall_mm: 15.09, pressures_bar: [175, 175, 165, 148, 147, 113, 94, 76] },
  { dn: 200, schedule: '120', wall_mm: 18.26, pressures_bar: [213, 213, 202, 181, 179, 139, 115, 93] },
  { dn: 200, schedule: '140', wall_mm: 20.62, pressures_bar: [243, 243, 230, 207, 204, 158, 131, 106] },
  { dn: 200, schedule: 'XXS', wall_mm: 22.23, pressures_bar: [263, 263, 249, 224, 221, 171, 142, 115] },
  { dn: 200, schedule: '160', wall_mm: 23.01, pressures_bar: [273, 273, 258, 232, 230, 178, 148, 119] },
];

// 2. Stainless Steel Pipes (ASTM A312 / ASME SA312)
// Burst pressure at ambient temp; derate for higher temps per ASME B31.3
export const STAINLESS_STEEL_PIPES: StainlessSteelPipeData[] = [
  { dn: 6, nps_equiv: '1/8', schedule: '5S/5', od_mm: 10.29, wall_mm: 0.89, weight_kg_m: 0.21, id_mm: 8.51, burst_bar: 834 },
  { dn: 6, nps_equiv: '1/8', schedule: '10S/10', od_mm: 10.29, wall_mm: 1.24, weight_kg_m: 0.28, id_mm: 9.40, burst_bar: 1168 },
  { dn: 6, nps_equiv: '1/8', schedule: '40S/STD/40', od_mm: 10.29, wall_mm: 1.73, weight_kg_m: 0.36, id_mm: 6.83, burst_bar: 1621 },
  { dn: 6, nps_equiv: '1/8', schedule: '80S/XH/80', od_mm: 10.29, wall_mm: 2.41, weight_kg_m: 0.47, id_mm: 5.46, burst_bar: 2265 },
  { dn: 8, nps_equiv: '1/4', schedule: '5S/5', od_mm: 13.72, wall_mm: 1.24, weight_kg_m: 0.38, id_mm: 11.23, burst_bar: 876 },
  { dn: 8, nps_equiv: '1/4', schedule: '10S/10', od_mm: 13.72, wall_mm: 1.65, weight_kg_m: 0.49, id_mm: 10.41, burst_bar: 1162 },
  { dn: 8, nps_equiv: '1/4', schedule: '40S/STD/40', od_mm: 13.72, wall_mm: 2.24, weight_kg_m: 0.63, id_mm: 9.25, burst_bar: 1573 },
  { dn: 8, nps_equiv: '1/4', schedule: '80S/XH/80', od_mm: 13.72, wall_mm: 3.02, weight_kg_m: 0.80, id_mm: 7.67, burst_bar: 2128 },
  { dn: 10, nps_equiv: '3/8', schedule: '5S/5', od_mm: 17.15, wall_mm: 1.24, weight_kg_m: 0.49, id_mm: 14.66, burst_bar: 701 },
  { dn: 10, nps_equiv: '3/8', schedule: '10S/10', od_mm: 17.15, wall_mm: 1.65, weight_kg_m: 0.63, id_mm: 13.84, burst_bar: 930 },
  { dn: 10, nps_equiv: '3/8', schedule: '40S/STD/40', od_mm: 17.15, wall_mm: 2.31, weight_kg_m: 0.84, id_mm: 12.53, burst_bar: 1301 },
  { dn: 10, nps_equiv: '3/8', schedule: '80S/XH/80', od_mm: 17.15, wall_mm: 3.20, weight_kg_m: 1.10, id_mm: 10.74, burst_bar: 1802 },
  { dn: 15, nps_equiv: '1/2', schedule: '5S/5', od_mm: 21.34, wall_mm: 1.65, weight_kg_m: 0.80, id_mm: 18.03, burst_bar: 930 },
  { dn: 15, nps_equiv: '1/2', schedule: '10S/10', od_mm: 21.34, wall_mm: 2.11, weight_kg_m: 1.00, id_mm: 17.12, burst_bar: 1187 },
  { dn: 15, nps_equiv: '1/2', schedule: '40S/STD/40', od_mm: 21.34, wall_mm: 2.77, weight_kg_m: 1.27, id_mm: 15.80, burst_bar: 2102 },
  { dn: 15, nps_equiv: '1/2', schedule: '80S/XH/80', od_mm: 21.34, wall_mm: 3.73, weight_kg_m: 1.62, id_mm: 13.87, burst_bar: 4204 },
  { dn: 20, nps_equiv: '3/4', schedule: '5S/5', od_mm: 26.67, wall_mm: 1.65, weight_kg_m: 1.02, id_mm: 23.37, burst_bar: 597 },
  { dn: 20, nps_equiv: '3/4', schedule: '10S/10', od_mm: 26.67, wall_mm: 2.11, weight_kg_m: 1.28, id_mm: 22.45, burst_bar: 1038 },
  { dn: 20, nps_equiv: '3/4', schedule: '40S/STD/40', od_mm: 26.67, wall_mm: 2.87, weight_kg_m: 1.68, id_mm: 20.93, burst_bar: 1038 },
  { dn: 20, nps_equiv: '3/4', schedule: '80S/XH/80', od_mm: 26.67, wall_mm: 3.91, weight_kg_m: 2.20, id_mm: 18.85, burst_bar: 2013 },
  { dn: 20, nps_equiv: '3/4', schedule: 'XXH', od_mm: 26.67, wall_mm: 7.82, weight_kg_m: 3.63, id_mm: 11.03, burst_bar: 2832 },
  { dn: 25, nps_equiv: '1', schedule: '5S/5', od_mm: 33.40, wall_mm: 1.65, weight_kg_m: 1.29, id_mm: 30.10, burst_bar: 477 },
  { dn: 25, nps_equiv: '1', schedule: '10S/10', od_mm: 33.40, wall_mm: 2.77, weight_kg_m: 2.09, id_mm: 27.86, burst_bar: 976 },
  { dn: 25, nps_equiv: '1', schedule: '40S/STD/40', od_mm: 33.40, wall_mm: 3.38, weight_kg_m: 2.50, id_mm: 26.64, burst_bar: 976 },
  { dn: 25, nps_equiv: '1', schedule: '80S/XH/80', od_mm: 33.40, wall_mm: 4.55, weight_kg_m: 3.24, id_mm: 24.30, burst_bar: 1835 },
  { dn: 25, nps_equiv: '1', schedule: 'XXH', od_mm: 33.40, wall_mm: 9.09, weight_kg_m: 5.45, id_mm: 15.22, burst_bar: 2628 },
];

// 3. Carbon Steel Weld Fittings (WPB Grade, ASME B31.1 Equivalent)
// Temperatures (°C): [20-343, 371, 399, 427]
export const CARBON_STEEL_FITTINGS: Record<string, FittingData[]> = {
  'STD': [
    { dn: 15, od_mm: 21.3, wall_mm: 2.77, pressures_bar: [299, 287, 259, 215] },
    { dn: 20, od_mm: 26.7, wall_mm: 2.87, pressures_bar: [248, 238, 215, 179] },
    { dn: 25, od_mm: 33.4, wall_mm: 3.38, pressures_bar: [227, 218, 197, 164] },
    { dn: 32, od_mm: 42.2, wall_mm: 3.56, pressures_bar: [187, 179, 162, 134] },
    { dn: 40, od_mm: 48.3, wall_mm: 3.68, pressures_bar: [168, 161, 145, 121] },
    { dn: 50, od_mm: 60.3, wall_mm: 3.91, pressures_bar: [141, 135, 122, 102] },
    { dn: 65, od_mm: 73.0, wall_mm: 5.16, pressures_bar: [155, 149, 134, 111] },
    { dn: 80, od_mm: 88.9, wall_mm: 5.49, pressures_bar: [134, 129, 116, 97] },
    { dn: 90, od_mm: 101.6, wall_mm: 5.74, pressures_bar: [122, 117, 106, 88] },
    { dn: 100, od_mm: 114.3, wall_mm: 6.02, pressures_bar: [113, 109, 98, 82] },
    { dn: 125, od_mm: 141.3, wall_mm: 6.55, pressures_bar: [100, 95, 86, 72] },
    { dn: 150, od_mm: 168.3, wall_mm: 7.11, pressures_bar: [90, 87, 78, 65] },
    { dn: 200, od_mm: 219.1, wall_mm: 8.18, pressures_bar: [79, 76, 69, 57] },
    { dn: 250, od_mm: 273.0, wall_mm: 9.27, pressures_bar: [72, 69, 62, 52] },
    { dn: 300, od_mm: 323.9, wall_mm: 9.53, pressures_bar: [62, 60, 54, 45] },
  ],
  'XH': [
    { dn: 15, od_mm: 21.3, wall_mm: 3.73, pressures_bar: [420, 404, 364, 303] },
    { dn: 20, od_mm: 26.7, wall_mm: 3.91, pressures_bar: [351, 337, 304, 252] },
    { dn: 25, od_mm: 33.4, wall_mm: 4.55, pressures_bar: [316, 303, 274, 227] },
    { dn: 32, od_mm: 42.2, wall_mm: 4.85, pressures_bar: [262, 251, 226, 188] },
    { dn: 40, od_mm: 48.3, wall_mm: 5.08, pressures_bar: [237, 228, 206, 171] },
    { dn: 50, od_mm: 60.3, wall_mm: 5.54, pressures_bar: [205, 196, 177, 147] },
    { dn: 65, od_mm: 73.0, wall_mm: 7.01, pressures_bar: [215, 206, 186, 154] },
    { dn: 80, od_mm: 88.9, wall_mm: 7.62, pressures_bar: [190, 182, 164, 137] },
    { dn: 100, od_mm: 114.3, wall_mm: 8.56, pressures_bar: [164, 158, 143, 118] },
    { dn: 125, od_mm: 141.3, wall_mm: 9.53, pressures_bar: [147, 141, 128, 106] },
    { dn: 150, od_mm: 168.3, wall_mm: 10.97, pressures_bar: [142, 136, 123, 102] },
    { dn: 200, od_mm: 219.1, wall_mm: 12.70, pressures_bar: [125, 120, 109, 90] },
    { dn: 250, od_mm: 273.0, wall_mm: 12.70, pressures_bar: [100, 96, 87, 72] },
    { dn: 300, od_mm: 323.9, wall_mm: 12.70, pressures_bar: [83, 80, 72, 60] },
  ],
  'XXH': [
    { dn: 15, od_mm: 21.3, wall_mm: 7.47, pressures_bar: [1004, 964, 870, 724] },
    { dn: 20, od_mm: 26.7, wall_mm: 7.82, pressures_bar: [813, 780, 704, 585] },
    { dn: 25, od_mm: 33.4, wall_mm: 9.09, pressures_bar: [719, 691, 623, 518] },
    { dn: 32, od_mm: 42.2, wall_mm: 9.70, pressures_bar: [583, 560, 505, 420] },
    { dn: 40, od_mm: 48.3, wall_mm: 10.16, pressures_bar: [523, 502, 453, 377] },
    { dn: 50, od_mm: 60.3, wall_mm: 11.07, pressures_bar: [447, 429, 387, 322] },
    { dn: 65, od_mm: 73.0, wall_mm: 14.02, pressures_bar: [469, 450, 406, 338] },
    { dn: 80, od_mm: 88.9, wall_mm: 15.24, pressures_bar: [411, 394, 356, 296] },
    { dn: 100, od_mm: 114.3, wall_mm: 17.12, pressures_bar: [352, 338, 305, 253] },
    { dn: 125, od_mm: 141.3, wall_mm: 19.05, pressures_bar: [312, 300, 270, 225] },
    { dn: 150, od_mm: 168.3, wall_mm: 22.23, pressures_bar: [301, 289, 261, 217] },
    { dn: 200, od_mm: 219.1, wall_mm: 22.23, pressures_bar: [228, 219, 198, 164] },
    { dn: 250, od_mm: 273.0, wall_mm: 25.40, pressures_bar: [208, 199, 180, 150] },
    { dn: 300, od_mm: 323.9, wall_mm: 25.40, pressures_bar: [173, 166, 150, 124] },
  ]
};

// Schedule name normalization map
const SCHEDULE_NORMALIZE: Record<string, string> = {
  'STD': 'STD (40)',
  '40': 'STD (40)',
  'Sch40': 'STD (40)',
  'SCH40': 'STD (40)',
  'XS': 'XS (80)',
  '80': 'XS (80)',
  'Sch80': 'XS (80)',
  'SCH80': 'XS (80)',
  'XH': 'XS (80)',
  'XXS': 'XXS',
  'XXH': 'XXS',
  '160': '160',
  'Sch160': '160',
  'SCH160': '160',
  '120': '120',
  'Sch120': '120',
  'SCH120': '120',
  '100': '100',
  'Sch100': '100',
  'SCH100': '100',
  '60': '60',
  'Sch60': '60',
  'SCH60': '60',
  '30': '30',
  'Sch30': '30',
  'SCH30': '30',
  '20': '20',
  'Sch20': '20',
  'SCH20': '20',
};

/**
 * Get the temperature index for carbon steel pipe pressure lookup
 */
function getCarbonSteelTempIndex(tempC: number): number {
  // Temperature breakpoints: [-29 to 38, 205, 260, 350, 370, 400, 430, 450]
  if (tempC <= 38) return 0;
  if (tempC <= 205) return 1;
  if (tempC <= 260) return 2;
  if (tempC <= 350) return 3;
  if (tempC <= 370) return 4;
  if (tempC <= 400) return 5;
  if (tempC <= 430) return 6;
  return 7;
}

/**
 * Normalize schedule name for lookup
 */
function normalizeSchedule(schedule: string): string {
  if (!schedule) return 'STD (40)';
  const upper = schedule.toUpperCase().replace(/\s/g, '');
  return SCHEDULE_NORMALIZE[upper] || schedule;
}

export interface WeldThicknessRecommendation {
  recommendedSchedule: string;
  recommendedWallMm: number;
  maxPressureBar: number;
  currentSchedule: string;
  currentWallMm: number | null;
  isAdequate: boolean;
  warning?: string;
  temperatureC: number;
  pressureBar: number;
  dn: number;
}

/**
 * Recommend minimum wall thickness for carbon steel pipes based on DN, pressure, and temperature.
 * Returns the minimum schedule/wall thickness that can handle the design conditions.
 */
export function recommendWallThicknessCarbonPipe(
  dn: number,
  designPressureBar: number,
  tempC: number,
  currentSchedule?: string
): WeldThicknessRecommendation | null {
  const tempIdx = getCarbonSteelTempIndex(tempC);

  // Find all pipes for this DN that can handle the pressure at this temperature
  const candidates = CARBON_STEEL_PIPES.filter(
    p => p.dn === dn && p.pressures_bar[tempIdx] >= designPressureBar
  );

  if (candidates.length === 0) {
    // No standard schedule can handle this - find the maximum available
    const allForDn = CARBON_STEEL_PIPES.filter(p => p.dn === dn);
    if (allForDn.length === 0) {
      return null; // DN not found
    }

    // Return the thickest available with a warning
    const thickest = allForDn.reduce((max, p) =>
      p.wall_mm > max.wall_mm ? p : max
    );

    const normalizedCurrent = currentSchedule ? normalizeSchedule(currentSchedule) : null;
    const currentPipe = normalizedCurrent
      ? CARBON_STEEL_PIPES.find(p => p.dn === dn && p.schedule.includes(normalizedCurrent.replace(' (40)', '').replace(' (80)', '')))
      : null;

    return {
      recommendedSchedule: thickest.schedule,
      recommendedWallMm: thickest.wall_mm,
      maxPressureBar: thickest.pressures_bar[tempIdx],
      currentSchedule: currentSchedule || 'Not specified',
      currentWallMm: currentPipe?.wall_mm || null,
      isAdequate: false,
      warning: `Design pressure ${designPressureBar} bar at ${tempC}°C exceeds maximum rating. Consider special wall thickness or material upgrade.`,
      temperatureC: tempC,
      pressureBar: designPressureBar,
      dn: dn,
    };
  }

  // Find the minimum wall thickness that meets requirements
  const recommended = candidates.reduce((min, p) =>
    p.wall_mm < min.wall_mm ? p : min
  );

  // Check if current schedule is adequate
  const normalizedCurrent = currentSchedule ? normalizeSchedule(currentSchedule) : null;
  const currentPipe = normalizedCurrent
    ? CARBON_STEEL_PIPES.find(p => p.dn === dn && (p.schedule === normalizedCurrent || p.schedule.includes(normalizedCurrent.replace(' (40)', '').replace(' (80)', ''))))
    : null;

  const isAdequate = currentPipe
    ? currentPipe.pressures_bar[tempIdx] >= designPressureBar
    : false;

  return {
    recommendedSchedule: recommended.schedule,
    recommendedWallMm: recommended.wall_mm,
    maxPressureBar: recommended.pressures_bar[tempIdx],
    currentSchedule: currentSchedule || 'Not specified',
    currentWallMm: currentPipe?.wall_mm || null,
    isAdequate,
    warning: !isAdequate && currentSchedule
      ? `Selected schedule ${currentSchedule} may not be adequate for ${designPressureBar} bar at ${tempC}°C`
      : undefined,
    temperatureC: tempC,
    pressureBar: designPressureBar,
    dn: dn,
  };
}

/**
 * Recommend minimum wall thickness for stainless steel pipes.
 * Uses burst pressure with safety factor (default 4.0) for ambient temperature.
 */
export function recommendWallThicknessStainlessPipe(
  dn: number,
  designPressureBar: number,
  safetyFactor: number = 4.0
): { schedule: string; wall_mm: number } | null {
  const candidates = STAINLESS_STEEL_PIPES.filter(
    p => p.dn === dn && (p.burst_bar / safetyFactor) >= designPressureBar
  );

  if (candidates.length === 0) {
    return null;
  }

  const minWall = candidates.reduce((min, p) =>
    p.wall_mm < min.wall_mm ? p : min
  );

  return { schedule: minWall.schedule, wall_mm: minWall.wall_mm };
}

/**
 * Get fitting wall thickness recommendation for matching pipe schedule.
 */
export function recommendFittingWallThickness(
  schedule: 'STD' | 'XH' | 'XXH',
  dn: number,
  designPressureBar: number,
  tempC: number
): FittingData | null {
  const fittings = CARBON_STEEL_FITTINGS[schedule];
  if (!fittings) return null;

  // Get temperature index for fittings (different breakpoints)
  let tempIdx = 0;
  if (tempC > 343 && tempC <= 371) tempIdx = 1;
  else if (tempC > 371 && tempC <= 399) tempIdx = 2;
  else if (tempC > 399) tempIdx = 3;

  const candidates = fittings.filter(
    f => f.dn === dn && f.pressures_bar[tempIdx] >= designPressureBar
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates[0];
}

/**
 * Get the OD for a given DN from the lookup tables
 */
export function getOuterDiameterMm(dn: number): number | null {
  const pipe = CARBON_STEEL_PIPES.find(p => p.dn === dn);
  if (pipe) {
    // Calculate OD from wall thickness (approximate)
    // OD values from standard tables
    const odLookup: Record<number, number> = {
      15: 21.3, 20: 26.7, 25: 33.4, 32: 42.2, 40: 48.3, 50: 60.3,
      65: 73.0, 80: 88.9, 100: 114.3, 125: 141.3, 150: 168.3, 200: 219.1,
      250: 273.0, 300: 323.9, 350: 355.6, 400: 406.4, 450: 457.2, 500: 508.0,
      600: 609.6
    };
    return odLookup[dn] || null;
  }
  return null;
}

/**
 * Get all available schedules for a given DN
 */
export function getAvailableSchedules(dn: number): string[] {
  return CARBON_STEEL_PIPES
    .filter(p => p.dn === dn)
    .map(p => p.schedule);
}

/**
 * Get wall thickness for a specific DN and schedule
 */
export function getWallThickness(dn: number, schedule: string): number | null {
  const normalized = normalizeSchedule(schedule);
  const pipe = CARBON_STEEL_PIPES.find(
    p => p.dn === dn && (p.schedule === normalized || p.schedule.includes(schedule))
  );
  return pipe?.wall_mm || null;
}
