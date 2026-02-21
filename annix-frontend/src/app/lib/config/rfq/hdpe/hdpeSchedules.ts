export type HdpeSdr = 7.4 | 9 | 11 | 13.6 | 17 | 21 | 26 | 33 | 41;

export interface HdpeSdrOption {
  value: HdpeSdr;
  label: string;
  description: string;
  pe80PressureRating: number;
  pe100PressureRating: number;
}

export const HDPE_SDR_OPTIONS: HdpeSdrOption[] = [
  {
    value: 7.4,
    label: "SDR 7.4",
    description: "Extra heavy-duty - highest pressure rating",
    pe80PressureRating: 20,
    pe100PressureRating: 25,
  },
  {
    value: 9,
    label: "SDR 9",
    description: "Heavy-duty - high pressure applications",
    pe80PressureRating: 16,
    pe100PressureRating: 20,
  },
  {
    value: 11,
    label: "SDR 11",
    description: "Standard - most common for water mains",
    pe80PressureRating: 12.5,
    pe100PressureRating: 16,
  },
  {
    value: 13.6,
    label: "SDR 13.6",
    description: "Medium-duty applications",
    pe80PressureRating: 10,
    pe100PressureRating: 12.5,
  },
  {
    value: 17,
    label: "SDR 17",
    description: "Standard-duty applications",
    pe80PressureRating: 8,
    pe100PressureRating: 10,
  },
  {
    value: 21,
    label: "SDR 21",
    description: "Light-duty applications",
    pe80PressureRating: 6,
    pe100PressureRating: 8,
  },
  {
    value: 26,
    label: "SDR 26",
    description: "Low pressure applications",
    pe80PressureRating: 5,
    pe100PressureRating: 6,
  },
  {
    value: 33,
    label: "SDR 33",
    description: "Very low pressure - gravity flow",
    pe80PressureRating: 4,
    pe100PressureRating: 5,
  },
  {
    value: 41,
    label: "SDR 41",
    description: "Minimal pressure - drainage applications",
    pe80PressureRating: 3.2,
    pe100PressureRating: 4,
  },
];

export type HdpePressureRating =
  | "PN3.2"
  | "PN4"
  | "PN5"
  | "PN6"
  | "PN8"
  | "PN10"
  | "PN12.5"
  | "PN16"
  | "PN20"
  | "PN25";

export interface HdpePressureOption {
  value: HdpePressureRating;
  label: string;
  barRating: number;
}

export const HDPE_PRESSURE_OPTIONS: HdpePressureOption[] = [
  { value: "PN3.2", label: "PN3.2 (3.2 bar)", barRating: 3.2 },
  { value: "PN4", label: "PN4 (4 bar)", barRating: 4 },
  { value: "PN5", label: "PN5 (5 bar)", barRating: 5 },
  { value: "PN6", label: "PN6 (6 bar)", barRating: 6 },
  { value: "PN8", label: "PN8 (8 bar)", barRating: 8 },
  { value: "PN10", label: "PN10 (10 bar)", barRating: 10 },
  { value: "PN12.5", label: "PN12.5 (12.5 bar)", barRating: 12.5 },
  { value: "PN16", label: "PN16 (16 bar)", barRating: 16 },
  { value: "PN20", label: "PN20 (20 bar)", barRating: 20 },
  { value: "PN25", label: "PN25 (25 bar)", barRating: 25 },
];

export interface HdpeWallThickness {
  nominalBoreMm: number;
  outsideDiameterMm: number;
  wallThicknessBySdr: Record<HdpeSdr, number>;
}

