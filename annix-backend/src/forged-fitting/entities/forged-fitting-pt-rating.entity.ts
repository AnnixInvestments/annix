import { ForgedFittingSeries } from "./forged-fitting-series.entity";

export class ForgedFittingPtRating {
  id: number;

  seriesId: number;

  series: ForgedFittingSeries;

  temperatureCelsius: number;

  pressureMpa: number;

  materialGroup: string;
}
