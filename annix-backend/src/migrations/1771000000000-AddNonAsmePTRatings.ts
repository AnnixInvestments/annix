import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNonAsmePTRatings1771000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const bs4504Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 4504'`,
    );
    const sabs1123Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'SABS 1123'`,
    );
    const bs10Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 10'`,
    );

    const bs4504Id = bs4504Result[0]?.id;
    const sabs1123Id = sabs1123Result[0]?.id;
    const bs10Id = bs10Result[0]?.id;

    const insertPtRating = async (
      pressureClassId: number,
      materialGroup: string,
      temperatureCelsius: number,
      maxPressureBar: number,
    ) => {
      const maxPressurePsi = Math.round(maxPressureBar * 14.5038);
      const existing = await queryRunner.query(
        `SELECT id FROM flange_pt_ratings WHERE pressure_class_id = ${pressureClassId} AND material_group = '${materialGroup}' AND temperature_celsius = ${temperatureCelsius}`,
      );
      if (existing.length === 0) {
        await queryRunner.query(`
          INSERT INTO flange_pt_ratings (pressure_class_id, material_group, temperature_celsius, max_pressure_bar, max_pressure_psi)
          VALUES (${pressureClassId}, '${materialGroup}', ${temperatureCelsius}, ${maxPressureBar}, ${maxPressurePsi})
        `);
      }
    };

    if (bs4504Id) {
      const pnClasses = ["PN6", "PN10", "PN16", "PN25", "PN40", "PN64"];
      const pnValues: Record<string, number> = {
        PN6: 6,
        PN10: 10,
        PN16: 16,
        PN25: 25,
        PN40: 40,
        PN64: 64,
      };

      for (const pnClass of pnClasses) {
        const classResult = await queryRunner.query(
          `SELECT id FROM flange_pressure_classes WHERE designation = '${pnClass}' AND "standardId" = ${bs4504Id}`,
        );
        if (classResult.length > 0) {
          const classId = classResult[0].id;
          const basePN = pnValues[pnClass];

          const pnPtData: [number, number][] = [
            [-10, basePN],
            [20, basePN],
            [100, basePN],
            [120, basePN],
            [150, basePN * 0.95],
            [200, basePN * 0.87],
            [250, basePN * 0.8],
            [300, basePN * 0.7],
            [350, basePN * 0.6],
            [400, basePN * 0.48],
          ];

          for (const [temp, pressure] of pnPtData) {
            await insertPtRating(classId, "Carbon Steel", temp, Math.round(pressure * 10) / 10);
          }
        }
      }
    }

    if (sabs1123Id) {
      const sabsClasses = ["1000", "1600", "2500", "4000"];
      const sabsValues: Record<string, number> = {
        "1000": 10,
        "1600": 16,
        "2500": 25,
        "4000": 40,
      };

      for (const sabsClass of sabsClasses) {
        const classResult = await queryRunner.query(
          `SELECT id FROM flange_pressure_classes WHERE designation = '${sabsClass}' AND "standardId" = ${sabs1123Id}`,
        );
        if (classResult.length > 0) {
          const classId = classResult[0].id;
          const baseBar = sabsValues[sabsClass];

          const sabsPtData: [number, number][] = [
            [-10, baseBar],
            [20, baseBar],
            [100, baseBar],
            [150, baseBar * 0.93],
            [200, baseBar * 0.85],
          ];

          for (const [temp, pressure] of sabsPtData) {
            await insertPtRating(classId, "Carbon Steel", temp, Math.round(pressure * 10) / 10);
          }
        }
      }
    }

    if (bs10Id) {
      const bs10TablePressures: Record<string, [number, number][]> = {
        "T/D": [
          [-10, 10],
          [100, 10],
          [200, 10],
          [230, 9],
        ],
        "T/E": [
          [-10, 19],
          [100, 19],
          [200, 19],
          [230, 17],
        ],
        "T/F": [
          [-10, 20.7],
          [100, 20.7],
          [200, 20.7],
          [250, 19.3],
          [300, 16.2],
          [350, 13.4],
          [400, 10.3],
        ],
        "T/H": [
          [-10, 34.5],
          [100, 34.5],
          [200, 34.5],
          [250, 32],
          [300, 27.2],
          [350, 22.1],
          [400, 17.2],
          [425, 12.4],
          [450, 7.9],
        ],
        "T/J": [
          [-10, 48.3],
          [100, 48.3],
          [200, 48.3],
          [250, 44.8],
          [300, 37.9],
          [350, 31],
          [400, 24.1],
          [425, 17.6],
          [450, 11],
        ],
        "T/K": [
          [-10, 62],
          [100, 62],
          [200, 62],
          [250, 57.6],
          [300, 48.6],
          [350, 40],
          [400, 31],
          [425, 22.4],
          [450, 14.1],
        ],
      };

      for (const [tableCode, ptData] of Object.entries(bs10TablePressures)) {
        const classResult = await queryRunner.query(
          `SELECT id FROM flange_pressure_classes WHERE designation = '${tableCode}' AND "standardId" = ${bs10Id}`,
        );
        if (classResult.length > 0) {
          const classId = classResult[0].id;
          for (const [temp, pressure] of ptData) {
            await insertPtRating(classId, "Carbon Steel", temp, pressure);
          }
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const bs4504Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 4504'`,
    );
    const sabs1123Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'SABS 1123'`,
    );
    const bs10Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 10'`,
    );

    for (const result of [bs4504Result, sabs1123Result, bs10Result]) {
      if (result.length > 0) {
        const standardId = result[0].id;
        const classIds = await queryRunner.query(
          `SELECT id FROM flange_pressure_classes WHERE "standardId" = ${standardId}`,
        );
        for (const { id } of classIds) {
          await queryRunner.query(
            `DELETE FROM flange_pt_ratings WHERE pressure_class_id = ${id} AND material_group = 'Carbon Steel'`,
          );
        }
      }
    }
  }
}
