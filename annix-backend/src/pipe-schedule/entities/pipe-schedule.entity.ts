export class PipeSchedule {
  id: number;

  nps: string; // Nominal Pipe Size (e.g., "1/2", "3/4", "1", "2", "6", "12", "24")

  nbMm: number; // Nominal Bore in mm (e.g., 15, 20, 25, 50, 150, 300, 600)

  schedule: string; // Schedule designation (e.g., "5S", "10S", "40", "80", "160", "XXS")

  wallThicknessInch: number; // Wall thickness in inches

  wallThicknessMm: number; // Wall thickness in mm

  outsideDiameterInch: number; // OD in inches

  outsideDiameterMm: number; // OD in mm

  standardCode: string; // ASME B36.10 (carbon/alloy) or B36.19 (stainless)
}
