export const WORKING_PRESSURE_BAR = [6, 10, 16, 25, 40, 63, 100, 160, 250, 320, 400, 630] as const;

export const WORKING_TEMPERATURE_CELSIUS = [
  -196, -101, -46, -29, -20, 0, 20, 50, 80, 120, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600,
] as const;

export const TEMPERATURE_CATEGORIES = {
  cryogenic: [-196, -101],
  lowTemp: [-46, -29, -20],
  ambient: [0, 20],
  elevated: [50, 80, 120, 150],
  highTemp: [200, 250, 300, 350, 400, 450, 500],
  veryHighTemp: [550, 600],
} as const;

export const STANDARD_PIPE_LENGTHS_M = [
  { value: 6, label: "6m", description: "Metric standard", isMetric: true },
  { value: 6.1, label: "6.1m", description: "20ft imperial", isMetric: false },
  { value: 9, label: "9m", description: "Metric standard", isMetric: true },
  { value: 9.144, label: "9.144m", description: "30ft imperial", isMetric: false },
  { value: 12, label: "12m", description: "Metric standard", isMetric: true },
  { value: 12.192, label: "12.192m", description: "40ft imperial", isMetric: false },
] as const;

export const PUDDLE_PIPE_LENGTHS_M = [
  { value: 1, label: "1m", description: "Short puddle pipe" },
  { value: 1.5, label: "1.5m", description: "Standard puddle pipe" },
  { value: 2, label: "2m", description: "Standard puddle pipe" },
  { value: 2.5, label: "2.5m", description: "Medium puddle pipe" },
  { value: 3, label: "3m", description: "Long puddle pipe" },
] as const;

export const METRIC_PIPE_LENGTHS_M = [6, 9, 12] as const;
export const IMPERIAL_PIPE_LENGTHS_M = [6.1, 9.144, 12.192] as const;

export const DEFAULT_PIPE_LENGTH_M = 12;

export const DEFAULT_NOMINAL_BORES = [
  15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750,
  800, 900, 1000, 1050, 1200,
] as const;

export const SABS_1123_PRESSURE_KPA = [600, 1000, 1600, 2500, 4000] as const;

export const BS_4504_PRESSURE_PN = [6, 10, 16, 25, 40, 64, 100, 160] as const;

export const ANSI_PRESSURE_CLASSES = [150, 300, 400, 600, 900, 1500, 2500] as const;

export const SABS_1123_PRESSURE_CLASSES = [
  { value: 600, label: "600 kPa" },
  { value: 1000, label: "1000 kPa" },
  { value: 1600, label: "1600 kPa" },
  { value: 2500, label: "2500 kPa" },
  { value: 4000, label: "4000 kPa" },
];

export const BS_4504_PRESSURE_CLASSES = [
  { value: 6, label: "PN6" },
  { value: 10, label: "PN10" },
  { value: 16, label: "PN16" },
  { value: 25, label: "PN25" },
  { value: 40, label: "PN40" },
  { value: 64, label: "PN64" },
  { value: 100, label: "PN100" },
  { value: 160, label: "PN160" },
];

export const FLANGE_OD: Record<number, number> = {
  15: 95,
  20: 105,
  25: 115,
  32: 140,
  40: 150,
  50: 165,
  65: 185,
  80: 200,
  100: 220,
  125: 250,
  150: 285,
  200: 340,
  250: 395,
  300: 445,
  350: 505,
  400: 565,
  450: 615,
  500: 670,
  600: 780,
  700: 885,
  750: 940,
  800: 1015,
  900: 1115,
  1000: 1230,
  1050: 1290,
  1200: 1455,
  1400: 1675,
  1500: 1785,
  1600: 1915,
  1800: 2115,
  2000: 2325,
  2200: 2550,
  2400: 2760,
  2500: 2880,
};
