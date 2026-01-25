import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixBS4504PNVariants1777700000001 implements MigrationInterface {
  name = 'FixBS4504PNVariants1777700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      'Adding P-T data for BS 4504 PN variants (PN16/7, PN25/7, PN40/7)...',
    );

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

    const bs4504Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 4504'`,
    );

    if (bs4504Result.length > 0) {
      const standardId = bs4504Result[0].id;

      const pnClasses = await queryRunner.query(
        `
        SELECT id, designation FROM flange_pressure_classes
        WHERE "standardId" = $1
        AND designation LIKE 'PN%'
      `,
        [standardId],
      );

      const carbonSteelDerating: [number, number][] = [
        [-29, 1.0],
        [20, 1.0],
        [50, 1.0],
        [100, 0.92],
        [150, 0.95],
        [200, 0.91],
        [250, 0.83],
        [300, 0.76],
        [350, 0.71],
        [400, 0.64],
      ];

      const ss304Derating: [number, number][] = [
        [-29, 1.0],
        [20, 1.0],
        [50, 1.0],
        [100, 1.0],
        [150, 0.97],
        [200, 0.93],
        [250, 0.88],
        [300, 0.84],
        [350, 0.8],
        [400, 0.76],
        [450, 0.69],
        [500, 0.6],
      ];

      const ss316Derating: [number, number][] = [
        [-29, 1.0],
        [20, 1.0],
        [50, 1.0],
        [100, 1.0],
        [150, 0.98],
        [200, 0.94],
        [250, 0.9],
        [300, 0.86],
        [350, 0.82],
        [400, 0.78],
        [450, 0.72],
        [500, 0.64],
      ];

      for (const cls of pnClasses) {
        const match = cls.designation.match(/^PN(\d+)/);
        if (match) {
          const basePN = parseInt(match[1], 10);

          for (const [temp, factor] of carbonSteelDerating) {
            await insertPtRating(
              cls.id,
              'Carbon Steel',
              temp,
              Math.round(basePN * factor * 10) / 10,
            );
            await insertPtRating(
              cls.id,
              'Carbon Steel A105 (Group 1.1)',
              temp,
              Math.round(basePN * factor * 10) / 10,
            );
          }

          for (const [temp, factor] of ss304Derating) {
            await insertPtRating(
              cls.id,
              'Stainless Steel 304 (Group 2.1)',
              temp,
              Math.round(basePN * factor * 10) / 10,
            );
          }

          for (const [temp, factor] of ss316Derating) {
            await insertPtRating(
              cls.id,
              'Stainless Steel 316 (Group 2.2)',
              temp,
              Math.round(basePN * factor * 10) / 10,
            );
          }

          console.warn(`Added P-T data for ${cls.designation}`);
        }
      }
    }

    console.warn('BS 4504 PN variants P-T data complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const bs4504Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 4504'`,
    );

    if (bs4504Result.length > 0) {
      const standardId = bs4504Result[0].id;

      await queryRunner.query(
        `
        DELETE FROM flange_pt_ratings
        WHERE pressure_class_id IN (
          SELECT id FROM flange_pressure_classes
          WHERE "standardId" = $1 AND designation LIKE 'PN%'
        )
      `,
        [standardId],
      );
    }
  }
}
