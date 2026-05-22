import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChemicalSupplierDocuments1820100000201 implements MigrationInterface {
  name = "CreateChemicalSupplierDocuments1820100000201";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chemical_supplier_documents" (
        "id" SERIAL NOT NULL,
        "firebase_uid" varchar(100) NOT NULL,
        "supplier_company_id" int NOT NULL,
        "delivery_note_number" varchar(255),
        "batch_number" varchar(255),
        "product_name" varchar(255),
        "document_path" varchar(500) NOT NULL,
        "document_hash" varchar(64),
        "processing_status" varchar(30) NOT NULL DEFAULT 'PENDING',
        "extracted_data" jsonb,
        "review_notes" text,
        "approved_by" varchar(100),
        "approved_at" TIMESTAMP,
        "created_by" varchar(100),
        "version" int NOT NULL DEFAULT 1,
        "previous_version_id" int,
        "version_status" varchar(30) NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chemical_supplier_documents" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_chemical_supplier_documents_firebase_uid" UNIQUE ("firebase_uid")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "chemical_supplier_documents"
          ADD CONSTRAINT "FK_chemical_supplier_documents_supplier_company"
          FOREIGN KEY ("supplier_company_id") REFERENCES "rubber_company"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chemical_supplier_documents_supplier"
        ON "chemical_supplier_documents" ("supplier_company_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chemical_supplier_documents_delivery_note"
        ON "chemical_supplier_documents" ("delivery_note_number")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chemical_supplier_documents_batch"
        ON "chemical_supplier_documents" ("batch_number")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chemical_supplier_documents"`);
  }
}
