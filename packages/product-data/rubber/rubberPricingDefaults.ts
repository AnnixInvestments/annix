export interface RubberNbFactor {
  nb: string;
  pie: number;
  additional: number;
}

export interface RubberPricingDefaults {
  plate: { wastePct: number; markupFactor: number; mpsFactor: number; thicknessesMm: number[] };
  pipe: {
    wastePct: number;
    markupFactor: number;
    mpsFactor: number;
    thicknessesMm: number[];
    nbFactors: RubberNbFactor[];
  };
  consumableMarkup: number;
  paraffin: { ltrsPerCure: number; costPerLitre: number; m2PerPot: number };
  blasting: {
    elecAvgRate: number;
    elecAvgKwh: number;
    gritBagCost: number;
    gritM2PerBag: number;
    blastM2PerHour: number;
    margin: number;
  };
  departmentThroughputM2PerHour: Record<string, number>;
}

export const RUBBER_PRICING_DEFAULTS: RubberPricingDefaults = {
  plate: {
    wastePct: 0.08,
    markupFactor: 1.75,
    mpsFactor: 0.8,
    thicknessesMm: [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50],
  },
  pipe: {
    wastePct: 0.05,
    markupFactor: 1.7,
    mpsFactor: 0.8,
    thicknessesMm: [3, 4, 5, 6, 8, 10, 12],
    nbFactors: [
      { nb: "50NB", pie: 0.19, additional: 0.0125 },
      { nb: "65NB", pie: 0.24, additional: 0.0125 },
      { nb: "80NB", pie: 0.28, additional: 0.0125 },
      { nb: "100NB", pie: 0.36, additional: 0.012 },
      { nb: "125NB", pie: 0.44, additional: 0.012 },
      { nb: "150NB", pie: 0.53, additional: 0.011 },
      { nb: "200NB", pie: 0.69, additional: 0.0 },
      { nb: "250NB", pie: 0.86, additional: 0.0 },
      { nb: "300NB", pie: 1.02, additional: 0.0 },
      { nb: "350NB", pie: 1.12, additional: 0.0 },
      { nb: "400NB", pie: 1.28, additional: 0.0 },
      { nb: "450NB", pie: 1.44, additional: 0.0 },
      { nb: "500NB", pie: 1.6, additional: 0.0 },
      { nb: "550NB", pie: 1.75, additional: 0.0 },
      { nb: "600NB", pie: 1.92, additional: 0.0 },
      { nb: "650NB", pie: 2.08, additional: 0.0 },
      { nb: "700NB", pie: 2.24, additional: 0.0 },
      { nb: "750NB", pie: 2.4, additional: 0.0 },
      { nb: "800NB", pie: 2.56, additional: 0.0 },
      { nb: "850NB", pie: 2.72, additional: 0.0 },
      { nb: "900NB", pie: 2.88, additional: 0.0 },
      { nb: "950NB", pie: 3.04, additional: 0.0 },
      { nb: "1000NB", pie: 3.2, additional: 0.0 },
    ],
  },
  consumableMarkup: 1.53,
  paraffin: { ltrsPerCure: 145, costPerLitre: 31.71, m2PerPot: 121.6 },
  blasting: {
    elecAvgRate: 4.93,
    elecAvgKwh: 115,
    gritBagCost: 1679.54,
    gritM2PerBag: 293,
    blastM2PerHour: 8,
    margin: 1.65,
  },
  departmentThroughputM2PerHour: { Fork: 2, Finisher: 6, Pipes: 2.78, "R/L": 0.35, Solution: 4 },
};
