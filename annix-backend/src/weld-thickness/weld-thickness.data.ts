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
  {
    dn: 15,
    schedule: "STD (40)",
    wallMm: 2.77,
    pressuresBar: [344, 344, 325, 293, 289, 224, 186, 150],
  },
  {
    dn: 15,
    schedule: "XS (80)",
    wallMm: 3.73,
    pressuresBar: [481, 481, 455, 409, 404, 313, 260, 209],
  },
  {
    dn: 15,
    schedule: "160",
    wallMm: 4.78,
    pressuresBar: [628, 628, 594, 534, 528, 408, 339, 273],
  },
  {
    dn: 15,
    schedule: "XXS",
    wallMm: 7.47,
    pressuresBar: [982, 982, 928, 835, 825, 639, 531, 427],
  },
  {
    dn: 20,
    schedule: "STD (40)",
    wallMm: 2.87,
    pressuresBar: [281, 281, 265, 239, 236, 182, 152, 122],
  },
  {
    dn: 20,
    schedule: "XS (80)",
    wallMm: 3.91,
    pressuresBar: [394, 394, 372, 335, 331, 256, 213, 171],
  },
  {
    dn: 20,
    schedule: "160",
    wallMm: 5.56,
    pressuresBar: [582, 582, 550, 494, 488, 378, 314, 253],
  },
  {
    dn: 20,
    schedule: "XXS",
    wallMm: 7.82,
    pressuresBar: [831, 831, 785, 706, 698, 540, 449, 362],
  },
  {
    dn: 25,
    schedule: "STD (40)",
    wallMm: 3.38,
    pressuresBar: [263, 263, 248, 223, 220, 171, 142, 114],
  },
  {
    dn: 25,
    schedule: "XS (80)",
    wallMm: 4.55,
    pressuresBar: [363, 363, 343, 309, 305, 236, 196, 158],
  },
  {
    dn: 25,
    schedule: "160",
    wallMm: 6.35,
    pressuresBar: [525, 525, 496, 446, 441, 341, 283, 228],
  },
  {
    dn: 25,
    schedule: "XXS",
    wallMm: 9.09,
    pressuresBar: [770, 770, 728, 655, 647, 501, 416, 335],
  },
  {
    dn: 32,
    schedule: "STD (40)",
    wallMm: 3.56,
    pressuresBar: [216, 216, 204, 184, 182, 140, 117, 94],
  },
  {
    dn: 32,
    schedule: "XS (80)",
    wallMm: 4.85,
    pressuresBar: [302, 302, 285, 257, 253, 196, 163, 131],
  },
  {
    dn: 32,
    schedule: "160",
    wallMm: 6.35,
    pressuresBar: [406, 406, 384, 345, 341, 264, 219, 177],
  },
  {
    dn: 32,
    schedule: "XXS",
    wallMm: 9.7,
    pressuresBar: [646, 646, 610, 549, 543, 420, 349, 281],
  },
  {
    dn: 40,
    schedule: "STD (40)",
    wallMm: 3.68,
    pressuresBar: [194, 194, 184, 165, 163, 126, 105, 85],
  },
  {
    dn: 40,
    schedule: "XS (80)",
    wallMm: 5.08,
    pressuresBar: [274, 274, 259, 233, 230, 178, 148, 119],
  },
  {
    dn: 40,
    schedule: "160",
    wallMm: 7.14,
    pressuresBar: [397, 397, 376, 338, 334, 259, 215, 173],
  },
  {
    dn: 40,
    schedule: "XXS",
    wallMm: 10.16,
    pressuresBar: [588, 588, 556, 500, 494, 382, 317, 256],
  },
  {
    dn: 50,
    schedule: "STD (40)",
    wallMm: 3.91,
    pressuresBar: [164, 164, 155, 139, 138, 106, 88, 71],
  },
  {
    dn: 50,
    schedule: "XS (80)",
    wallMm: 5.54,
    pressuresBar: [237, 237, 224, 201, 199, 154, 128, 103],
  },
  {
    dn: 50,
    schedule: "160",
    wallMm: 8.74,
    pressuresBar: [389, 389, 367, 330, 327, 253, 210, 169],
  },
  {
    dn: 50,
    schedule: "XXS",
    wallMm: 11.07,
    pressuresBar: [508, 508, 480, 432, 427, 330, 274, 221],
  },
  {
    dn: 65,
    schedule: "STD (40)",
    wallMm: 5.16,
    pressuresBar: [179, 179, 169, 152, 150, 116, 97, 78],
  },
  {
    dn: 65,
    schedule: "XS (80)",
    wallMm: 7.01,
    pressuresBar: [248, 248, 234, 211, 208, 161, 134, 108],
  },
  {
    dn: 65,
    schedule: "160",
    wallMm: 9.53,
    pressuresBar: [346, 346, 327, 294, 291, 225, 187, 151],
  },
  {
    dn: 65,
    schedule: "XXS",
    wallMm: 14.02,
    pressuresBar: [531, 531, 502, 451, 446, 345, 287, 231],
  },
  {
    dn: 80,
    schedule: "STD (40)",
    wallMm: 5.49,
    pressuresBar: [156, 156, 150, 132, 131, 101, 84, 68],
  },
  {
    dn: 80,
    schedule: "XS (80)",
    wallMm: 7.62,
    pressuresBar: [220, 220, 208, 187, 185, 143, 119, 96],
  },
  {
    dn: 80,
    schedule: "160",
    wallMm: 11.13,
    pressuresBar: [331, 331, 313, 281, 278, 215, 179, 144],
  },
  {
    dn: 80,
    schedule: "XXS",
    wallMm: 15.24,
    pressuresBar: [470, 470, 444, 399, 395, 305, 254, 204],
  },
  {
    dn: 100,
    schedule: "STD (40)",
    wallMm: 6.02,
    pressuresBar: [132, 132, 125, 112, 111, 86, 71, 57],
  },
  {
    dn: 100,
    schedule: "XS (80)",
    wallMm: 8.56,
    pressuresBar: [191, 191, 180, 162, 160, 124, 121, 83],
  },
  {
    dn: 100,
    schedule: "120",
    wallMm: 11.13,
    pressuresBar: [252, 252, 238, 214, 212, 164, 136, 110],
  },
  {
    dn: 100,
    schedule: "160",
    wallMm: 13.49,
    pressuresBar: [310, 310, 293, 264, 261, 202, 168, 132],
  },
  {
    dn: 100,
    schedule: "XXS",
    wallMm: 17.12,
    pressuresBar: [403, 403, 381, 343, 339, 262, 218, 175],
  },
  {
    dn: 125,
    schedule: "STD (40)",
    wallMm: 6.55,
    pressuresBar: [116, 116, 109, 98, 97, 75, 62, 50],
  },
  {
    dn: 125,
    schedule: "XS (80)",
    wallMm: 9.53,
    pressuresBar: [171, 171, 161, 145, 143, 111, 92, 74],
  },
  {
    dn: 125,
    schedule: "120",
    wallMm: 12.7,
    pressuresBar: [231, 231, 219, 197, 194, 150, 125, 101],
  },
  {
    dn: 125,
    schedule: "160",
    wallMm: 15.88,
    pressuresBar: [294, 294, 278, 250, 247, 191, 159, 128],
  },
  {
    dn: 125,
    schedule: "XXS",
    wallMm: 19.05,
    pressuresBar: [359, 359, 339, 305, 302, 233, 194, 156],
  },
  {
    dn: 150,
    schedule: "STD (40)",
    wallMm: 7.11,
    pressuresBar: [106, 106, 99, 89, 88, 68, 54, 46],
  },
  {
    dn: 150,
    schedule: "XS (80)",
    wallMm: 10.97,
    pressuresBar: [165, 165, 156, 140, 138, 107, 89, 72],
  },
  {
    dn: 150,
    schedule: "120",
    wallMm: 14.27,
    pressuresBar: [217, 217, 206, 184, 183, 141, 117, 95],
  },
  {
    dn: 150,
    schedule: "XXS (160)",
    wallMm: 18.26,
    pressuresBar: [283, 283, 268, 241, 238, 184, 153, 123],
  },
  {
    dn: 200,
    schedule: "20",
    wallMm: 6.35,
    pressuresBar: [71, 71, 67, 61, 60, 46, 39, 31],
  },
  {
    dn: 200,
    schedule: "30",
    wallMm: 7.04,
    pressuresBar: [79, 79, 75, 67, 67, 51, 43, 34],
  },
  {
    dn: 200,
    schedule: "STD (40)",
    wallMm: 8.18,
    pressuresBar: [92, 92, 87, 79, 78, 60, 50, 40],
  },
  {
    dn: 200,
    schedule: "60",
    wallMm: 10.31,
    pressuresBar: [117, 117, 111, 100, 99, 76, 63, 51],
  },
  {
    dn: 200,
    schedule: "XS (80)",
    wallMm: 12.7,
    pressuresBar: [146, 146, 138, 124, 122, 95, 79, 63],
  },
  {
    dn: 200,
    schedule: "100",
    wallMm: 15.09,
    pressuresBar: [175, 175, 165, 148, 147, 113, 94, 76],
  },
  {
    dn: 200,
    schedule: "120",
    wallMm: 18.26,
    pressuresBar: [213, 213, 202, 181, 179, 139, 115, 93],
  },
  {
    dn: 200,
    schedule: "140",
    wallMm: 20.62,
    pressuresBar: [243, 243, 230, 207, 204, 158, 131, 106],
  },
  {
    dn: 200,
    schedule: "XXS",
    wallMm: 22.23,
    pressuresBar: [263, 263, 249, 224, 221, 171, 142, 115],
  },
  {
    dn: 200,
    schedule: "160",
    wallMm: 23.01,
    pressuresBar: [273, 273, 258, 232, 230, 178, 148, 119],
  },
  {
    dn: 250,
    schedule: "STD",
    wallMm: 9.27,
    pressuresBar: [72, 72, 69, 62, 61, 47, 39, 32],
  },
  {
    dn: 250,
    schedule: "XS",
    wallMm: 12.7,
    pressuresBar: [100, 100, 96, 87, 86, 66, 55, 44],
  },
  // DN 300 (NPS 12)
  {
    dn: 300,
    schedule: "10",
    wallMm: 6.35,
    pressuresBar: [71, 71, 67, 60, 59, 46, 38, 31],
  },
  {
    dn: 300,
    schedule: "20",
    wallMm: 7.62,
    pressuresBar: [86, 86, 81, 73, 72, 56, 46, 37],
  },
  {
    dn: 300,
    schedule: "30",
    wallMm: 8.38,
    pressuresBar: [95, 95, 90, 81, 80, 62, 51, 41],
  },
  {
    dn: 300,
    schedule: "STD",
    wallMm: 9.53,
    pressuresBar: [108, 108, 102, 92, 91, 70, 58, 47],
  },
  {
    dn: 300,
    schedule: "40",
    wallMm: 9.53,
    pressuresBar: [108, 108, 102, 92, 91, 70, 58, 47],
  },
  {
    dn: 300,
    schedule: "60",
    wallMm: 12.7,
    pressuresBar: [145, 145, 137, 123, 122, 94, 78, 63],
  },
  {
    dn: 300,
    schedule: "XS",
    wallMm: 12.7,
    pressuresBar: [145, 145, 137, 123, 122, 94, 78, 63],
  },
  {
    dn: 300,
    schedule: "80",
    wallMm: 12.7,
    pressuresBar: [145, 145, 137, 123, 122, 94, 78, 63],
  },
  {
    dn: 300,
    schedule: "100",
    wallMm: 15.88,
    pressuresBar: [184, 184, 174, 156, 154, 119, 99, 80],
  },
  {
    dn: 300,
    schedule: "120",
    wallMm: 19.05,
    pressuresBar: [222, 222, 210, 189, 187, 144, 120, 97],
  },
  {
    dn: 300,
    schedule: "140",
    wallMm: 22.23,
    pressuresBar: [261, 261, 247, 222, 219, 170, 141, 114],
  },
  {
    dn: 300,
    schedule: "160",
    wallMm: 25.4,
    pressuresBar: [300, 300, 283, 255, 252, 195, 162, 130],
  },
  {
    dn: 300,
    schedule: "XXS",
    wallMm: 25.4,
    pressuresBar: [300, 300, 283, 255, 252, 195, 162, 130],
  },
  // DN 350 (NPS 14)
  {
    dn: 350,
    schedule: "10",
    wallMm: 6.35,
    pressuresBar: [62, 62, 59, 53, 52, 40, 33, 27],
  },
  {
    dn: 350,
    schedule: "20",
    wallMm: 7.92,
    pressuresBar: [78, 78, 74, 66, 65, 51, 42, 34],
  },
  {
    dn: 350,
    schedule: "30",
    wallMm: 9.53,
    pressuresBar: [94, 94, 89, 80, 79, 61, 51, 41],
  },
  {
    dn: 350,
    schedule: "STD",
    wallMm: 9.53,
    pressuresBar: [94, 94, 89, 80, 79, 61, 51, 41],
  },
  {
    dn: 350,
    schedule: "40",
    wallMm: 9.53,
    pressuresBar: [94, 94, 89, 80, 79, 61, 51, 41],
  },
  {
    dn: 350,
    schedule: "XS",
    wallMm: 12.7,
    pressuresBar: [126, 126, 119, 107, 106, 82, 68, 55],
  },
  {
    dn: 350,
    schedule: "60",
    wallMm: 14.27,
    pressuresBar: [142, 142, 134, 121, 119, 92, 77, 62],
  },
  {
    dn: 350,
    schedule: "80",
    wallMm: 15.88,
    pressuresBar: [158, 158, 149, 134, 133, 103, 85, 69],
  },
  {
    dn: 350,
    schedule: "100",
    wallMm: 19.05,
    pressuresBar: [191, 191, 180, 162, 160, 124, 103, 83],
  },
  {
    dn: 350,
    schedule: "120",
    wallMm: 22.22,
    pressuresBar: [223, 223, 211, 190, 187, 145, 120, 97],
  },
  {
    dn: 350,
    schedule: "140",
    wallMm: 25.4,
    pressuresBar: [256, 256, 242, 218, 215, 166, 138, 111],
  },
  {
    dn: 350,
    schedule: "160",
    wallMm: 28.58,
    pressuresBar: [289, 289, 273, 245, 242, 187, 156, 125],
  },
  // DN 400 (NPS 16)
  {
    dn: 400,
    schedule: "10",
    wallMm: 6.35,
    pressuresBar: [54, 54, 51, 46, 45, 35, 29, 23],
  },
  {
    dn: 400,
    schedule: "20",
    wallMm: 7.92,
    pressuresBar: [68, 68, 64, 58, 57, 44, 37, 30],
  },
  {
    dn: 400,
    schedule: "STD",
    wallMm: 9.53,
    pressuresBar: [82, 82, 78, 70, 69, 53, 44, 36],
  },
  {
    dn: 400,
    schedule: "XS",
    wallMm: 12.7,
    pressuresBar: [110, 110, 104, 93, 92, 71, 59, 48],
  },
  {
    dn: 400,
    schedule: "60",
    wallMm: 16.66,
    pressuresBar: [145, 145, 137, 123, 122, 94, 78, 63],
  },
  {
    dn: 400,
    schedule: "80",
    wallMm: 19.05,
    pressuresBar: [167, 167, 158, 142, 140, 108, 90, 72],
  },
  // DN 450 (NPS 18)
  {
    dn: 450,
    schedule: "10",
    wallMm: 6.35,
    pressuresBar: [48, 48, 45, 41, 40, 31, 26, 21],
  },
  {
    dn: 450,
    schedule: "20",
    wallMm: 7.92,
    pressuresBar: [60, 60, 57, 51, 50, 39, 32, 26],
  },
  {
    dn: 450,
    schedule: "STD",
    wallMm: 9.53,
    pressuresBar: [73, 73, 69, 62, 61, 47, 39, 32],
  },
  {
    dn: 450,
    schedule: "XS",
    wallMm: 12.7,
    pressuresBar: [97, 97, 92, 83, 82, 63, 52, 42],
  },
  {
    dn: 450,
    schedule: "60",
    wallMm: 17.48,
    pressuresBar: [135, 135, 127, 115, 113, 88, 73, 59],
  },
  {
    dn: 450,
    schedule: "80",
    wallMm: 20.62,
    pressuresBar: [160, 160, 151, 136, 134, 104, 86, 69],
  },
  // DN 500 (NPS 20)
  {
    dn: 500,
    schedule: "10",
    wallMm: 6.35,
    pressuresBar: [43, 43, 41, 37, 36, 28, 23, 19],
  },
  {
    dn: 500,
    schedule: "20",
    wallMm: 9.53,
    pressuresBar: [65, 65, 62, 56, 55, 42, 35, 28],
  },
  {
    dn: 500,
    schedule: "STD",
    wallMm: 9.53,
    pressuresBar: [65, 65, 62, 56, 55, 42, 35, 28],
  },
  {
    dn: 500,
    schedule: "XS",
    wallMm: 12.7,
    pressuresBar: [87, 87, 82, 74, 73, 57, 47, 38],
  },
  {
    dn: 500,
    schedule: "60",
    wallMm: 18.26,
    pressuresBar: [127, 127, 120, 108, 106, 82, 68, 55],
  },
  {
    dn: 500,
    schedule: "80",
    wallMm: 20.62,
    pressuresBar: [143, 143, 135, 122, 120, 93, 77, 62],
  },
  // DN 600 (NPS 24)
  {
    dn: 600,
    schedule: "10",
    wallMm: 6.35,
    pressuresBar: [36, 36, 34, 31, 30, 23, 19, 16],
  },
  {
    dn: 600,
    schedule: "20",
    wallMm: 9.53,
    pressuresBar: [54, 54, 51, 46, 45, 35, 29, 23],
  },
  {
    dn: 600,
    schedule: "STD",
    wallMm: 9.53,
    pressuresBar: [54, 54, 51, 46, 45, 35, 29, 23],
  },
  {
    dn: 600,
    schedule: "XS",
    wallMm: 12.7,
    pressuresBar: [73, 73, 69, 62, 61, 47, 39, 32],
  },
  {
    dn: 600,
    schedule: "60",
    wallMm: 24.61,
    pressuresBar: [142, 142, 134, 121, 119, 92, 77, 62],
  },
  {
    dn: 600,
    schedule: "80",
    wallMm: 30.96,
    pressuresBar: [180, 180, 170, 153, 151, 117, 97, 78],
  },
  // DN 750 (NPS 30)
  {
    dn: 750,
    schedule: "10",
    wallMm: 7.92,
    pressuresBar: [36, 36, 34, 31, 30, 23, 19, 16],
  },
  {
    dn: 750,
    schedule: "20",
    wallMm: 9.53,
    pressuresBar: [43, 43, 41, 37, 36, 28, 23, 19],
  },
  {
    dn: 750,
    schedule: "STD",
    wallMm: 9.53,
    pressuresBar: [43, 43, 41, 37, 36, 28, 23, 19],
  },
  {
    dn: 750,
    schedule: "XS",
    wallMm: 12.7,
    pressuresBar: [58, 58, 55, 49, 49, 38, 31, 25],
  },
  // DN 900 (NPS 36)
  {
    dn: 900,
    schedule: "10",
    wallMm: 9.53,
    pressuresBar: [36, 36, 34, 31, 30, 23, 19, 16],
  },
  {
    dn: 900,
    schedule: "STD",
    wallMm: 9.53,
    pressuresBar: [36, 36, 34, 31, 30, 23, 19, 16],
  },
  {
    dn: 900,
    schedule: "XS",
    wallMm: 12.7,
    pressuresBar: [48, 48, 45, 41, 40, 31, 26, 21],
  },
  // DN 1000 (NPS 40)
  {
    dn: 1000,
    schedule: "10",
    wallMm: 9.53,
    pressuresBar: [32, 32, 31, 28, 27, 21, 17, 14],
  },
  {
    dn: 1000,
    schedule: "STD",
    wallMm: 9.53,
    pressuresBar: [32, 32, 31, 28, 27, 21, 17, 14],
  },
  {
    dn: 1000,
    schedule: "XS",
    wallMm: 12.7,
    pressuresBar: [43, 43, 41, 37, 36, 28, 23, 19],
  },
  // DN 1050 (NPS 42)
  {
    dn: 1050,
    schedule: "10",
    wallMm: 9.53,
    pressuresBar: [31, 31, 29, 26, 26, 20, 17, 13],
  },
  {
    dn: 1050,
    schedule: "STD",
    wallMm: 9.53,
    pressuresBar: [31, 31, 29, 26, 26, 20, 17, 13],
  },
  {
    dn: 1050,
    schedule: "XS",
    wallMm: 12.7,
    pressuresBar: [41, 41, 39, 35, 35, 27, 22, 18],
  },
  // DN 1200 (NPS 48)
  {
    dn: 1200,
    schedule: "5",
    wallMm: 6.35,
    pressuresBar: [18, 18, 17, 15, 15, 12, 10, 8],
  },
  {
    dn: 1200,
    schedule: "10",
    wallMm: 9.53,
    pressuresBar: [27, 27, 26, 23, 23, 18, 15, 12],
  },
  {
    dn: 1200,
    schedule: "20",
    wallMm: 12.7,
    pressuresBar: [36, 36, 34, 31, 30, 23, 19, 15],
  },
  {
    dn: 1200,
    schedule: "30",
    wallMm: 15.88,
    pressuresBar: [45, 45, 42, 38, 38, 29, 24, 19],
  },
  {
    dn: 1200,
    schedule: "STD",
    wallMm: 9.53,
    pressuresBar: [27, 27, 26, 23, 23, 18, 15, 12],
  },
  {
    dn: 1200,
    schedule: "XS",
    wallMm: 12.7,
    pressuresBar: [36, 36, 34, 31, 30, 23, 19, 15],
  },
];

