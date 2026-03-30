const NPS_TO_NB_MM: Record<string, number> = {
  "1/8": 6,
  "1/4": 8,
  "3/8": 10,
  "1/2": 15,
  "3/4": 20,
  "1": 25,
  "1-1/4": 32,
  "1-1/2": 40,
  "2": 50,
  "2-1/2": 65,
  "3": 80,
  "3-1/2": 90,
  "4": 100,
  "5": 125,
  "6": 150,
  "8": 200,
  "10": 250,
  "12": 300,
  "14": 350,
  "16": 400,
  "18": 450,
  "20": 500,
  "22": 550,
  "24": 600,
  "26": 650,
  "28": 700,
  "30": 750,
  "32": 800,
  "34": 850,
  "36": 900,
  "42": 1050,
  "48": 1200,
};

export const NB_MM_TO_NPS: Record<number, string> = Object.entries(NPS_TO_NB_MM).reduce<
  Record<number, string>
>((acc, [nps, nb]) => ({ ...acc, [nb]: nps }), {});

interface ReducerSizeCombination {
  largeNbMm: number;
  validSmallNbMm: number[];
  standardLengthMm: number;
}

const SABS719_REDUCER_COMBINATIONS: ReducerSizeCombination[] = [
  { largeNbMm: 200, validSmallNbMm: [100, 125, 150], standardLengthMm: 180 },
  { largeNbMm: 250, validSmallNbMm: [150, 200], standardLengthMm: 205 },
  { largeNbMm: 300, validSmallNbMm: [150, 200, 250], standardLengthMm: 230 },
  { largeNbMm: 350, validSmallNbMm: [200, 250, 300], standardLengthMm: 255 },
  { largeNbMm: 400, validSmallNbMm: [250, 300, 350], standardLengthMm: 280 },
  { largeNbMm: 450, validSmallNbMm: [300, 350, 400], standardLengthMm: 305 },
  { largeNbMm: 500, validSmallNbMm: [300, 350, 400, 450], standardLengthMm: 330 },
  { largeNbMm: 550, validSmallNbMm: [350, 400, 450, 500], standardLengthMm: 355 },
  { largeNbMm: 600, validSmallNbMm: [400, 450, 500, 550], standardLengthMm: 380 },
  { largeNbMm: 650, validSmallNbMm: [400, 450, 500, 550, 600], standardLengthMm: 405 },
  { largeNbMm: 700, validSmallNbMm: [450, 500, 550, 600, 650], standardLengthMm: 430 },
  { largeNbMm: 750, validSmallNbMm: [500, 550, 600, 650, 700], standardLengthMm: 460 },
  { largeNbMm: 800, validSmallNbMm: [550, 600, 650, 700, 750], standardLengthMm: 485 },
  { largeNbMm: 850, validSmallNbMm: [550, 600, 650, 700, 750, 800], standardLengthMm: 510 },
  { largeNbMm: 900, validSmallNbMm: [600, 650, 700, 750, 800, 850], standardLengthMm: 535 },
];

export const SABS719_STANDARD_REDUCER_LENGTHS: Record<number, number> =
  SABS719_REDUCER_COMBINATIONS.reduce<Record<number, number>>(
    (acc, c) => ({ ...acc, [c.largeNbMm]: c.standardLengthMm }),
    {},
  );
