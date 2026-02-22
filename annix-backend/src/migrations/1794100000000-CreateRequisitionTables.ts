import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRequisitionTables1794100000000 implements MigrationInterface {
  name = "CreateRequisitionTables1794100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "requisitions" (
        "id" SERIAL PRIMARY KEY,
        "requisition_number" VARCHAR(100) NOT NULL,
        "job_card_id" INTEGER NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
        "notes" TEXT,
        "created_by" VARCHAR(255),
        "company_id" INTEGER NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_requisition_job_card" FOREIGN KEY ("job_card_id")
          REFERENCES "job_cards"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_requisition_company" FOREIGN KEY ("company_id")
          REFERENCES "stock_control_companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_requisition_company" ON "requisitions" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_requisition_job_card" ON "requisitions" ("job_card_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_requisition_status" ON "requisitions" ("status")
    `);

    await queryRunner.query(`
      CREATE TABLE "requisition_items" (
        "id" SERIAL PRIMARY KEY,
        "requisition_id" INTEGER NOT NULL,
        "stock_item_id" INTEGER,
        "product_name" VARCHAR(255) NOT NULL,
        "area" VARCHAR(50),
        "litres_required" NUMERIC(12,2) NOT NULL,
        "pack_size_litres" NUMERIC(12,2) NOT NULL DEFAULT 20,
        "packs_to_order" INTEGER NOT NULL,
        "company_id" INTEGER NOT NULL,
        CONSTRAINT "FK_requisition_item_requisition" FOREIGN KEY ("requisition_id")
          REFERENCES "requisitions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_requisition_item_stock_item" FOREIGN KEY ("stock_item_id")
          REFERENCES "stock_items"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_requisition_item_company" FOREIGN KEY ("company_id")
          REFERENCES "stock_control_companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_requisition_item_company" ON "requisition_items" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_requisition_item_requisition" ON "requisition_items" ("requisition_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_requisition_item_requisition"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_requisition_item_company"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "requisition_items"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_requisition_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_requisition_job_card"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_requisition_company"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "requisitions"`);
  }
}
