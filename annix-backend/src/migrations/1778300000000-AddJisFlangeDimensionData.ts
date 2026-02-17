import { MigrationInterface, QueryRunner } from "typeorm";

export class AddJisFlangeDimensionData1778300000000 implements MigrationInterface {
  name = "AddJisFlangeDimensionData1778300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding JIS B 2220 flange dimension data...");

    const nominalId = async (nominalMm: number): Promise<number | null> => {
      const result = await queryRunner.query(
        "SELECT id FROM nominal_outside_diameters WHERE nominal_diameter_mm = $1 LIMIT 1",
        [nominalMm],
      );
      return result[0]?.id ?? null;
    };

    const pressureClassId = async (standardId: number, designation: string): Promise<number | null> => {
      const result = await queryRunner.query(
        `SELECT id FROM flange_pressure_classes WHERE designation = $1 AND "standardId" = $2`,
        [designation, standardId],
      );
      return result[0]?.id ?? null;
    };

    const boltId = async (designation: string): Promise<number | null> => {
      if (!designation) return null;
      const result = await queryRunner.query(
        "SELECT id FROM bolts WHERE designation = $1",
        [designation],
      );
      return result[0]?.id ?? null;
    };

    const jisStandard = await queryRunner.query(
      "SELECT id FROM flange_standards WHERE code = $1",
      ["JIS B 2220"],
    );

    if (jisStandard.length === 0) {
      console.warn("  JIS B 2220 standard not found — skipping dimension data");
      return;
    }

    const jisId = jisStandard[0].id;

    const jisData: Array<
      [number, string, number, number, number, number, number, number, string, number, number, number]
    > = [
      // [nb, pressureClass, D, b, d4, f, num_holes, d1, boltDesignation, pcd, mass_kg, bolt_length_mm]
      // d4 = raised face outer diameter (mm), f = raised face height (mm)
      // Source: JIS B 2220 — d4 and f values must be sourced from official standard tables
      // TODO: populate d4 and f for each row from JIS B 2220 raised face dimension tables
      // Row format: [nb, pressureClass, D, b, d4, f, num_holes, d1, bolt, pcd, mass_kg, bolt_length_mm]
      [10, "5K", 75, 12, 0, 0, 4, 12, "M10", 55, 0.3, 30],
      [10, "10K", 90, 12, 0, 0, 4, 15, "M12", 65, 0.5, 35],
      [15, "5K", 80, 12, 0, 0, 4, 12, "M10", 55, 0.35, 30],
      [15, "10K", 95, 14, 0, 0, 4, 15, "M12", 70, 0.6, 40],
      [15, "16K", 95, 14, 0, 0, 4, 15, "M12", 70, 0.7, 45],
      [20, "5K", 85, 12, 0, 0, 4, 12, "M10", 65, 0.4, 30],
      [20, "10K", 100, 14, 0, 0, 4, 15, "M12", 75, 0.7, 40],
      [20, "16K", 100, 16, 0, 0, 4, 15, "M12", 75, 0.8, 45],
      [25, "5K", 95, 12, 0, 0, 4, 12, "M10", 70, 0.5, 30],
      [25, "10K", 125, 14, 0, 0, 4, 19, "M16", 90, 1.1, 45],
      [25, "16K", 125, 16, 0, 0, 4, 19, "M16", 90, 1.3, 50],
      [32, "5K", 115, 12, 0, 0, 4, 15, "M12", 90, 0.8, 35],
      [32, "10K", 135, 16, 0, 0, 4, 19, "M16", 100, 1.5, 50],
      [32, "16K", 135, 18, 0, 0, 4, 19, "M16", 100, 1.7, 55],
      [40, "5K", 120, 12, 0, 0, 4, 15, "M12", 95, 0.9, 35],
      [40, "10K", 140, 16, 0, 0, 4, 19, "M16", 105, 1.6, 50],
      [40, "16K", 140, 18, 0, 0, 4, 19, "M16", 105, 1.8, 55],
      [50, "5K", 130, 14, 0, 0, 4, 15, "M12", 105, 1.2, 40],
      [50, "10K", 155, 18, 0, 0, 4, 19, "M16", 120, 1.9, 55],
      [50, "16K", 155, 20, 0, 0, 4, 19, "M16", 120, 2.2, 60],
      [50, "20K", 175, 22, 0, 0, 8, 19, "M16", 140, 3.2, 65],
      [65, "5K", 155, 14, 0, 0, 4, 15, "M12", 130, 1.7, 40],
      [65, "10K", 175, 18, 0, 0, 4, 19, "M16", 140, 2.6, 55],
      [65, "16K", 175, 22, 0, 0, 8, 19, "M16", 140, 3.3, 65],
      [65, "20K", 200, 24, 0, 0, 8, 23, "M20", 160, 4.5, 70],
      [80, "5K", 180, 14, 0, 0, 4, 19, "M16", 145, 2.3, 45],
      [80, "10K", 185, 18, 0, 0, 8, 19, "M16", 150, 2.6, 55],
      [80, "16K", 200, 22, 0, 0, 8, 19, "M16", 160, 3.8, 65],
      [80, "20K", 220, 26, 0, 0, 8, 23, "M20", 180, 5.2, 75],
      [100, "5K", 200, 16, 0, 0, 8, 19, "M16", 165, 2.9, 50],
      [100, "10K", 210, 18, 0, 0, 8, 19, "M16", 175, 3.1, 55],
      [100, "16K", 225, 24, 0, 0, 8, 19, "M16", 185, 4.8, 70],
      [100, "20K", 250, 28, 0, 0, 8, 23, "M20", 210, 6.8, 80],
      [125, "5K", 235, 16, 0, 0, 8, 19, "M16", 200, 3.9, 50],
      [125, "10K", 250, 20, 0, 0, 8, 23, "M20", 210, 4.8, 60],
      [125, "16K", 270, 26, 0, 0, 8, 23, "M20", 225, 6.5, 75],
      [125, "20K", 290, 30, 0, 0, 8, 25, "M22", 250, 8.5, 85],
      [150, "5K", 265, 18, 0, 0, 8, 19, "M16", 230, 4.8, 55],
      [150, "10K", 280, 22, 0, 0, 8, 23, "M20", 240, 6.3, 65],
      [150, "16K", 305, 28, 0, 0, 8, 23, "M20", 260, 8.2, 80],
      [150, "20K", 340, 32, 0, 0, 12, 25, "M22", 290, 11.5, 90],
      [200, "5K", 320, 20, 0, 0, 8, 19, "M16", 280, 6.6, 60],
      [200, "10K", 330, 22, 0, 0, 12, 23, "M20", 290, 7.8, 65],
      [200, "16K", 350, 28, 0, 0, 12, 23, "M20", 310, 10.5, 80],
      [200, "20K", 400, 34, 0, 0, 12, 27, "M24", 355, 16.0, 95],
      [250, "5K", 385, 22, 0, 0, 12, 19, "M16", 345, 9.5, 65],
      [250, "10K", 400, 24, 0, 0, 12, 25, "M22", 355, 11.5, 70],
      [250, "16K", 430, 30, 0, 0, 12, 27, "M24", 380, 15.5, 85],
      [250, "20K", 475, 38, 0, 0, 12, 27, "M24", 425, 22.0, 105],
      [300, "5K", 430, 22, 0, 0, 12, 23, "M20", 390, 11.5, 65],
      [300, "10K", 450, 24, 0, 0, 16, 25, "M22", 410, 14.0, 70],
      [300, "16K", 480, 32, 0, 0, 16, 27, "M24", 435, 19.0, 90],
      [300, "20K", 545, 42, 0, 0, 16, 33, "M30", 495, 30.0, 115],
      [350, "10K", 520, 26, 0, 0, 16, 25, "M22", 475, 19.0, 75],
      [350, "16K", 550, 34, 0, 0, 16, 27, "M24", 505, 25.0, 95],
      [400, "10K", 580, 28, 0, 0, 16, 27, "M24", 530, 24.5, 80],
      [400, "16K", 620, 36, 0, 0, 16, 33, "M30", 565, 33.0, 100],
      [450, "10K", 630, 28, 0, 0, 20, 27, "M24", 585, 28.0, 80],
      [450, "16K", 675, 38, 0, 0, 20, 33, "M30", 620, 40.0, 105],
      [500, "10K", 680, 30, 0, 0, 20, 27, "M24", 635, 33.0, 85],
      [500, "16K", 730, 40, 0, 0, 20, 33, "M30", 675, 48.0, 110],
      [600, "10K", 795, 32, 0, 0, 24, 30, "M27", 750, 46.0, 90],
      [600, "16K", 845, 44, 0, 0, 24, 36, "M33", 795, 65.0, 120],
    ];

    for (const row of jisData) {
      const [nb, pressureClass, D, b, d4, f, num_holes, d1, boltDesignation, pcd, mass_kg, bolt_length_mm] = row;
      const nId = await nominalId(nb);
      const pcId = await pressureClassId(jisId, pressureClass);
      const bId = await boltId(boltDesignation);

      if (!nId || !pcId) continue;

      await queryRunner.query(
        `
        INSERT INTO flange_dimensions (
          "nominalOutsideDiameterId", "standardId", "pressureClassId",
          "D", "b", "d4", "f", "num_holes", "d1",
          "boltId", "pcd", "mass_kg", "bolt_length_mm"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT DO NOTHING
        `,
        [nId, jisId, pcId, D, b, d4, f, num_holes, d1, bId, pcd, mass_kg, bolt_length_mm],
      );
    }

    console.warn(`  Added JIS B 2220 flange dimension records (d4/f values require update from JIS B 2220 standard)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const jisStandard = await queryRunner.query(
      "SELECT id FROM flange_standards WHERE code = $1",
      ["JIS B 2220"],
    );
    if (jisStandard.length === 0) return;

    const jisId = jisStandard[0].id;
    await queryRunner.query(
      `DELETE FROM flange_dimensions WHERE "standardId" = $1`,
      [jisId],
    );
  }
}
