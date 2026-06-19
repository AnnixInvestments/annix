export class PipeScheduleWall {
  id: number;

  nps: string; // e.g., "1/2", "1", "2", "6", "24"

  schedule: string; // e.g., "5S", "10", "40", "80", "160", "XXS"

  wallThicknessInch: number; // Wall thickness in inches

  wallThicknessMm: number; // Wall thickness in mm (computed)
}

export class PipeNpsOd {
  id: number;

  nps: string; // e.g., "1/2", "1", "2", "6", "24"

  odInch: number; // Outside diameter in inches

  odMm: number; // Outside diameter in mm
}
