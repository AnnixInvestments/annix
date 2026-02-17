import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFerriticMartensiticPTRatings1778000000000 implements MigrationInterface {
  name = "AddFerriticMartensiticPTRatings1778000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding Ferritic and Martensitic Stainless Steel P-T ratings...");

    const insertPtRating = async (
      classId: number,
      materialGroup: string,
      tempC: number,
      pressureBar: number,
    ) => {
      await queryRunner.query(
        `
        INSERT INTO flange_pt_ratings (pressure_class_id, material_group, temperature_celsius, max_pressure_bar)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (pressure_class_id, material_group, temperature_celsius)
        DO UPDATE SET max_pressure_bar = $4
      `,
        [classId, materialGroup, tempC, pressureBar],
      );
    };

    const b165Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.5'`,
    );
    if (b165Result.length === 0) {
      console.warn("ASME B16.5 standard not found, skipping...");
      return;
    }
    const standardId = b165Result[0].id;

    const pressureClasses = await queryRunner.query(`
      SELECT id, designation FROM flange_pressure_classes
      WHERE "standardId" = ${standardId}
    `);

    const classMap: Record<string, number> = {};
    for (const pc of pressureClasses) {
      classMap[pc.designation] = pc.id;
    }

    // Ferritic Stainless Steel (Group 7.1) - TP405, TP409, TP430, TP434
    // Based on ASME B16.5 Table 2-1.7 for Group 1.7 materials
    // Ferritic has lower allowable stresses than austenitic at high temps
    const ferriticData: Record<string, Record<number, number>> = {
      "150": {
        "-29": 19.6,
        "38": 19.6,
        "93": 17.9,
        "149": 16.5,
        "204": 15.5,
        "260": 14.8,
        "316": 14.2,
        "371": 13.4,
        "427": 11.8,
        "454": 9.7,
        "482": 7.2,
        "510": 5.2,
        "538": 3.4,
      },
      "300": {
        "-29": 51.1,
        "38": 51.1,
        "93": 46.6,
        "149": 43.0,
        "204": 40.4,
        "260": 38.5,
        "316": 37.0,
        "371": 34.9,
        "427": 30.7,
        "454": 25.2,
        "482": 18.7,
        "510": 13.5,
        "538": 8.8,
      },
      "400": {
        "-29": 68.1,
        "38": 68.1,
        "93": 62.2,
        "149": 57.3,
        "204": 53.9,
        "260": 51.3,
        "316": 49.3,
        "371": 46.5,
        "427": 41.0,
        "454": 33.6,
        "482": 24.9,
        "510": 18.0,
        "538": 11.8,
      },
      "600": {
        "-29": 102.1,
        "38": 102.1,
        "93": 93.2,
        "149": 86.0,
        "204": 80.8,
        "260": 77.0,
        "316": 74.0,
        "371": 69.8,
        "427": 61.4,
        "454": 50.4,
        "482": 37.4,
        "510": 27.0,
        "538": 17.7,
      },
      "900": {
        "-29": 153.2,
        "38": 153.2,
        "93": 139.9,
        "149": 129.0,
        "204": 121.2,
        "260": 115.5,
        "316": 111.0,
        "371": 104.7,
        "427": 92.2,
        "454": 75.6,
        "482": 56.1,
        "510": 40.5,
        "538": 26.5,
      },
      "1500": {
        "-29": 255.3,
        "38": 255.3,
        "93": 233.1,
        "149": 215.0,
        "204": 202.0,
        "260": 192.5,
        "316": 185.0,
        "371": 174.5,
        "427": 153.6,
        "454": 126.0,
        "482": 93.5,
        "510": 67.5,
        "538": 44.2,
      },
      "2500": {
        "-29": 425.5,
        "38": 425.5,
        "93": 388.5,
        "149": 358.3,
        "204": 336.7,
        "260": 320.8,
        "316": 308.3,
        "371": 290.8,
        "427": 256.0,
        "454": 210.0,
        "482": 155.8,
        "510": 112.5,
        "538": 73.7,
      },
    };

    // Martensitic Stainless Steel (Group 6.1) - TP410, TP410S
    // Based on ASME B16.5 Table 2-1.6 for Group 1.6 materials
    // Martensitic has lower ductility and generally lower ratings than ferritic
    const martensiticData: Record<string, Record<number, number>> = {
      "150": {
        "-29": 19.6,
        "38": 19.6,
        "93": 17.2,
        "149": 15.8,
        "204": 14.8,
        "260": 14.1,
        "316": 13.4,
        "371": 12.4,
        "427": 10.3,
        "454": 7.9,
        "482": 5.5,
      },
      "300": {
        "-29": 51.1,
        "38": 51.1,
        "93": 44.8,
        "149": 41.2,
        "204": 38.5,
        "260": 36.7,
        "316": 34.9,
        "371": 32.3,
        "427": 26.8,
        "454": 20.6,
        "482": 14.3,
      },
      "400": {
        "-29": 68.1,
        "38": 68.1,
        "93": 59.7,
        "149": 54.9,
        "204": 51.3,
        "260": 48.9,
        "316": 46.5,
        "371": 43.1,
        "427": 35.7,
        "454": 27.4,
        "482": 19.1,
      },
      "600": {
        "-29": 102.1,
        "38": 102.1,
        "93": 89.6,
        "149": 82.4,
        "204": 77.0,
        "260": 73.4,
        "316": 69.8,
        "371": 64.6,
        "427": 53.6,
        "454": 41.2,
        "482": 28.6,
      },
      "900": {
        "-29": 153.2,
        "38": 153.2,
        "93": 134.4,
        "149": 123.6,
        "204": 115.5,
        "260": 110.1,
        "316": 104.7,
        "371": 96.9,
        "427": 80.4,
        "454": 61.7,
        "482": 42.9,
      },
      "1500": {
        "-29": 255.3,
        "38": 255.3,
        "93": 224.0,
        "149": 206.0,
        "204": 192.5,
        "260": 183.5,
        "316": 174.5,
        "371": 161.5,
        "427": 134.0,
        "454": 102.9,
        "482": 71.5,
      },
      "2500": {
        "-29": 425.5,
        "38": 425.5,
        "93": 373.3,
        "149": 343.3,
        "204": 320.8,
        "260": 305.8,
        "316": 290.8,
        "371": 269.2,
        "427": 223.3,
        "454": 171.5,
        "482": 119.2,
      },
    };

    // Insert Ferritic Stainless Steel P-T ratings
    console.warn("Adding Ferritic Stainless Steel (Group 7.1) P-T ratings...");
    for (const [className, temps] of Object.entries(ferriticData)) {
      const classId = classMap[className];
      if (!classId) continue;

      for (const [tempStr, pressure] of Object.entries(temps)) {
        const temp = parseInt(tempStr, 10);
        await insertPtRating(classId, "Ferritic Stainless Steel (Group 7.1)", temp, pressure);
      }
    }

    // Insert Martensitic Stainless Steel P-T ratings
    console.warn("Adding Martensitic Stainless Steel (Group 6.1) P-T ratings...");
    for (const [className, temps] of Object.entries(martensiticData)) {
      const classId = classMap[className];
      if (!classId) continue;

      for (const [tempStr, pressure] of Object.entries(temps)) {
        const temp = parseInt(tempStr, 10);
        await insertPtRating(classId, "Martensitic Stainless Steel (Group 6.1)", temp, pressure);
      }
    }

    // Also add to ASME B16.47 if available
    const b1647Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code LIKE 'ASME B16.47%'`,
    );

    for (const standard of b1647Result) {
      const b1647Classes = await queryRunner.query(
        `SELECT id, designation FROM flange_pressure_classes WHERE "standardId" = $1`,
        [standard.id],
      );

      for (const pc of b1647Classes) {
        const designation = pc.designation;

        // Map B16.47 classes to B16.5 equivalent P-T data
        const b165Equiv =
          designation === "75"
            ? "150"
            : designation === "150"
              ? "150"
              : designation === "300"
                ? "300"
                : designation === "400"
                  ? "400"
                  : designation === "600"
                    ? "600"
                    : designation === "900"
                      ? "900"
                      : null;

        if (b165Equiv && ferriticData[b165Equiv]) {
          for (const [tempStr, pressure] of Object.entries(ferriticData[b165Equiv])) {
            const temp = parseInt(tempStr, 10);
            // Adjust pressure for Class 75 (half of Class 150)
            const adjustedPressure = designation === "75" ? pressure * 0.5 : pressure;
            await insertPtRating(
              pc.id,
              "Ferritic Stainless Steel (Group 7.1)",
              temp,
              adjustedPressure,
            );
          }
        }

        if (b165Equiv && martensiticData[b165Equiv]) {
          for (const [tempStr, pressure] of Object.entries(martensiticData[b165Equiv])) {
            const temp = parseInt(tempStr, 10);
            const adjustedPressure = designation === "75" ? pressure * 0.5 : pressure;
            await insertPtRating(
              pc.id,
              "Martensitic Stainless Steel (Group 6.1)",
              temp,
              adjustedPressure,
            );
          }
        }
      }
    }

    console.warn("Ferritic and Martensitic Stainless Steel P-T ratings added successfully.");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM flange_pt_ratings
      WHERE material_group IN (
        'Ferritic Stainless Steel (Group 7.1)',
        'Martensitic Stainless Steel (Group 6.1)'
      )
    `);
  }
}
