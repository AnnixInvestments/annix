import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockIssuancesTable1799300000000 implements MigrationInterface {
  name = "CreateStockIssuancesTable1799300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "stock_issuances" (
        "id" SERIAL PRIMARY KEY,
        "company_id" integer NOT NULL REFERENCES "stock_control_companies"("id") ON DELETE CASCADE,
        "stock_item_id" integer NOT NULL REFERENCES "stock_items"("id") ON DELETE CASCADE,
        "issuer_staff_id" integer NOT NULL REFERENCES "stock_control_staff_members"("id") ON DELETE CASCADE,
        "recipient_staff_id" integer NOT NULL REFERENCES "stock_control_staff_members"("id") ON DELETE CASCADE,
        "job_card_id" integer REFERENCES "job_cards"("id") ON DELETE SET NULL,
        "quantity" integer NOT NULL,
        "notes" text,
        "issued_by_user_id" integer REFERENCES "stock_control_users"("id") ON DELETE SET NULL,
        "issued_by_name" varchar(255),
        "issued_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_issuances_company_id" ON "stock_issuances" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_issuances_stock_item_id" ON "stock_issuances" ("stock_item_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_issuances_issuer_staff_id" ON "stock_issuances" ("issuer_staff_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_issuances_recipient_staff_id" ON "stock_issuances" ("recipient_staff_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_issuances_job_card_id" ON "stock_issuances" ("job_card_id") WHERE "job_card_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_issuances_issued_at" ON "stock_issuances" ("issued_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "stock_issuances"`);
  }
}
