export class HdpePipeSpecification {
  id: number;

  nominalBore: number; // DN in mm (20, 25, 32, ..., 1200)

  outerDiameter: number; // OD in mm

  sdr: number; // Standard Dimension Ratio (6, 7.4, 9, 11, 13.6, 17, 21, 26, 32.5)

  wallThickness: number; // Calculated: OD / SDR (mm)

  innerDiameter: number; // OD - 2 * wall (mm)

  weightKgPerM: number; // Weight per meter (kg/m)

  pressureRatingPn: number; // PN rating in bar (for PE100: ~20/(SDR-1))

  materialGrade: string; // PE100, PE80

  displayOrder: number;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