// 2. Stainless Steel Pipes (ASTM A312 / ASME SA312)
// Burst pressure at ambient temp; derate for higher temps per ASME B31.3
export const STAINLESS_STEEL_PIPES: StainlessSteelPipeData[] = [
  {
    dn: 6,
    npsEquiv: "1/8",
    schedule: "5S/5",
    odMm: 10.29,
    wallMm: 0.89,
    weightKgM: 0.21,
    idMm: 8.51,
    burstBar: 834,
  },
  {
    dn: 6,
    npsEquiv: "1/8",
    schedule: "10S/10",
    odMm: 10.29,
    wallMm: 1.24,
    weightKgM: 0.28,
    idMm: 9.4,
    burstBar: 1168,
  },
  {
    dn: 6,
    npsEquiv: "1/8",
    schedule: "40S/STD/40",
    odMm: 10.29,
    wallMm: 1.73,
    weightKgM: 0.36,
    idMm: 6.83,
    burstBar: 1621,
  },
  {
    dn: 6,
    npsEquiv: "1/8",
    schedule: "80S/XH/80",
    odMm: 10.29,
    wallMm: 2.41,
    weightKgM: 0.47,
    idMm: 5.46,
    burstBar: 2265,
  },
  {
    dn: 8,
    npsEquiv: "1/4",
    schedule: "5S/5",
    odMm: 13.72,
    wallMm: 1.24,
    weightKgM: 0.38,
    idMm: 11.23,
    burstBar: 876,
  },
  {
    dn: 8,
    npsEquiv: "1/4",
    schedule: "10S/10",
    odMm: 13.72,
    wallMm: 1.65,
    weightKgM: 0.49,
    idMm: 10.41,
    burstBar: 1162,
  },
  {
    dn: 8,
    npsEquiv: "1/4",
    schedule: "40S/STD/40",
    odMm: 13.72,
    wallMm: 2.24,
    weightKgM: 0.63,
    idMm: 9.25,
    burstBar: 1573,
  },
  {
    dn: 8,
    npsEquiv: "1/4",
    schedule: "80S/XH/80",
    odMm: 13.72,
    wallMm: 3.02,
    weightKgM: 0.8,
    idMm: 7.67,
    burstBar: 2128,
  },
  {
    dn: 10,
    npsEquiv: "3/8",
    schedule: "5S/5",
    odMm: 17.15,
    wallMm: 1.24,
    weightKgM: 0.49,
    idMm: 14.66,
    burstBar: 701,
  },
  {
    dn: 10,
    npsEquiv: "3/8",
    schedule: "10S/10",
    odMm: 17.15,
    wallMm: 1.65,
    weightKgM: 0.63,
    idMm: 13.84,
    burstBar: 930,
  },
  {
    dn: 10,
    npsEquiv: "3/8",
    schedule: "40S/STD/40",
    odMm: 17.15,
    wallMm: 2.31,
    weightKgM: 0.84,
    idMm: 12.53,
    burstBar: 1301,
  },
  {
    dn: 10,
    npsEquiv: "3/8",
    schedule: "80S/XH/80",
    odMm: 17.15,
    wallMm: 3.2,
    weightKgM: 1.1,
    idMm: 10.74,
    burstBar: 1802,
  },
  {
    dn: 15,
    npsEquiv: "1/2",
    schedule: "5S/5",
    odMm: 21.34,
    wallMm: 1.65,
    weightKgM: 0.8,
    idMm: 18.03,
    burstBar: 930,
  },
  {
    dn: 15,
    npsEquiv: "1/2",
    schedule: "10S/10",
    odMm: 21.34,
    wallMm: 2.11,
    weightKgM: 1.0,
    idMm: 17.12,
    burstBar: 1187,
  },
  {
    dn: 15,
    npsEquiv: "1/2",
    schedule: "40S/STD/40",
    odMm: 21.34,
    wallMm: 2.77,
    weightKgM: 1.27,
    idMm: 15.8,
    burstBar: 2102,
  },
  {
    dn: 15,
    npsEquiv: "1/2",
    schedule: "80S/XH/80",
    odMm: 21.34,
    wallMm: 3.73,
    weightKgM: 1.62,
    idMm: 13.87,
    burstBar: 4204,
  },
  {
    dn: 20,
    npsEquiv: "3/4",
    schedule: "5S/5",
    odMm: 26.67,
    wallMm: 1.65,
    weightKgM: 1.02,
    idMm: 23.37,
    burstBar: 597,
  },
  {
    dn: 20,
    npsEquiv: "3/4",
    schedule: "10S/10",
    odMm: 26.67,
    wallMm: 2.11,
    weightKgM: 1.28,
    idMm: 22.45,
    burstBar: 1038,
  },
  {
    dn: 20,
    npsEquiv: "3/4",
    schedule: "40S/STD/40",
    odMm: 26.67,
    wallMm: 2.87,
    weightKgM: 1.68,
    idMm: 20.93,
    burstBar: 1038,
  },
  {
    dn: 20,
    npsEquiv: "3/4",
    schedule: "80S/XH/80",
    odMm: 26.67,
    wallMm: 3.91,
    weightKgM: 2.2,
    idMm: 18.85,
    burstBar: 2013,
  },
  {
    dn: 20,
    npsEquiv: "3/4",
    schedule: "XXH",
    odMm: 26.67,
    wallMm: 7.82,
    weightKgM: 3.63,
    idMm: 11.03,
    burstBar: 2832,
  },
  {
    dn: 25,
    npsEquiv: "1",
    schedule: "5S/5",
    odMm: 33.4,
    wallMm: 1.65,
    weightKgM: 1.29,
    idMm: 30.1,
    burstBar: 477,
  },
  {
    dn: 25,
    npsEquiv: "1",
    schedule: "10S/10",
    odMm: 33.4,
    wallMm: 2.77,
    weightKgM: 2.09,
    idMm: 27.86,
    burstBar: 976,
  },
  {
    dn: 25,
    npsEquiv: "1",
    schedule: "40S/STD/40",
    odMm: 33.4,
    wallMm: 3.38,
    weightKgM: 2.5,
    idMm: 26.64,
    burstBar: 976,
  },
  {
    dn: 25,
    npsEquiv: "1",
    schedule: "80S/XH/80",
    odMm: 33.4,
    wallMm: 4.55,
    weightKgM: 3.24,
    idMm: 24.3,
    burstBar: 1835,
  },
  {
    dn: 25,
    npsEquiv: "1",
    schedule: "XXH",
    odMm: 33.4,
    wallMm: 9.09,
    weightKgM: 5.45,
    idMm: 15.22,
    burstBar: 2628,
  },
];

