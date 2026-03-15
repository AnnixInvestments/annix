import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentVersioning1807000000041 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = ["rubber_tax_invoices", "rubber_delivery_notes", "rubber_supplier_cocs"];

    for (const table of tables) {
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = '${table}'
        ) AS exists
      `);
      if (!tableExists[0]?.exists) continue;

      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
          ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "previous_version_id" integer;
          ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "version_status" varchar(30) NOT NULL DEFAULT 'ACTIVE';
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$
      `);

      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "${table}"
            ADD CONSTRAINT "FK_${table}_previous_version"
            FOREIGN KEY ("previous_version_id") REFERENCES "${table}"("id")
            ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_${table}_version_status"
          ON "${table}" ("version_status")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = ["rubber_tax_invoices", "rubber_delivery_notes", "rubber_supplier_cocs"];

    for (const table of tables) {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${table}_version_status"`);
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "FK_${table}_previous_version"`,
      );
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "version_status"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "previous_version_id"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "version"`);
    }
  }
}