export const HDPE_WALL_THICKNESS_DATA: HdpeWallThickness[] = [
  {
    nominalBoreMm: 20,
    outsideDiameterMm: 20,
    wallThicknessBySdr: {
      7.4: 2.7,
      9: 2.2,
      11: 1.8,
      13.6: 1.5,
      17: 1.2,
      21: 1.0,
      26: 0.8,
      33: 0.6,
      41: 0.5,
    },
  },
  {
    nominalBoreMm: 25,
    outsideDiameterMm: 25,
    wallThicknessBySdr: {
      7.4: 3.4,
      9: 2.8,
      11: 2.3,
      13.6: 1.8,
      17: 1.5,
      21: 1.2,
      26: 1.0,
      33: 0.8,
      41: 0.6,
    },
  },
  {
    nominalBoreMm: 32,
    outsideDiameterMm: 32,
    wallThicknessBySdr: {
      7.4: 4.3,
      9: 3.6,
      11: 2.9,
      13.6: 2.4,
      17: 1.9,
      21: 1.5,
      26: 1.2,
      33: 1.0,
      41: 0.8,
    },
  },
  {
    nominalBoreMm: 40,
    outsideDiameterMm: 40,
    wallThicknessBySdr: {
      7.4: 5.4,
      9: 4.4,
      11: 3.6,
      13.6: 2.9,
      17: 2.4,
      21: 1.9,
      26: 1.5,
      33: 1.2,
      41: 1.0,
    },
  },
  {
    nominalBoreMm: 50,
    outsideDiameterMm: 50,
    wallThicknessBySdr: {
      7.4: 6.8,
      9: 5.6,
      11: 4.5,
      13.6: 3.7,
      17: 2.9,
      21: 2.4,
      26: 1.9,
      33: 1.5,
      41: 1.2,
    },
  },
  {
    nominalBoreMm: 63,
    outsideDiameterMm: 63,
    wallThicknessBySdr: {
      7.4: 8.5,
      9: 7.0,
      11: 5.7,
      13.6: 4.6,
      17: 3.7,
      21: 3.0,
      26: 2.4,
      33: 1.9,
      41: 1.5,
    },
  },
  {
    nominalBoreMm: 75,
    outsideDiameterMm: 75,
    wallThicknessBySdr: {
      7.4: 10.1,
      9: 8.3,
      11: 6.8,
      13.6: 5.5,
      17: 4.4,
      21: 3.6,
      26: 2.9,
      33: 2.3,
      41: 1.8,
    },
  },
  {
    nominalBoreMm: 90,
    outsideDiameterMm: 90,
    wallThicknessBySdr: {
      7.4: 12.2,
      9: 10.0,
      11: 8.2,
      13.6: 6.6,
      17: 5.3,
      21: 4.3,
      26: 3.5,
      33: 2.7,
      41: 2.2,
    },
  },
  {
    nominalBoreMm: 110,
    outsideDiameterMm: 110,
    wallThicknessBySdr: {
      7.4: 14.9,
      9: 12.2,
      11: 10.0,
      13.6: 8.1,
      17: 6.5,
      21: 5.2,
      26: 4.2,
      33: 3.3,
      41: 2.7,
    },
  },
  {
    nominalBoreMm: 125,
    outsideDiameterMm: 125,
    wallThicknessBySdr: {
      7.4: 16.9,
      9: 13.9,
      11: 11.4,
      13.6: 9.2,
      17: 7.4,
      21: 6.0,
      26: 4.8,
      33: 3.8,
      41: 3.0,
    },
  },
  {
    nominalBoreMm: 140,
    outsideDiameterMm: 140,
    wallThicknessBySdr: {
      7.4: 18.9,
      9: 15.6,
      11: 12.7,
      13.6: 10.3,
      17: 8.2,
      21: 6.7,
      26: 5.4,
      33: 4.2,
      41: 3.4,
    },
  },
  {
    nominalBoreMm: 160,
    outsideDiameterMm: 160,
    wallThicknessBySdr: {
      7.4: 21.6,
      9: 17.8,
      11: 14.5,
      13.6: 11.8,
      17: 9.4,
      21: 7.6,
      26: 6.2,
      33: 4.8,
      41: 3.9,
    },
  },
  {
    nominalBoreMm: 180,
    outsideDiameterMm: 180,
    wallThicknessBySdr: {
      7.4: 24.3,
      9: 20.0,
      11: 16.4,
      13.6: 13.2,
      17: 10.6,
      21: 8.6,
      26: 6.9,
      33: 5.5,
      41: 4.4,
    },
  },
  {
    nominalBoreMm: 200,
    outsideDiameterMm: 200,
    wallThicknessBySdr: {
      7.4: 27.0,
      9: 22.2,
      11: 18.2,
      13.6: 14.7,
      17: 11.8,
      21: 9.5,
      26: 7.7,
      33: 6.1,
      41: 4.9,
    },
  },
  {
    nominalBoreMm: 225,
    outsideDiameterMm: 225,
    wallThicknessBySdr: {
      7.4: 30.4,
      9: 25.0,
      11: 20.5,
      13.6: 16.5,
      17: 13.2,
      21: 10.7,
      26: 8.7,
      33: 6.8,
      41: 5.5,
    },
  },
  {
    nominalBoreMm: 250,
    outsideDiameterMm: 250,
    wallThicknessBySdr: {
      7.4: 33.8,
      9: 27.8,
      11: 22.7,
      13.6: 18.4,
      17: 14.7,
      21: 11.9,
      26: 9.6,
      33: 7.6,
      41: 6.1,
    },
  },
  {
    nominalBoreMm: 280,
    outsideDiameterMm: 280,
    wallThicknessBySdr: {
      7.4: 37.8,
      9: 31.1,
      11: 25.5,
      13.6: 20.6,
      17: 16.5,
      21: 13.3,
      26: 10.8,
      33: 8.5,
      41: 6.8,
    },
  },
  {
    nominalBoreMm: 315,
    outsideDiameterMm: 315,
    wallThicknessBySdr: {
      7.4: 42.6,
      9: 35.0,
      11: 28.6,
      13.6: 23.2,
      17: 18.5,
      21: 15.0,
      26: 12.1,
      33: 9.5,
      41: 7.7,
    },
  },
  {
    nominalBoreMm: 355,
    outsideDiameterMm: 355,
    wallThicknessBySdr: {
      7.4: 48.0,
      9: 39.4,
      11: 32.3,
      13.6: 26.1,
      17: 20.9,
      21: 16.9,
      26: 13.7,
      33: 10.8,
      41: 8.7,
    },
  },
  {
    nominalBoreMm: 400,
    outsideDiameterMm: 400,
    wallThicknessBySdr: {
      7.4: 54.1,
      9: 44.4,
      11: 36.4,
      13.6: 29.4,
      17: 23.5,
      21: 19.0,
      26: 15.4,
      33: 12.1,
      41: 9.8,
    },
  },
  {
    nominalBoreMm: 450,
    outsideDiameterMm: 450,
    wallThicknessBySdr: {
      7.4: 60.8,
      9: 50.0,
      11: 40.9,
      13.6: 33.1,
      17: 26.5,
      21: 21.4,
      26: 17.3,
      33: 13.6,
      41: 11.0,
    },
  },
  {
    nominalBoreMm: 500,
    outsideDiameterMm: 500,
    wallThicknessBySdr: {
      7.4: 67.6,
      9: 55.6,
      11: 45.5,
      13.6: 36.8,
      17: 29.4,
      21: 23.8,
      26: 19.2,
      33: 15.2,
      41: 12.2,
    },
  },
  {
    nominalBoreMm: 560,
    outsideDiameterMm: 560,
    wallThicknessBySdr: {
      7.4: 75.7,
      9: 62.2,
      11: 50.9,
      13.6: 41.2,
      17: 32.9,
      21: 26.7,
      26: 21.5,
      33: 17.0,
      41: 13.7,
    },
  },
  {
    nominalBoreMm: 630,
    outsideDiameterMm: 630,
    wallThicknessBySdr: {
      7.4: 85.1,
      9: 70.0,
      11: 57.3,
      13.6: 46.3,
      17: 37.1,
      21: 30.0,
      26: 24.2,
      33: 19.1,
      41: 15.4,
    },
  },
  {
    nominalBoreMm: 710,
    outsideDiameterMm: 710,
    wallThicknessBySdr: {
      7.4: 95.9,
      9: 78.9,
      11: 64.5,
      13.6: 52.2,
      17: 41.8,
      21: 33.8,
      26: 27.3,
      33: 21.5,
      41: 17.3,
    },
  },
  {
    nominalBoreMm: 800,
    outsideDiameterMm: 800,
    wallThicknessBySdr: {
      7.4: 108.1,
      9: 88.9,
      11: 72.7,
      13.6: 58.8,
      17: 47.1,
      21: 38.1,
      26: 30.8,
      33: 24.2,
      41: 19.5,
    },
  },
  {
    nominalBoreMm: 900,
    outsideDiameterMm: 900,
    wallThicknessBySdr: {
      7.4: 121.6,
      9: 100.0,
      11: 81.8,
      13.6: 66.2,
      17: 52.9,
      21: 42.9,
      26: 34.6,
      33: 27.3,
      41: 22.0,
    },
  },
  {
    nominalBoreMm: 1000,
    outsideDiameterMm: 1000,
    wallThicknessBySdr: {
      7.4: 135.1,
      9: 111.1,
      11: 90.9,
      13.6: 73.5,
      17: 58.8,
      21: 47.6,
      26: 38.5,
      33: 30.3,
      41: 24.4,
    },
  },
];