// 3. Carbon Steel Weld Fittings (WPB Grade, ASME B31.1 Equivalent)
// THIS IS THE WELD THICKNESS DATA
// Temperatures (°C): [20-343, 371, 399, 427]
export const CARBON_STEEL_FITTINGS: Record<string, FittingData[]> = {
  STD: [
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
    { dn: 350, odMm: 355.6, wallMm: 9.53, pressuresBar: [57, 55, 49, 41] },
    { dn: 400, odMm: 406.4, wallMm: 9.53, pressuresBar: [49, 47, 43, 36] },
    { dn: 450, odMm: 457.2, wallMm: 9.53, pressuresBar: [44, 42, 38, 32] },
    { dn: 500, odMm: 508.0, wallMm: 9.53, pressuresBar: [39, 38, 34, 28] },
    { dn: 600, odMm: 609.6, wallMm: 9.53, pressuresBar: [33, 32, 29, 24] },
    { dn: 750, odMm: 762.0, wallMm: 9.53, pressuresBar: [26, 25, 23, 19] },
    { dn: 900, odMm: 914.4, wallMm: 9.53, pressuresBar: [22, 21, 19, 16] },
    { dn: 1000, odMm: 1016.0, wallMm: 9.53, pressuresBar: [20, 19, 17, 14] },
    { dn: 1050, odMm: 1066.8, wallMm: 9.53, pressuresBar: [19, 18, 16, 14] },
    { dn: 1200, odMm: 1219.2, wallMm: 9.53, pressuresBar: [16, 16, 14, 12] },
  ],
  XH: [
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
    { dn: 200, odMm: 219.1, wallMm: 12.7, pressuresBar: [125, 120, 109, 90] },
    { dn: 250, odMm: 273.0, wallMm: 12.7, pressuresBar: [100, 96, 87, 72] },
    { dn: 300, odMm: 323.9, wallMm: 12.7, pressuresBar: [83, 80, 72, 60] },
    { dn: 350, odMm: 355.6, wallMm: 12.7, pressuresBar: [76, 73, 66, 55] },
    { dn: 400, odMm: 406.4, wallMm: 12.7, pressuresBar: [66, 64, 57, 48] },
    { dn: 450, odMm: 457.2, wallMm: 12.7, pressuresBar: [59, 57, 51, 42] },
    { dn: 500, odMm: 508.0, wallMm: 12.7, pressuresBar: [53, 51, 46, 38] },
    { dn: 600, odMm: 609.6, wallMm: 12.7, pressuresBar: [44, 42, 38, 32] },
    { dn: 750, odMm: 762.0, wallMm: 12.7, pressuresBar: [35, 34, 30, 25] },
    { dn: 900, odMm: 914.4, wallMm: 12.7, pressuresBar: [29, 28, 25, 21] },
    { dn: 1000, odMm: 1016.0, wallMm: 12.7, pressuresBar: [26, 25, 23, 19] },
    { dn: 1050, odMm: 1066.8, wallMm: 12.7, pressuresBar: [25, 24, 22, 18] },
    { dn: 1200, odMm: 1219.2, wallMm: 12.7, pressuresBar: [22, 21, 19, 16] },
  ],
  XXH: [
    { dn: 15, odMm: 21.3, wallMm: 7.47, pressuresBar: [1004, 964, 870, 724] },
    { dn: 20, odMm: 26.7, wallMm: 7.82, pressuresBar: [813, 780, 704, 585] },
    { dn: 25, odMm: 33.4, wallMm: 9.09, pressuresBar: [719, 691, 623, 518] },
    { dn: 32, odMm: 42.2, wallMm: 9.7, pressuresBar: [583, 560, 505, 420] },
    { dn: 40, odMm: 48.3, wallMm: 10.16, pressuresBar: [523, 502, 453, 377] },
    { dn: 50, odMm: 60.3, wallMm: 11.07, pressuresBar: [447, 429, 387, 322] },
    { dn: 65, odMm: 73.0, wallMm: 14.02, pressuresBar: [469, 450, 406, 338] },
    { dn: 80, odMm: 88.9, wallMm: 15.24, pressuresBar: [411, 394, 356, 296] },
    { dn: 100, odMm: 114.3, wallMm: 17.12, pressuresBar: [352, 338, 305, 253] },
    { dn: 125, odMm: 141.3, wallMm: 19.05, pressuresBar: [312, 300, 270, 225] },
    { dn: 150, odMm: 168.3, wallMm: 22.23, pressuresBar: [301, 289, 261, 217] },
    { dn: 200, odMm: 219.1, wallMm: 22.23, pressuresBar: [228, 219, 198, 164] },
    { dn: 250, odMm: 273.0, wallMm: 25.4, pressuresBar: [208, 199, 180, 150] },
    { dn: 300, odMm: 323.9, wallMm: 25.4, pressuresBar: [173, 166, 150, 124] },
    { dn: 350, odMm: 355.6, wallMm: 25.4, pressuresBar: [157, 151, 136, 113] },
    { dn: 400, odMm: 406.4, wallMm: 25.4, pressuresBar: [137, 132, 119, 99] },
    { dn: 450, odMm: 457.2, wallMm: 25.4, pressuresBar: [122, 117, 106, 88] },
    { dn: 500, odMm: 508.0, wallMm: 25.4, pressuresBar: [110, 105, 95, 79] },
    { dn: 600, odMm: 609.6, wallMm: 25.4, pressuresBar: [91, 88, 79, 66] },
  ],
};

