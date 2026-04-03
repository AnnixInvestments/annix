import { MigrationInterface, QueryRunner } from "typeorm";

export class ExtendFastenerEntities1797000000000 implements MigrationInterface {
  name = "ExtendFastenerEntities1797000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.extendBoltsTable(queryRunner);
    await this.extendNutMassesTable(queryRunner);
    await this.extendWashersTable(queryRunner);
    await this.createThreadedInsertsTable(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS threaded_inserts");
    await queryRunner.query("ALTER TABLE washers DROP COLUMN IF EXISTS standard");
    await queryRunner.query("ALTER TABLE nut_masses DROP COLUMN IF EXISTS standard");
    await queryRunner.query("ALTER TABLE bolts DROP COLUMN IF EXISTS point_type");
    await queryRunner.query("ALTER TABLE bolts DROP COLUMN IF EXISTS drive_type");
    await queryRunner.query("ALTER TABLE bolts DROP COLUMN IF EXISTS category");
    await queryRunner.query("ALTER TABLE bolts DROP COLUMN IF EXISTS standard");
  }

  private async extendBoltsTable(queryRunner: QueryRunner): Promise<void> {
    const addColumnIfNotExists = async (column: string, definition: string) => {
      const exists = await queryRunner.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'bolts' AND column_name = '${column}'`,
      );
      if (exists.length === 0) {
        await queryRunner.query(`ALTER TABLE bolts ADD COLUMN ${column} ${definition}`);
      }
    };

    await addColumnIfNotExists("standard", "VARCHAR(100)");
    await addColumnIfNotExists("category", "VARCHAR(50)");
    await addColumnIfNotExists("drive_type", "VARCHAR(50)");
    await addColumnIfNotExists("point_type", "VARCHAR(50)");
  }

  private async extendNutMassesTable(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'nut_masses' AND column_name = 'standard'",
    );
    if (exists.length === 0) {
      await queryRunner.query("ALTER TABLE nut_masses ADD COLUMN standard VARCHAR(100)");
    }
  }

  private async extendWashersTable(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'washers' AND column_name = 'standard'",
    );
    if (exists.length === 0) {
      await queryRunner.query("ALTER TABLE washers ADD COLUMN standard VARCHAR(100)");
    }
  }

  private async createThreadedInsertsTable(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS threaded_inserts (
        id SERIAL PRIMARY KEY,
        designation VARCHAR(20) NOT NULL,
        insert_type VARCHAR(50) NOT NULL,
        material VARCHAR(50) NOT NULL,
        standard VARCHAR(100),
        outer_diameter_mm FLOAT,
        length_mm FLOAT,
        mass_kg FLOAT
      )
    `);
  }
}
