import { PipeDimension } from "../../pipe-dimension/entities/pipe-dimension.entity";

export class PipePressure {
  id: number;

  temperature_c: number | null;

  max_working_pressure_mpa: number | null;

  allowable_stress_mpa: number;

  pipeDimension: PipeDimension;
}