// Schedule name normalization map
export const SCHEDULE_TO_FITTING_CLASS: Record<string, string> = {
  // STD mappings
  STD: "STD",
  "STD (40)": "STD",
  "40": "STD",
  "Sch 40": "STD",
  Sch40: "STD",
  SCH40: "STD",
  "Sch 40/STD": "STD",
  // XH/XS mappings
  XH: "XH",
  XS: "XH",
  "XS (80)": "XH",
  "80": "XH",
  "Sch 80": "XH",
  Sch80: "XH",
  SCH80: "XH",
  "Sch 80/XS": "XH",
  // XXH/XXS mappings
  XXH: "XXH",
  XXS: "XXH",
  "Sch 160": "XXH",
  "160": "XXH",
  Sch160: "XXH",
  SCH160: "XXH",
};

// OD lookup by DN (ASME B36.10)
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
  750: 762.0,
  900: 914.4,
  1000: 1016.0,
  1050: 1066.8,
  1200: 1219.2,
};

/**
 * Fitting Wall Thickness Lookup Table
 * Wall thickness (mm) by DN, Fitting Type, and Schedule
 * Based on ASME B16.9 / MSS-SP-43 / ASME B31.3
 *
 * Fitting Types:
 * - 45E: 45° Elbow
 * - 90E: 90° Elbow
 * - BW_RED: Butt Weld Reducer
 * - TEE: Tee outlets
 * - PIPE: Straight pipe reference
 *
 * Schedules: 10S, 40S, 80S, 160S, XXS
 */
