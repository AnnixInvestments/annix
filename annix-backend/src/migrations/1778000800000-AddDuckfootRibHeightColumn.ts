import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDuckfootRibHeightColumn1778000800000 implements MigrationInterface {
  name = "AddDuckfootRibHeightColumn1778000800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding rib_height_h_mm column to duckfoot_elbow_dimensions...");

    await queryRunner.query(`
      ALTER TABLE duckfoot_elbow_dimensions
      ADD COLUMN IF NOT EXISTS rib_height_h_mm DECIMAL(8,2)
    `);

    const ribHeightData = [
      { nb: 200, h: 255.0 },
      { nb: 250, h: 280.0 },
      { nb: 300, h: 305.0 },
      { nb: 350, h: 330.0 },
      { nb: 400, h: 355.0 },
      { nb: 450, h: 380.0 },
      { nb: 500, h: 405.0 },
      { nb: 550, h: 430.0 },
      { nb: 600, h: 460.0 },
      { nb: 650, h: 485.0 },
      { nb: 700, h: 510.0 },
      { nb: 750, h: 535.0 },
      { nb: 800, h: 560.0 },
      { nb: 850, h: 585.0 },
      { nb: 900, h: 610.0 },
    ];

    for (const d of ribHeightData) {
      await queryRunner.query(`
        UPDATE duckfoot_elbow_dimensions
        SET rib_height_h_mm = ${d.h}
        WHERE nominal_bore_mm = ${d.nb}
      `);
    }

    await queryRunner.query(`
      ALTER TABLE duckfoot_elbow_dimensions
      ALTER COLUMN rib_height_h_mm SET NOT NULL
    `);

    console.warn("Duckfoot rib height column added and populated.");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE duckfoot_elbow_dimensions
      DROP COLUMN IF EXISTS rib_height_h_mm
    `);
  }
}
