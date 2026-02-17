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
