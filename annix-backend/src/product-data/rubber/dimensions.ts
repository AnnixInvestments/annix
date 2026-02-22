export const THICKNESS_OPTIONS = [3, 4, 5, 6, 8, 10, 12, 15, 20, 25] as const;
export const WIDTH_OPTIONS = [
  600, 650, 700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400,
  1450, 1500, 1570,
] as const;
export const LENGTH_OPTIONS = [5, 6, 7, 8, 9, 10, 12, 15, 20] as const;

export type ThicknessOption = (typeof THICKNESS_OPTIONS)[number];
export type WidthOption = (typeof WIDTH_OPTIONS)[number];
export type LengthOption = (typeof LENGTH_OPTIONS)[number];
