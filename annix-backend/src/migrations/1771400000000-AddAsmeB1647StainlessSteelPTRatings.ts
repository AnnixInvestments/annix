import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAsmeB1647StainlessSteelPTRatings1771400000000 implements MigrationInterface {
  name = "AddAsmeB1647StainlessSteelPTRatings1771400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding SS304 and SS316 P-T ratings for ASME B16.47...");

    const b1647AResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47 A'`,
    );
    const b1647BResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47 B'`,
    );

    const standardIds = [b1647AResult[0]?.id, b1647BResult[0]?.id].filter(Boolean);

    if (standardIds.length === 0) {
      console.warn("No ASME B16.47 standards found, skipping...");
      return;
    }

    for (const standardId of standardIds) {
      const classResults = await queryRunner.query(`
        SELECT id, designation FROM flange_pressure_classes
        WHERE "standardId" = ${standardId}
      `);

      const classMap: Record<string, number> = {};
      for (const pc of classResults) {
        classMap[pc.designation] = pc.id;
      }

      await this.insertStainlessSteelRatings(queryRunner, classMap);
    }

    console.warn("SS304 and SS316 P-T ratings added for ASME B16.47.");
  }

  private async insertStainlessSteelRatings(
    queryRunner: QueryRunner,
    classMap: Record<string, number>,
  ): Promise<void> {
    const ss316: Record<string, Record<number, number>> = {
      "75": {
        "-29": 9.5,
        "38": 9.5,
        "93": 8.1,
        "149": 7.4,
        "204": 6.7,
        "260": 5.9,
        "316": 4.9,
        "343": 4.3,
        "371": 3.8,
        "399": 3.3,
        "427": 2.8,
      },
      "150": {
        "-29": 19.0,
        "38": 19.0,
        "93": 16.2,
        "149": 14.8,
        "204": 13.4,
        "260": 11.7,
        "316": 9.7,
        "343": 8.6,
        "371": 7.6,
        "399": 6.6,
        "427": 5.5,
      },
      "300": {
        "-29": 49.7,
        "38": 49.7,
        "93": 42.8,
        "149": 38.6,
        "204": 35.5,
        "260": 33.1,
        "316": 31.0,
        "343": 30.3,
        "371": 30.0,
        "399": 29.3,
        "427": 29.0,
      },
      "400": {
        "-29": 66.2,
        "38": 66.2,
        "93": 57.0,
        "149": 51.5,
        "204": 47.4,
        "260": 44.1,
        "316": 41.4,
        "343": 40.4,
        "371": 40.0,
        "399": 39.1,
        "427": 38.6,
      },
      "600": {
        "-29": 99.3,
        "38": 99.3,
        "93": 85.5,
        "149": 77.2,
        "204": 70.7,
        "260": 65.9,
        "316": 62.1,
        "343": 61.0,
        "371": 60.0,
        "399": 59.0,
        "427": 58.3,
      },
      "900": {
        "-29": 149.0,
        "38": 149.0,
        "93": 128.4,
        "149": 115.9,
        "204": 106.2,
        "260": 99.0,
        "316": 93.5,
        "343": 91.4,
        "371": 90.0,
        "399": 88.3,
        "427": 87.2,
      },
    };

    const ss304: Record<string, Record<number, number>> = {
      "75": {
        "-29": 9.8,
        "38": 9.8,
        "93": 8.6,
        "149": 7.8,
        "204": 7.0,
        "260": 6.2,
        "316": 5.2,
        "343": 4.7,
        "371": 4.2,
        "399": 3.8,
        "427": 3.5,
        "454": 3.1,
        "482": 2.8,
      },
      "150": {
        "-29": 19.6,
        "38": 19.6,
        "93": 17.2,
        "149": 15.5,
        "204": 14.0,
        "260": 12.4,
        "316": 10.3,
        "343": 9.3,
        "371": 8.4,
        "399": 7.6,
        "427": 6.9,
        "454": 6.2,
        "482": 5.5,
      },
      "300": {
        "-29": 51.7,
        "38": 51.7,
        "93": 45.2,
        "149": 40.0,
        "204": 36.5,
        "260": 34.1,
        "316": 32.1,
        "343": 31.0,
        "371": 30.3,
        "399": 29.7,
        "427": 29.0,
        "454": 28.3,
        "482": 27.6,
      },
      "400": {
        "-29": 68.9,
        "38": 68.9,
        "93": 60.2,
        "149": 53.3,
        "204": 48.7,
        "260": 45.5,
        "316": 42.7,
        "343": 41.4,
        "371": 40.4,
        "399": 39.7,
        "427": 38.6,
        "454": 37.9,
        "482": 36.8,
      },
      "600": {
        "-29": 103.4,
        "38": 103.4,
        "93": 90.3,
        "149": 80.0,
        "204": 73.1,
        "260": 68.3,
        "316": 64.1,
        "343": 62.1,
        "371": 60.7,
        "399": 59.3,
        "427": 58.3,
        "454": 56.9,
        "482": 55.2,
      },
      "900": {
        "-29": 155.1,
        "38": 155.1,
        "93": 135.5,
        "149": 120.0,
        "204": 109.7,
        "260": 102.4,
        "316": 96.2,
        "343": 93.1,
        "371": 91.0,
        "399": 89.0,
        "427": 87.2,
        "454": 85.2,
        "482": 82.8,
      },
    };

    await this.insertPTRatings(queryRunner, classMap, "Stainless Steel 316 (Group 2.2)", ss316);

    await this.insertPTRatings(queryRunner, classMap, "Stainless Steel 304 (Group 2.1)", ss304);
  }

  private async insertPTRatings(
    queryRunner: QueryRunner,
    classMap: Record<string, number>,
    materialGroup: string,
    data: Record<string, Record<number, number>>,
  ): Promise<void> {
    for (const [designation, temps] of Object.entries(data)) {
      const classId = classMap[designation];
      if (!classId) continue;

      for (const [tempStr, pressureBar] of Object.entries(temps)) {
        const temp = parseFloat(tempStr);
        await queryRunner.query(
          `
          INSERT INTO flange_pt_ratings (pressure_class_id, material_group, temperature_celsius, max_pressure_bar)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (pressure_class_id, material_group, temperature_celsius)
          DO UPDATE SET max_pressure_bar = $4
          `,
          [classId, materialGroup, temp, pressureBar],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn("Removing SS304 and SS316 P-T ratings for ASME B16.47...");

    const b1647AResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47 A'`,
    );
    const b1647BResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47 B'`,
    );

    const standardIds = [b1647AResult[0]?.id, b1647BResult[0]?.id].filter(Boolean);

    for (const standardId of standardIds) {
      const classIds = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes WHERE "standardId" = ${standardId}
      `);

      for (const { id } of classIds) {
        await queryRunner.query(`
          DELETE FROM flange_pt_ratings
          WHERE pressure_class_id = ${id}
          AND material_group IN ('Stainless Steel 316 (Group 2.2)', 'Stainless Steel 304 (Group 2.1)')
        `);
      }
    }
  }
}
