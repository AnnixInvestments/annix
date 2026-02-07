import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBs10MaterialPTRatings1772100000000 implements MigrationInterface {
  name = "AddBs10MaterialPTRatings1772100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding BS 10 material-specific P-T ratings...");

    const bs10Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 10'`,
    );
    if (bs10Result.length === 0) {
      console.warn("BS 10 standard not found, skipping...");
      return;
    }
    const standardId = bs10Result[0].id;

    const pressureClasses = await queryRunner.query(`
      SELECT id, designation FROM flange_pressure_classes
      WHERE "standardId" = ${standardId}
    `);

    const classMap: Record<string, number> = {};
    for (const pc of pressureClasses) {
      classMap[pc.designation] = pc.id;
    }

    const carbonSteelData: Record<string, Record<number, number>> = {
      "T/D": {
        "-29": 6.9,
        "50": 6.9,
        "100": 6.5,
        "150": 6.0,
        "200": 5.5,
        "250": 4.8,
        "300": 4.0,
      },
      "T/E": {
        "-29": 10.3,
        "50": 10.3,
        "100": 9.7,
        "150": 9.0,
        "200": 8.2,
        "250": 7.2,
        "300": 6.0,
      },
      "T/F": {
        "-29": 13.8,
        "50": 13.8,
        "100": 12.9,
        "150": 12.0,
        "200": 10.9,
        "250": 9.6,
        "300": 8.0,
      },
      "T/H": {
        "-29": 17.2,
        "50": 17.2,
        "100": 16.2,
        "150": 15.0,
        "200": 13.6,
        "250": 12.0,
        "300": 10.0,
      },
      "T/J": {
        "-29": 20.7,
        "50": 20.7,
        "100": 19.4,
        "150": 18.0,
        "200": 16.4,
        "250": 14.4,
        "300": 12.0,
      },
      "T/K": {
        "-29": 31.0,
        "50": 31.0,
        "100": 29.1,
        "150": 27.0,
        "200": 24.5,
        "250": 21.5,
        "300": 18.0,
      },
    };

    const ss316Data: Record<string, Record<number, number>> = {
      "T/D": {
        "-29": 6.9,
        "50": 6.9,
        "100": 6.2,
        "150": 5.7,
        "200": 5.2,
        "250": 4.6,
        "300": 4.0,
        "350": 3.4,
        "400": 2.9,
      },
      "T/E": {
        "-29": 10.3,
        "50": 10.3,
        "100": 9.3,
        "150": 8.6,
        "200": 7.7,
        "250": 6.9,
        "300": 6.0,
        "350": 5.2,
        "400": 4.3,
      },
      "T/F": {
        "-29": 13.8,
        "50": 13.8,
        "100": 12.4,
        "150": 11.5,
        "200": 10.3,
        "250": 9.2,
        "300": 8.0,
        "350": 6.9,
        "400": 5.8,
      },
      "T/H": {
        "-29": 17.2,
        "50": 17.2,
        "100": 15.5,
        "150": 14.3,
        "200": 12.9,
        "250": 11.5,
        "300": 10.0,
        "350": 8.6,
        "400": 7.2,
      },
      "T/J": {
        "-29": 20.7,
        "50": 20.7,
        "100": 18.6,
        "150": 17.2,
        "200": 15.5,
        "250": 13.8,
        "300": 12.0,
        "350": 10.3,
        "400": 8.6,
      },
      "T/K": {
        "-29": 31.0,
        "50": 31.0,
        "100": 27.9,
        "150": 25.8,
        "200": 23.3,
        "250": 20.7,
        "300": 18.0,
        "350": 15.5,
        "400": 12.9,
      },
    };

    const ss304Data: Record<string, Record<number, number>> = {
      "T/D": {
        "-29": 6.9,
        "50": 6.9,
        "100": 6.3,
        "150": 5.9,
        "200": 5.3,
        "250": 4.7,
        "300": 4.1,
        "350": 3.7,
        "400": 3.2,
        "450": 2.8,
      },
      "T/E": {
        "-29": 10.3,
        "50": 10.3,
        "100": 9.5,
        "150": 8.8,
        "200": 8.0,
        "250": 7.0,
        "300": 6.2,
        "350": 5.5,
        "400": 4.8,
        "450": 4.1,
      },
      "T/F": {
        "-29": 13.8,
        "50": 13.8,
        "100": 12.7,
        "150": 11.7,
        "200": 10.6,
        "250": 9.4,
        "300": 8.3,
        "350": 7.3,
        "400": 6.4,
        "450": 5.5,
      },
      "T/H": {
        "-29": 17.2,
        "50": 17.2,
        "100": 15.8,
        "150": 14.6,
        "200": 13.3,
        "250": 11.8,
        "300": 10.3,
        "350": 9.1,
        "400": 8.0,
        "450": 6.9,
      },
      "T/J": {
        "-29": 20.7,
        "50": 20.7,
        "100": 19.0,
        "150": 17.6,
        "200": 15.9,
        "250": 14.1,
        "300": 12.4,
        "350": 11.0,
        "400": 9.7,
        "450": 8.3,
      },
      "T/K": {
        "-29": 31.0,
        "50": 31.0,
        "100": 28.5,
        "150": 26.4,
        "200": 23.9,
        "250": 21.2,
        "300": 18.6,
        "350": 16.5,
        "400": 14.5,
        "450": 12.4,
      },
    };

    const f11Data: Record<string, Record<number, number>> = {
      "T/D": {
        "-29": 6.9,
        "50": 6.9,
        "100": 6.7,
        "150": 6.4,
        "200": 6.2,
        "250": 6.0,
        "300": 5.7,
        "350": 5.2,
        "400": 4.6,
        "450": 3.9,
        "500": 3.1,
      },
      "T/E": {
        "-29": 10.3,
        "50": 10.3,
        "100": 10.0,
        "150": 9.6,
        "200": 9.3,
        "250": 9.0,
        "300": 8.5,
        "350": 7.8,
        "400": 6.9,
        "450": 5.9,
        "500": 4.6,
      },
      "T/F": {
        "-29": 13.8,
        "50": 13.8,
        "100": 13.4,
        "150": 12.9,
        "200": 12.4,
        "250": 12.0,
        "300": 11.3,
        "350": 10.4,
        "400": 9.2,
        "450": 7.8,
        "500": 6.2,
      },
      "T/H": {
        "-29": 17.2,
        "50": 17.2,
        "100": 16.7,
        "150": 16.1,
        "200": 15.5,
        "250": 14.9,
        "300": 14.1,
        "350": 12.9,
        "400": 11.5,
        "450": 9.8,
        "500": 7.7,
      },
      "T/J": {
        "-29": 20.7,
        "50": 20.7,
        "100": 20.1,
        "150": 19.3,
        "200": 18.6,
        "250": 17.9,
        "300": 17.0,
        "350": 15.5,
        "400": 13.8,
        "450": 11.7,
        "500": 9.3,
      },
      "T/K": {
        "-29": 31.0,
        "50": 31.0,
        "100": 30.1,
        "150": 28.9,
        "200": 27.9,
        "250": 26.9,
        "300": 25.4,
        "350": 23.3,
        "400": 20.7,
        "450": 17.6,
        "500": 13.9,
      },
    };

    await this.insertPTRatings(
      queryRunner,
      classMap,
      "Carbon Steel A105 (Group 1.1)",
      carbonSteelData,
    );
    await this.insertPTRatings(queryRunner, classMap, "Stainless Steel 316 (Group 2.2)", ss316Data);
    await this.insertPTRatings(queryRunner, classMap, "Stainless Steel 304 (Group 2.1)", ss304Data);
    await this.insertPTRatings(queryRunner, classMap, "Alloy Steel A182 F11 (Group 2.3)", f11Data);

    console.warn("BS 10 material P-T ratings added successfully.");
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
    console.warn(`Added BS 10 P-T ratings for ${materialGroup}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const bs10Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 10'`,
    );
    if (bs10Result.length === 0) return;
    const standardId = bs10Result[0].id;

    const materials = [
      "Carbon Steel A105 (Group 1.1)",
      "Stainless Steel 316 (Group 2.2)",
      "Stainless Steel 304 (Group 2.1)",
      "Alloy Steel A182 F11 (Group 2.3)",
    ];

    for (const material of materials) {
      await queryRunner.query(
        `
        DELETE FROM flange_pt_ratings
        WHERE pressure_class_id IN (SELECT id FROM flange_pressure_classes WHERE "standardId" = $1)
        AND material_group = $2
      `,
        [standardId, material],
      );
    }
  }
}
