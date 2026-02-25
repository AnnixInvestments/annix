import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateForgedFittingClassRatings1796100000000 implements MigrationInterface {
  name = "CreateForgedFittingClassRatings1796100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forged_fitting_class_ratings (
        id SERIAL PRIMARY KEY,
        standard VARCHAR(20) NOT NULL,
        fitting_class INT NOT NULL,
        connection_type VARCHAR(10) NOT NULL,
        material_group VARCHAR(10) NOT NULL,
        temperature_c INT NOT NULL,
        max_pressure_bar DECIMAL(7,2) NOT NULL,
        socket_depth_multiplier DECIMAL(3,1),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(standard, fitting_class, connection_type, material_group, temperature_c)
      )
    `);

    await this.seedForgedFittingRatings(queryRunner);
    console.log("Forged fitting class ratings table created and seeded successfully.");
  }

  private async seedForgedFittingRatings(queryRunner: QueryRunner): Promise<void> {
    const classes = [2000, 3000, 6000, 9000];
    const socketDepths: Record<number, number> = { 2000: 0.75, 3000: 1.0, 6000: 1.5, 9000: 2.0 };

    const swRatings: Record<
      number,
      Array<{
        tempC: number;
        class2000: number;
        class3000: number;
        class6000: number;
        class9000: number;
      }>
    > = {
      1: [
        { tempC: -29, class2000: 139, class3000: 209, class6000: 418, class9000: 620 },
        { tempC: 38, class2000: 139, class3000: 209, class6000: 418, class9000: 620 },
        { tempC: 100, class2000: 128, class3000: 192, class6000: 384, class9000: 570 },
        { tempC: 150, class2000: 119, class3000: 179, class6000: 358, class9000: 531 },
        { tempC: 200, class2000: 111, class3000: 166, class6000: 333, class9000: 494 },
        { tempC: 250, class2000: 102, class3000: 153, class6000: 307, class9000: 455 },
        { tempC: 300, class2000: 90, class3000: 135, class6000: 270, class9000: 400 },
        { tempC: 350, class2000: 76, class3000: 114, class6000: 228, class9000: 338 },
        { tempC: 400, class2000: 56, class3000: 84, class6000: 168, class9000: 249 },
        { tempC: 425, class2000: 45, class3000: 68, class6000: 136, class9000: 202 },
        { tempC: 450, class2000: 34, class3000: 51, class6000: 102, class9000: 151 },
        { tempC: 475, class2000: 22, class3000: 33, class6000: 66, class9000: 98 },
      ],
    };

    const thrdRatings: Record<
      number,
      Array<{
        tempC: number;
        class2000: number;
        class3000: number;
        class6000: number;
        class9000: number;
      }>
    > = {
      1: [
        { tempC: -29, class2000: 93, class3000: 139, class6000: 279, class9000: 413 },
        { tempC: 38, class2000: 93, class3000: 139, class6000: 279, class9000: 413 },
        { tempC: 100, class2000: 85, class3000: 128, class6000: 256, class9000: 380 },
        { tempC: 150, class2000: 79, class3000: 119, class6000: 239, class9000: 354 },
        { tempC: 200, class2000: 74, class3000: 111, class6000: 222, class9000: 329 },
        { tempC: 250, class2000: 68, class3000: 102, class6000: 204, class9000: 303 },
        { tempC: 300, class2000: 60, class3000: 90, class6000: 180, class9000: 267 },
        { tempC: 350, class2000: 51, class3000: 76, class6000: 152, class9000: 225 },
        { tempC: 400, class2000: 37, class3000: 56, class6000: 112, class9000: 166 },
        { tempC: 425, class2000: 30, class3000: 45, class6000: 91, class9000: 135 },
        { tempC: 450, class2000: 23, class3000: 34, class6000: 68, class9000: 101 },
        { tempC: 475, class2000: 15, class3000: 22, class6000: 44, class9000: 65 },
      ],
    };

    for (const rating of swRatings[1]) {
      for (const fittingClass of classes) {
        const pressure =
          fittingClass === 2000
            ? rating.class2000
            : fittingClass === 3000
              ? rating.class3000
              : fittingClass === 6000
                ? rating.class6000
                : rating.class9000;
        await queryRunner.query(`
          INSERT INTO forged_fitting_class_ratings (standard, fitting_class, connection_type, material_group, temperature_c, max_pressure_bar, socket_depth_multiplier)
          VALUES ('ASME B16.11', ${fittingClass}, 'SW', '1.1', ${rating.tempC}, ${pressure}, ${socketDepths[fittingClass]})
        `);
      }
    }

    for (const rating of thrdRatings[1]) {
      for (const fittingClass of classes) {
        const pressure =
          fittingClass === 2000
            ? rating.class2000
            : fittingClass === 3000
              ? rating.class3000
              : fittingClass === 6000
                ? rating.class6000
                : rating.class9000;
        await queryRunner.query(`
          INSERT INTO forged_fitting_class_ratings (standard, fitting_class, connection_type, material_group, temperature_c, max_pressure_bar, socket_depth_multiplier)
          VALUES ('ASME B16.11', ${fittingClass}, 'THRD', '1.1', ${rating.tempC}, ${pressure}, NULL)
        `);
      }
    }

    const stainlessSwRatings = [
      { tempC: -254, class3000: 209, class6000: 418 },
      { tempC: 38, class3000: 209, class6000: 418 },
      { tempC: 100, class3000: 176, class6000: 352 },
      { tempC: 200, class3000: 145, class6000: 290 },
      { tempC: 300, class3000: 127, class6000: 254 },
      { tempC: 400, class3000: 116, class6000: 232 },
      { tempC: 500, class3000: 106, class6000: 212 },
      { tempC: 538, class3000: 101, class6000: 202 },
    ];

    for (const rating of stainlessSwRatings) {
      await queryRunner.query(`
        INSERT INTO forged_fitting_class_ratings (standard, fitting_class, connection_type, material_group, temperature_c, max_pressure_bar, socket_depth_multiplier)
        VALUES ('ASME B16.11', 3000, 'SW', '2.1', ${rating.tempC}, ${rating.class3000}, 1.0)
      `);
      await queryRunner.query(`
        INSERT INTO forged_fitting_class_ratings (standard, fitting_class, connection_type, material_group, temperature_c, max_pressure_bar, socket_depth_multiplier)
        VALUES ('ASME B16.11', 6000, 'SW', '2.1', ${rating.tempC}, ${rating.class6000}, 1.5)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS forged_fitting_class_ratings");
  }
}