export const hdpeWallThickness = (
  outsideDiameterMm: number,
  sdr: HdpeSdr,
): number | null => {
  const sizeData = HDPE_WALL_THICKNESS_DATA.find(
    (d) => d.outsideDiameterMm === outsideDiameterMm,
  );
  return sizeData?.wallThicknessBySdr[sdr] ?? null;
};

export const hdpePressureRatingForSdr = (
  sdr: HdpeSdr,
  grade: "PE80" | "PE100" | "PE100_RC",
): number => {
  const sdrOption = HDPE_SDR_OPTIONS.find((o) => o.value === sdr);
  if (!sdrOption) return 0;
  return grade === "PE80" ? sdrOption.pe80PressureRating : sdrOption.pe100PressureRating;
};

export const recommendedSdrForPressure = (
  pressureBar: number,
  grade: "PE80" | "PE100" | "PE100_RC",
): HdpeSdr => {
  const sortedSdrs = [...HDPE_SDR_OPTIONS].sort((a, b) => a.value - b.value);
  const isPe100 = grade !== "PE80";

  const suitable = sortedSdrs.find((sdr) => {
    const rating = isPe100 ? sdr.pe100PressureRating : sdr.pe80PressureRating;
    return rating >= pressureBar;
  });

  return suitable?.value ?? 11;
};

export const HDPE_NOMINAL_SIZES = HDPE_WALL_THICKNESS_DATA.map((d) => d.nominalBoreMm);
