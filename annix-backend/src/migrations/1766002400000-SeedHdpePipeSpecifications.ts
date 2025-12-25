import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedHdpePipeSpecifications1766002400000 implements MigrationInterface {
  name = 'SeedHdpePipeSpecifications1766002400000';

  // HDPE density in kg/m³
  private readonly DENSITY = 955;

  // Common SDR values
  private readonly SDR_LIST = [6, 7.4, 9, 11, 13.6, 17, 21, 26, 32.5];

  // Outer Diameters (OD) in mm for common Nominal Bore (NB/DN) sizes
  private readonly PIPE_ODS: Record<number, number> = {
    20: 20,
    25: 25,
    32: 32,
    40: 40,
    50: 50,
    63: 63,
    75: 75,
    90: 90,
    110: 110,
    125: 125,
    140: 140,
    160: 160,
    180: 180,
    200: 200,
    225: 225,
    250: 250,
    280: 280,
    315: 315,
    355: 355,
    400: 400,
    450: 450,
    500: 500,
    560: 560,
    630: 630,
    710: 710,
    800: 800,
    900: 900,
    1000: 1000,
    1200: 1200,
  };

  private calculateWallThickness(od: number, sdr: number): number {
    return od / sdr;
  }

  private calculateInnerDiameter(od: number, wall: number): number {
    return od - 2 * wall;
  }

  private calculateWeightPerMeter(od: number, id: number): number {
    const crossSectionArea = (Math.PI / 4) * ((od * od - id * id) / 1000000); // m²
    return crossSectionArea * this.DENSITY; // kg/m
  }

  private calculatePressureRating(sdr: number): number {
    // For PE100: PN ≈ 20 / (SDR - 1) bar (simplified)
    return 20 / (sdr - 1);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const values: string[] = [];

    // Generate all combinations of NB and SDR
    for (const [nb, od] of Object.entries(this.PIPE_ODS)) {
      const nominalBore = parseInt(nb);
      const outerDiameter = od;

      for (const sdr of this.SDR_LIST) {
        const wallThickness = this.calculateWallThickness(outerDiameter, sdr);
        const innerDiameter = this.calculateInnerDiameter(outerDiameter, wallThickness);
        const weightKgPerM = this.calculateWeightPerMeter(outerDiameter, innerDiameter);
        const pressureRatingPn = this.calculatePressureRating(sdr);

        values.push(`
          (${nominalBore}, ${outerDiameter.toFixed(2)}, ${sdr.toFixed(2)},
           ${wallThickness.toFixed(3)}, ${innerDiameter.toFixed(3)},
           ${weightKgPerM.toFixed(4)}, ${pressureRatingPn.toFixed(2)}, 'PE100', 0, true)
        `);
      }
    }

    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      await queryRunner.query(`
        INSERT INTO "hdpe_pipe_specifications"
        ("nominal_bore", "outer_diameter", "sdr", "wall_thickness", "inner_diameter",
         "weight_kg_per_m", "pressure_rating_pn", "material_grade", "display_order", "is_active")
        VALUES ${batch.join(', ')}
      `);
    }

    // Insert default buttweld prices (placeholder: $10 + $0.1 per mm NB)
    const buttweldValues: string[] = [];
    for (const [nb] of Object.entries(this.PIPE_ODS)) {
      const nominalBore = parseInt(nb);
      const pricePerWeld = (10 + nominalBore / 10).toFixed(2);
      buttweldValues.push(`
        (${nominalBore}, ${pricePerWeld}, 'ZAR', true)
      `);
    }

    await queryRunner.query(`
      INSERT INTO "hdpe_buttweld_prices"
      ("nominal_bore", "price_per_weld", "currency", "is_active")
      VALUES ${buttweldValues.join(', ')}
    `);

    // Insert default stub prices (placeholder: $5 + $0.05 per mm NB)
    const stubValues: string[] = [];
    for (const [nb] of Object.entries(this.PIPE_ODS)) {
      const nominalBore = parseInt(nb);
      const pricePerStub = (5 + nominalBore / 20).toFixed(2);
      stubValues.push(`
        (${nominalBore}, ${pricePerStub}, 'ZAR', true)
      `);
    }

    await queryRunner.query(`
      INSERT INTO "hdpe_stub_prices"
      ("nominal_bore", "price_per_stub", "currency", "is_active")
      VALUES ${stubValues.join(', ')}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "hdpe_stub_prices"`);
    await queryRunner.query(`DELETE FROM "hdpe_buttweld_prices"`);
    await queryRunner.query(`DELETE FROM "hdpe_pipe_specifications"`);
  }
}
