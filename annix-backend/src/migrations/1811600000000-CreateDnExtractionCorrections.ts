import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDnExtractionCorrections1811600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dn_extraction_corrections" (
        "id" SERIAL PRIMARY KEY,
        "company_id" integer NOT NULL,
        "supplier_name" varchar(255) NOT NULL,
        "delivery_note_id" integer NOT NULL,
        "field_name" varchar(100) NOT NULL,
        "original_value" text,
        "corrected_value" text NOT NULL,
        "item_description" text,
        "item_index" integer,
        "corrected_by" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_dn_correction_company" FOREIGN KEY ("company_id")
          REFERENCES "stock_control_companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dn_correction_delivery_note" FOREIGN KEY ("delivery_note_id")
          REFERENCES "delivery_notes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dn_correction_user" FOREIGN KEY ("corrected_by")
          REFERENCES "stock_control_users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dn_correction_company_supplier"
        ON "dn_extraction_corrections" ("company_id", "supplier_name")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dn_extraction_corrections"`);
  }
}
