import { FlangePressureClass } from "../../flange-pressure-class/entities/flange-pressure-class.entity";

export class FlangePtRating {
  id: number;

  pressureClass: FlangePressureClass;

  pressureClassId: number;

  materialGroup: string; // e.g., "1.1", "2.1" for carbon steel A105, or "Carbon Steel A105"

  temperatureCelsius: number; // Temperature in Celsius

  maxPressureBar: number; // Maximum allowable pressure at this temperature in bar

  maxPressurePsi: number; // Maximum allowable pressure at this temperature in psi
}