export type FittingType = "45E" | "90E" | "BW_RED" | "TEE" | "PIPE";
export type WallSchedule = "10S" | "40S" | "80S" | "160S" | "XXS";

export interface FittingWallThicknessEntry {
  dn: number;
  thicknessBySchedule: Record<WallSchedule, number>;
}

export const FITTING_WALL_THICKNESS: Record<FittingType, FittingWallThicknessEntry[]> = {
  "45E": [
    {
      dn: 15,
      thicknessBySchedule: {
        "10S": 2.77,
        "40S": 2.77,
        "80S": 3.73,
        "160S": 4.78,
        XXS: 7.47,
      },
    },
    {
      dn: 20,
      thicknessBySchedule: {
        "10S": 2.87,
        "40S": 2.87,
        "80S": 3.91,
        "160S": 5.56,
        XXS: 7.82,
      },
    },
    {
      dn: 25,
      thicknessBySchedule: {
        "10S": 3.38,
        "40S": 3.38,
        "80S": 4.55,
        "160S": 6.35,
        XXS: 9.09,
      },
    },
    {
      dn: 32,
      thicknessBySchedule: {
        "10S": 3.56,
        "40S": 3.56,
        "80S": 4.85,
        "160S": 6.35,
        XXS: 9.7,
      },
    },
    {
      dn: 40,
      thicknessBySchedule: {
        "10S": 3.68,
        "40S": 3.68,
        "80S": 5.08,
        "160S": 7.14,
        XXS: 10.15,
      },
    },
    {
      dn: 50,
      thicknessBySchedule: {
        "10S": 3.91,
        "40S": 3.91,
        "80S": 5.54,
        "160S": 8.74,
        XXS: 11.07,
      },
    },
    {
      dn: 65,
      thicknessBySchedule: {
        "10S": 5.16,
        "40S": 5.16,
        "80S": 7.01,
        "160S": 9.53,
        XXS: 14.02,
      },
    },
    {
      dn: 80,
      thicknessBySchedule: {
        "10S": 5.49,
        "40S": 5.49,
        "80S": 7.62,
        "160S": 11.13,
        XXS: 15.24,
      },
    },
    {
      dn: 100,
      thicknessBySchedule: {
        "10S": 6.02,
        "40S": 6.02,
        "80S": 8.56,
        "160S": 13.49,
        XXS: 17.12,
      },
    },
    {
      dn: 125,
      thicknessBySchedule: {
        "10S": 6.55,
        "40S": 6.55,
        "80S": 9.53,
        "160S": 15.88,
        XXS: 19.05,
      },
    },
    {
      dn: 150,
      thicknessBySchedule: {
        "10S": 7.11,
        "40S": 7.11,
        "80S": 10.97,
        "160S": 18.26,
        XXS: 21.95,
      },
    },
    {
      dn: 200,
      thicknessBySchedule: {
        "10S": 8.18,
        "40S": 8.18,
        "80S": 12.7,
        "160S": 23.01,
        XXS: 22.23,
      },
    },
    {
      dn: 250,
      thicknessBySchedule: {
        "10S": 9.27,
        "40S": 9.27,
        "80S": 12.7,
        "160S": 28.58,
        XXS: 25.4,
      },
    },
    {
      dn: 300,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 33.32,
        XXS: 25.4,
      },
    },
    {
      dn: 350,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 35.71,
        XXS: 25.4,
      },
    },
    {
      dn: 400,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 40.49,
        XXS: 25.4,
      },
    },
    {
      dn: 450,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 45.24,
        XXS: 25.4,
      },
    },
    {
      dn: 500,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 50.01,
        XXS: 25.4,
      },
    },
    {
      dn: 600,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 59.54,
        XXS: 25.4,
      },
    },
  ],
  "90E": [
    {
      dn: 15,
      thicknessBySchedule: {
        "10S": 2.77,
        "40S": 2.77,
        "80S": 3.73,
        "160S": 4.78,
        XXS: 7.47,
      },
    },
    {
      dn: 20,
      thicknessBySchedule: {
        "10S": 2.87,
        "40S": 2.87,
        "80S": 3.91,
        "160S": 5.56,
        XXS: 7.82,
      },
    },
    {
      dn: 25,
      thicknessBySchedule: {
        "10S": 3.38,
        "40S": 3.38,
        "80S": 4.55,
        "160S": 6.35,
        XXS: 9.09,
      },
    },
    {
      dn: 32,
      thicknessBySchedule: {
        "10S": 3.56,
        "40S": 3.56,
        "80S": 4.85,
        "160S": 6.35,
        XXS: 9.7,
      },
    },
    {
      dn: 40,
      thicknessBySchedule: {
        "10S": 3.68,
        "40S": 3.68,
        "80S": 5.08,
        "160S": 7.14,
        XXS: 10.15,
      },
    },
    {
      dn: 50,
      thicknessBySchedule: {
        "10S": 3.91,
        "40S": 3.91,
        "80S": 5.54,
        "160S": 8.74,
        XXS: 11.07,
      },
    },
    {
      dn: 65,
      thicknessBySchedule: {
        "10S": 5.16,
        "40S": 5.16,
        "80S": 7.01,
        "160S": 9.53,
        XXS: 14.02,
      },
    },
    {
      dn: 80,
      thicknessBySchedule: {
        "10S": 5.49,
        "40S": 5.49,
        "80S": 7.62,
        "160S": 11.13,
        XXS: 15.24,
      },
    },
    {
      dn: 100,
      thicknessBySchedule: {
        "10S": 6.02,
        "40S": 6.02,
        "80S": 8.56,
        "160S": 13.49,
        XXS: 17.12,
      },
    },
    {
      dn: 125,
      thicknessBySchedule: {
        "10S": 6.55,
        "40S": 6.55,
        "80S": 9.53,
        "160S": 15.88,
        XXS: 19.05,
      },
    },
    {
      dn: 150,
      thicknessBySchedule: {
        "10S": 7.11,
        "40S": 7.11,
        "80S": 10.97,
        "160S": 18.26,
        XXS: 21.95,
      },
    },
    {
      dn: 200,
      thicknessBySchedule: {
        "10S": 8.18,
        "40S": 8.18,
        "80S": 12.7,
        "160S": 23.01,
        XXS: 22.23,
      },
    },
    {
      dn: 250,
      thicknessBySchedule: {
        "10S": 9.27,
        "40S": 9.27,
        "80S": 12.7,
        "160S": 28.58,
        XXS: 25.4,
      },
    },
    {
      dn: 300,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 33.32,
        XXS: 25.4,
      },
    },
    {
      dn: 350,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 35.71,
        XXS: 25.4,
      },
    },
    {
      dn: 400,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 40.49,
        XXS: 25.4,
      },
    },
    {
      dn: 450,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 45.24,
        XXS: 25.4,
      },
    },
    {
      dn: 500,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 50.01,
        XXS: 25.4,
      },
    },
    {
      dn: 600,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 59.54,
        XXS: 25.4,
      },
    },
  ],
  BW_RED: [
    {
      dn: 15,
      thicknessBySchedule: {
        "10S": 2.77,
        "40S": 2.77,
        "80S": 3.73,
        "160S": 4.78,
        XXS: 7.47,
      },
    },
    {
      dn: 20,
      thicknessBySchedule: {
        "10S": 2.87,
        "40S": 2.87,
        "80S": 3.91,
        "160S": 5.56,
        XXS: 7.82,
      },
    },
    {
      dn: 25,
      thicknessBySchedule: {
        "10S": 3.38,
        "40S": 3.38,
        "80S": 4.55,
        "160S": 6.35,
        XXS: 9.09,
      },
    },
    {
      dn: 32,
      thicknessBySchedule: {
        "10S": 3.56,
        "40S": 3.56,
        "80S": 4.85,
        "160S": 6.35,
        XXS: 9.7,
      },
    },
    {
      dn: 40,
      thicknessBySchedule: {
        "10S": 3.68,
        "40S": 3.68,
        "80S": 5.08,
        "160S": 7.14,
        XXS: 10.15,
      },
    },
    {
      dn: 50,
      thicknessBySchedule: {
        "10S": 3.91,
        "40S": 3.91,
        "80S": 5.54,
        "160S": 8.74,
        XXS: 11.07,
      },
    },
    {
      dn: 65,
      thicknessBySchedule: {
        "10S": 5.16,
        "40S": 5.16,
        "80S": 7.01,
        "160S": 9.53,
        XXS: 14.02,
      },
    },
    {
      dn: 80,
      thicknessBySchedule: {
        "10S": 5.49,
        "40S": 5.49,
        "80S": 7.62,
        "160S": 11.13,
        XXS: 15.24,
      },
    },
    {
      dn: 100,
      thicknessBySchedule: {
        "10S": 6.02,
        "40S": 6.02,
        "80S": 8.56,
        "160S": 13.49,
        XXS: 17.12,
      },
    },
    {
      dn: 125,
      thicknessBySchedule: {
        "10S": 6.55,
        "40S": 6.55,
        "80S": 9.53,
        "160S": 15.88,
        XXS: 19.05,
      },
    },
    {
      dn: 150,
      thicknessBySchedule: {
        "10S": 7.11,
        "40S": 7.11,
        "80S": 10.97,
        "160S": 18.26,
        XXS: 21.95,
      },
    },
    {
      dn: 200,
      thicknessBySchedule: {
        "10S": 8.18,
        "40S": 8.18,
        "80S": 12.7,
        "160S": 23.01,
        XXS: 22.23,
      },
    },
    {
      dn: 250,
      thicknessBySchedule: {
        "10S": 9.27,
        "40S": 9.27,
        "80S": 12.7,
        "160S": 28.58,
        XXS: 25.4,
      },
    },
    {
      dn: 300,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 33.32,
        XXS: 25.4,
      },
    },
    {
      dn: 350,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 35.71,
        XXS: 25.4,
      },
    },
    {
      dn: 400,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 40.49,
        XXS: 25.4,
      },
    },
    {
      dn: 450,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 45.24,
        XXS: 25.4,
      },
    },
    {
      dn: 500,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 50.01,
        XXS: 25.4,
      },
    },
    {
      dn: 600,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 59.54,
        XXS: 25.4,
      },
    },
  ],
  TEE: [
    {
      dn: 15,
      thicknessBySchedule: {
        "10S": 2.77,
        "40S": 2.77,
        "80S": 3.73,
        "160S": 4.78,
        XXS: 7.47,
      },
    },
    {
      dn: 20,
      thicknessBySchedule: {
        "10S": 2.87,
        "40S": 2.87,
        "80S": 3.91,
        "160S": 5.56,
        XXS: 7.82,
      },
    },
    {
      dn: 25,
      thicknessBySchedule: {
        "10S": 3.38,
        "40S": 3.38,
        "80S": 4.55,
        "160S": 6.35,
        XXS: 9.09,
      },
    },
    {
      dn: 32,
      thicknessBySchedule: {
        "10S": 3.56,
        "40S": 3.56,
        "80S": 4.85,
        "160S": 6.35,
        XXS: 9.7,
      },
    },
    {
      dn: 40,
      thicknessBySchedule: {
        "10S": 3.68,
        "40S": 3.68,
        "80S": 5.08,
        "160S": 7.14,
        XXS: 10.15,
      },
    },
    {
      dn: 50,
      thicknessBySchedule: {
        "10S": 3.91,
        "40S": 3.91,
        "80S": 5.54,
        "160S": 8.74,
        XXS: 11.07,
      },
    },
    {
      dn: 65,
      thicknessBySchedule: {
        "10S": 5.16,
        "40S": 5.16,
        "80S": 7.01,
        "160S": 9.53,
        XXS: 14.02,
      },
    },
    {
      dn: 80,
      thicknessBySchedule: {
        "10S": 5.49,
        "40S": 5.49,
        "80S": 7.62,
        "160S": 11.13,
        XXS: 15.24,
      },
    },
    {
      dn: 100,
      thicknessBySchedule: {
        "10S": 6.02,
        "40S": 6.02,
        "80S": 8.56,
        "160S": 13.49,
        XXS: 17.12,
      },
    },
    {
      dn: 125,
      thicknessBySchedule: {
        "10S": 6.55,
        "40S": 6.55,
        "80S": 9.53,
        "160S": 15.88,
        XXS: 19.05,
      },
    },
    {
      dn: 150,
      thicknessBySchedule: {
        "10S": 7.11,
        "40S": 7.11,
        "80S": 10.97,
        "160S": 18.26,
        XXS: 21.95,
      },
    },
    {
      dn: 200,
      thicknessBySchedule: {
        "10S": 8.18,
        "40S": 8.18,
        "80S": 12.7,
        "160S": 23.01,
        XXS: 22.23,
      },
    },
    {
      dn: 250,
      thicknessBySchedule: {
        "10S": 9.27,
        "40S": 9.27,
        "80S": 12.7,
        "160S": 28.58,
        XXS: 25.4,
      },
    },
    {
      dn: 300,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 33.32,
        XXS: 25.4,
      },
    },
    {
      dn: 350,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 35.71,
        XXS: 25.4,
      },
    },
    {
      dn: 400,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 40.49,
        XXS: 25.4,
      },
    },
    {
      dn: 450,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 45.24,
        XXS: 25.4,
      },
    },
    {
      dn: 500,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 50.01,
        XXS: 25.4,
      },
    },
    {
      dn: 600,
      thicknessBySchedule: {
        "10S": 9.53,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 59.54,
        XXS: 25.4,
      },
    },
  ],
  PIPE: [
    {
      dn: 15,
      thicknessBySchedule: {
        "10S": 2.11,
        "40S": 2.77,
        "80S": 3.73,
        "160S": 4.78,
        XXS: 7.47,
      },
    },
    {
      dn: 20,
      thicknessBySchedule: {
        "10S": 2.11,
        "40S": 2.87,
        "80S": 3.91,
        "160S": 5.56,
        XXS: 7.82,
      },
    },
    {
      dn: 25,
      thicknessBySchedule: {
        "10S": 2.77,
        "40S": 3.38,
        "80S": 4.55,
        "160S": 6.35,
        XXS: 9.09,
      },
    },
    {
      dn: 32,
      thicknessBySchedule: {
        "10S": 2.77,
        "40S": 3.56,
        "80S": 4.85,
        "160S": 6.35,
        XXS: 9.7,
      },
    },
    {
      dn: 40,
      thicknessBySchedule: {
        "10S": 2.77,
        "40S": 3.68,
        "80S": 5.08,
        "160S": 7.14,
        XXS: 10.15,
      },
    },
    {
      dn: 50,
      thicknessBySchedule: {
        "10S": 2.77,
        "40S": 3.91,
        "80S": 5.54,
        "160S": 8.74,
        XXS: 11.07,
      },
    },
    {
      dn: 65,
      thicknessBySchedule: {
        "10S": 3.4,
        "40S": 5.16,
        "80S": 7.01,
        "160S": 9.53,
        XXS: 14.02,
      },
    },
    {
      dn: 80,
      thicknessBySchedule: {
        "10S": 3.05,
        "40S": 5.49,
        "80S": 7.62,
        "160S": 11.13,
        XXS: 15.24,
      },
    },
    {
      dn: 100,
      thicknessBySchedule: {
        "10S": 3.05,
        "40S": 6.02,
        "80S": 8.56,
        "160S": 13.49,
        XXS: 17.12,
      },
    },
    {
      dn: 125,
      thicknessBySchedule: {
        "10S": 3.4,
        "40S": 6.55,
        "80S": 9.53,
        "160S": 15.88,
        XXS: 19.05,
      },
    },
    {
      dn: 150,
      thicknessBySchedule: {
        "10S": 3.4,
        "40S": 7.11,
        "80S": 10.97,
        "160S": 18.26,
        XXS: 21.95,
      },
    },
    {
      dn: 200,
      thicknessBySchedule: {
        "10S": 3.76,
        "40S": 8.18,
        "80S": 12.7,
        "160S": 23.01,
        XXS: 22.23,
      },
    },
    {
      dn: 250,
      thicknessBySchedule: {
        "10S": 4.19,
        "40S": 9.27,
        "80S": 12.7,
        "160S": 28.58,
        XXS: 25.4,
      },
    },
    {
      dn: 300,
      thicknessBySchedule: {
        "10S": 4.57,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 33.32,
        XXS: 25.4,
      },
    },
    {
      dn: 350,
      thicknessBySchedule: {
        "10S": 4.78,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 35.71,
        XXS: 25.4,
      },
    },
    {
      dn: 400,
      thicknessBySchedule: {
        "10S": 4.78,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 40.49,
        XXS: 25.4,
      },
    },
    {
      dn: 450,
      thicknessBySchedule: {
        "10S": 4.78,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 45.24,
        XXS: 25.4,
      },
    },
    {
      dn: 500,
      thicknessBySchedule: {
        "10S": 5.54,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 50.01,
        XXS: 25.4,
      },
    },
    {
      dn: 600,
      thicknessBySchedule: {
        "10S": 5.54,
        "40S": 9.53,
        "80S": 12.7,
        "160S": 59.54,
        XXS: 25.4,
      },
    },
  ],
};

/**
 * Helper function to get wall thickness for a fitting
 */
export function getFittingWallThickness(
  fittingType: FittingType,
  dn: number,
  schedule: WallSchedule,
): number | undefined {
  const entries = FITTING_WALL_THICKNESS[fittingType];
  const entry = entries?.find((e) => e.dn === dn);
  return entry?.thicknessBySchedule[schedule];
}

/**
 * Schedule normalization for wall thickness lookup
 */
export const SCHEDULE_TO_WALL_SCHEDULE: Record<string, WallSchedule> = {
  "10S": "10S",
  "Sch 10S": "10S",
  "10": "10S",
  "40S": "40S",
  "Sch 40S": "40S",
  STD: "40S",
  "STD (40)": "40S",
  "40": "40S",
  "80S": "80S",
  "Sch 80S": "80S",
  XS: "80S",
  "XS (80)": "80S",
  XH: "80S",
  "80": "80S",
  "160S": "160S",
  "Sch 160S": "160S",
  "160": "160S",
  XXS: "XXS",
  XXH: "XXS",
};
