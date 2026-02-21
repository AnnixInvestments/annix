import { MigrationInterface, QueryRunner } from "typeorm";

export class FixBs4504PTRatingsData1793600000000 implements MigrationInterface {
  name = "FixBs4504PTRatingsData1793600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Ensuring BS 4504 P-T ratings exist for all pressure classes...");

    const bs4504Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 4504'`,
    );

    if (bs4504Result.length === 0) {
      console.warn("BS 4504 standard not found, skipping...");
      return;
    }

    const standardId = bs4504Result[0].id;

    const pressureClasses = await queryRunner.query(
      `SELECT id, designation FROM flange_pressure_classes WHERE "standardId" = $1`,
      [standardId],
    );

    console.warn(`Found ${pressureClasses.length} BS 4504 pressure classes`);

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

    const materialGroups = ["Carbon Steel", "Carbon Steel A105 (Group 1.1)"];

    for (const pc of pressureClasses) {
      const match = pc.designation.match(/^(\d+)/);
      if (!match) {
        console.warn(`Skipping ${pc.designation} - no numeric prefix found`);
        continue;
      }

      const basePN = parseInt(match[1], 10);

      for (const materialGroup of materialGroups) {
        for (const [temp, factor] of carbonSteelDerating) {
          const maxPressureBar = Math.round(basePN * factor * 10) / 10;

          await queryRunner.query(
            `
            INSERT INTO flange_pt_ratings (pressure_class_id, material_group, temperature_celsius, max_pressure_bar)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (pressure_class_id, material_group, temperature_celsius)
            DO UPDATE SET max_pressure_bar = $4
            `,
            [pc.id, materialGroup, temp, maxPressureBar],
          );
        }
      }

      console.warn(`Added/updated P-T ratings for ${pc.designation} (PN${basePN})`);
    }

    const count = await queryRunner.query(
      `
      SELECT COUNT(*) as count FROM flange_pt_ratings
      WHERE pressure_class_id IN (
        SELECT id FROM flange_pressure_classes WHERE "standardId" = $1
      )
      `,
      [standardId],
    );

    console.warn(`BS 4504 now has ${count[0].count} P-T rating entries`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn("This migration only ensures data exists, no rollback needed");
  }
}
