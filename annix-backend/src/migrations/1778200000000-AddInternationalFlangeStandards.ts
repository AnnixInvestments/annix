import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInternationalFlangeStandards1778200000000 implements MigrationInterface {
  name = "AddInternationalFlangeStandards1778200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding international flange standards (JIS, DIN, GB/T, ISO)...");

    const insertStandard = async (code: string, description?: string) => {
      const existing = await queryRunner.query("SELECT id FROM flange_standards WHERE code = $1", [
        code,
      ]);
      if (existing.length === 0) {
        const result = await queryRunner.query(
          "INSERT INTO flange_standards (code) VALUES ($1) RETURNING id",
          [code],
        );
        console.warn(`  Added flange standard: ${code}`);
        return result[0].id;
      }
      return existing[0].id;
    };

    const jisId = await insertStandard("JIS B 2220");
    const dinId = await insertStandard("DIN 2573");
    const gbtId = await insertStandard("GB/T 9113");
    const isoId = await insertStandard("ISO 7005-1");

    const insertPressureClass = async (standardId: number, designation: string) => {
      const existing = await queryRunner.query(
        `SELECT id FROM flange_pressure_classes WHERE designation = $1 AND "standardId" = $2`,
        [designation, standardId],
      );
      if (existing.length === 0) {
        const result = await queryRunner.query(
          `INSERT INTO flange_pressure_classes (designation, "standardId") VALUES ($1, $2) RETURNING id`,
          [designation, standardId],
        );
        return result[0].id;
      }
      return existing[0].id;
    };

    const jisClasses = ["5K", "10K", "16K", "20K", "30K", "40K"];
    for (const cls of jisClasses) {
      await insertPressureClass(jisId, cls);
    }
    console.warn("  Added JIS B 2220 pressure classes: 5K, 10K, 16K, 20K, 30K, 40K");

    const pnClasses = ["PN 6", "PN 10", "PN 16", "PN 25", "PN 40", "PN 63", "PN 100"];
    for (const cls of pnClasses) {
      await insertPressureClass(dinId, cls);
      await insertPressureClass(gbtId, cls);
      await insertPressureClass(isoId, cls);
    }
    console.warn("  Added DIN 2573, GB/T 9113, ISO 7005-1 pressure classes: PN 6-100");

    const getNominalId = async (nominalMm: number) => {
      const result = await queryRunner.query(
        "SELECT id FROM nominal_outside_diameters WHERE nominal_diameter_mm = $1 LIMIT 1",
        [nominalMm],
      );
      return result[0]?.id;
    };

    const getPressureClassId = async (standardId: number, designation: string) => {
      const result = await queryRunner.query(
        `SELECT id FROM flange_pressure_classes WHERE designation = $1 AND "standardId" = $2`,
        [designation, standardId],
      );
      return result[0]?.id;
    };

    const getBoltId = async (designation: string) => {
      if (!designation) return null;
      const result = await queryRunner.query("SELECT id FROM bolts WHERE designation = $1", [
        designation,
      ]);
      return result[0]?.id;
    };

    console.warn("Adding JIS B 2220 flange dimension data...");

    // JIS B 2220 flange dimension data with raised face dimensions
    // Format: [nb, pressureClass, D, b, d4, f, num_holes, d1, boltDesignation, pcd, mass_kg, bolt_length_mm]
    // d4: raised face outer diameter (mm) - per JIS B 2220 / JIS B 2202
    // f: raised face height (mm) - 2mm for 5K/10K, 3mm for 16K/20K
    const jisData: Array<
      [
        number,
        string,
        number,
        number,
        number,
        number,
        number,
        number,
        string,
        number,
        number,
        number,
      ]
    > = [
      // ===== 5K Class (f = 2mm) =====
      [10, "5K", 75, 12, 39, 2, 4, 12, "M10", 55, 0.3, 30],
      [15, "5K", 80, 12, 44, 2, 4, 12, "M10", 55, 0.35, 30],
      [20, "5K", 85, 12, 49, 2, 4, 12, "M10", 65, 0.4, 30],
      [25, "5K", 95, 12, 59, 2, 4, 12, "M10", 70, 0.5, 30],
      [32, "5K", 115, 12, 70, 2, 4, 15, "M12", 90, 0.8, 35],
      [40, "5K", 120, 12, 75, 2, 4, 15, "M12", 95, 0.9, 35],
      [50, "5K", 130, 14, 85, 2, 4, 15, "M12", 105, 1.2, 40],
      [65, "5K", 155, 14, 110, 2, 4, 15, "M12", 130, 1.7, 40],
      [80, "5K", 180, 14, 121, 2, 4, 19, "M16", 145, 2.3, 45],
      [100, "5K", 200, 16, 141, 2, 8, 19, "M16", 165, 2.9, 50],
      [125, "5K", 235, 16, 176, 2, 8, 19, "M16", 200, 3.9, 50],
      [150, "5K", 265, 18, 206, 2, 8, 19, "M16", 230, 4.8, 55],
      [200, "5K", 320, 20, 252, 2, 8, 19, "M16", 280, 6.6, 60],
      [250, "5K", 385, 22, 317, 2, 12, 19, "M16", 345, 9.5, 65],
      [300, "5K", 430, 22, 360, 2, 12, 23, "M20", 390, 11.5, 65],

      // ===== 10K Class (f = 2mm) =====
      [10, "10K", 90, 12, 46, 2, 4, 15, "M12", 65, 0.5, 35],
      [15, "10K", 95, 14, 51, 2, 4, 15, "M12", 70, 0.6, 40],
      [20, "10K", 100, 14, 56, 2, 4, 15, "M12", 75, 0.7, 40],
      [25, "10K", 125, 14, 67, 2, 4, 19, "M16", 90, 1.1, 45],
      [32, "10K", 135, 16, 76, 2, 4, 19, "M16", 100, 1.5, 50],
      [40, "10K", 140, 16, 81, 2, 4, 19, "M16", 105, 1.6, 50],
      [50, "10K", 155, 18, 96, 2, 4, 19, "M16", 120, 1.9, 55],
      [65, "10K", 175, 18, 116, 2, 4, 19, "M16", 140, 2.6, 55],
      [80, "10K", 185, 18, 126, 2, 8, 19, "M16", 150, 2.6, 55],
      [100, "10K", 210, 18, 151, 2, 8, 19, "M16", 175, 3.1, 55],
      [125, "10K", 250, 20, 182, 2, 8, 23, "M20", 210, 4.8, 60],
      [150, "10K", 280, 22, 212, 2, 8, 23, "M20", 240, 6.3, 65],
      [200, "10K", 330, 22, 262, 2, 12, 23, "M20", 290, 7.8, 65],
      [250, "10K", 400, 24, 324, 2, 12, 25, "M22", 355, 11.5, 70],
      [300, "10K", 450, 24, 368, 2, 16, 25, "M22", 410, 14.0, 70],
      [350, "10K", 520, 26, 413, 2, 16, 25, "M22", 475, 19.0, 75],
      [400, "10K", 580, 28, 475, 2, 16, 27, "M24", 530, 24.5, 80],
      [450, "10K", 630, 28, 530, 2, 20, 27, "M24", 585, 28.0, 80],
      [500, "10K", 680, 30, 585, 2, 20, 27, "M24", 635, 33.0, 85],
      [600, "10K", 795, 32, 690, 2, 24, 30, "M27", 750, 46.0, 90],

      // ===== 16K Class (f = 3mm) =====
      [10, "16K", 90, 12, 46, 3, 4, 15, "M12", 65, 0.5, 40],
      [15, "16K", 95, 14, 51, 3, 4, 15, "M12", 70, 0.7, 45],
      [20, "16K", 100, 16, 56, 3, 4, 15, "M12", 75, 0.8, 45],
      [25, "16K", 125, 16, 67, 3, 4, 19, "M16", 90, 1.3, 50],
      [32, "16K", 135, 18, 76, 3, 4, 19, "M16", 100, 1.7, 55],
      [40, "16K", 140, 18, 81, 3, 4, 19, "M16", 105, 1.8, 55],
      [50, "16K", 155, 20, 96, 3, 4, 19, "M16", 120, 2.2, 60],
      [65, "16K", 175, 22, 116, 3, 8, 19, "M16", 140, 3.3, 65],
      [80, "16K", 200, 22, 131, 3, 8, 19, "M16", 160, 3.8, 65],
      [100, "16K", 225, 24, 156, 3, 8, 19, "M16", 185, 4.8, 70],
      [125, "16K", 270, 26, 192, 3, 8, 23, "M20", 225, 6.5, 75],
      [150, "16K", 305, 28, 226, 3, 8, 23, "M20", 260, 8.2, 80],
      [200, "16K", 350, 28, 276, 3, 12, 23, "M20", 310, 10.5, 80],
      [250, "16K", 430, 30, 340, 3, 12, 27, "M24", 380, 15.5, 85],
      [300, "16K", 480, 32, 385, 3, 16, 27, "M24", 435, 19.0, 90],
      [350, "16K", 550, 34, 435, 3, 16, 27, "M24", 505, 25.0, 95],
      [400, "16K", 620, 36, 495, 3, 16, 33, "M30", 565, 33.0, 100],
      [450, "16K", 675, 38, 545, 3, 20, 33, "M30", 620, 40.0, 105],
      [500, "16K", 730, 40, 600, 3, 20, 33, "M30", 675, 48.0, 110],
      [600, "16K", 845, 44, 720, 3, 24, 36, "M33", 795, 65.0, 120],

      // ===== 20K Class (f = 3mm) =====
      [50, "20K", 175, 22, 96, 3, 8, 19, "M16", 140, 3.2, 65],
      [65, "20K", 200, 24, 120, 3, 8, 23, "M20", 160, 4.5, 70],
      [80, "20K", 220, 26, 136, 3, 8, 23, "M20", 180, 5.2, 75],
      [100, "20K", 250, 28, 166, 3, 8, 23, "M20", 210, 6.8, 80],
      [125, "20K", 290, 30, 202, 3, 8, 25, "M22", 250, 8.5, 85],
      [150, "20K", 340, 32, 242, 3, 12, 25, "M22", 290, 11.5, 90],
      [200, "20K", 400, 34, 296, 3, 12, 27, "M24", 355, 16.0, 95],
      [250, "20K", 475, 38, 364, 3, 12, 27, "M24", 425, 22.0, 105],
      [300, "20K", 545, 42, 420, 3, 16, 33, "M30", 495, 30.0, 115],
    ];

    for (const row of jisData) {
      const [
        nb,
        pressureClass,
        D,
        b,
        d4,
        f,
        numHoles,
        d1,
        boltDesignation,
        pcd,
        massKg,
        boltLength,
      ] = row;
      const nominalId = await getNominalId(nb);
      const pressureClassId = await getPressureClassId(jisId, pressureClass);
      const boltId = await getBoltId(boltDesignation);

      if (!nominalId || !pressureClassId) {
        continue;
      }

      await queryRunner.query(
        `
        INSERT INTO flange_dimensions (
          "nominalOutsideDiameterId", "standardId", "pressureClassId", "D", "b", "d4", "f",
          "num_holes", "d1", "boltId", "pcd", "mass_kg", "bolt_length_mm"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `,
        [
          nominalId,
          jisId,
          pressureClassId,
          D,
          b,
          d4,
          f,
          numHoles,
          d1,
          boltId,
          pcd,
          massKg,
          boltLength,
        ],
      );
    }
    console.warn(`  Added ${jisData.length} JIS B 2220 flange dimension records`);

    console.warn("Adding standard relationship documentation...");
    await queryRunner.query(`
      COMMENT ON TABLE flange_standards IS 'Flange standards. Note: DIN 2573/GB/T 9113/ISO 7005-1 PN classes share dimensions with BS 4504/EN 1092-1. JIS B 2220 has unique K-class dimensions.';
    `);

    console.warn("International flange standards added successfully.");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn("Removing international flange standards...");

    const standards = ["JIS B 2220", "DIN 2573", "GB/T 9113", "ISO 7005-1"];

    for (const code of standards) {
      const standardResult = await queryRunner.query(
        "SELECT id FROM flange_standards WHERE code = $1",
        [code],
      );

      if (standardResult.length > 0) {
        const standardId = standardResult[0].id;

        const pressureClasses = await queryRunner.query(
          `SELECT id FROM flange_pressure_classes WHERE "standardId" = $1`,
          [standardId],
        );

        for (const pc of pressureClasses) {
          await queryRunner.query(`DELETE FROM flange_dimensions WHERE "pressureClassId" = $1`, [
            pc.id,
          ]);
        }

        await queryRunner.query(`DELETE FROM flange_pressure_classes WHERE "standardId" = $1`, [
          standardId,
        ]);

        await queryRunner.query("DELETE FROM flange_standards WHERE id = $1", [standardId]);
      }
    }

    console.warn("International flange standards removed.");
  }
}
