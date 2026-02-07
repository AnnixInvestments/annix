import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCustomerBlockedSuppliersTable1780000000000 implements MigrationInterface {
  name = "CreateCustomerBlockedSuppliersTable1780000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "customer_blocked_suppliers" (
        "id" SERIAL NOT NULL,
        "customer_company_id" integer NOT NULL,
        "supplier_profile_id" integer NOT NULL,
        "blocked_by" integer NOT NULL,
        "reason" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customer_blocked_suppliers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_customer_blocked_suppliers_company_supplier" UNIQUE ("customer_company_id", "supplier_profile_id"),
        CONSTRAINT "FK_customer_blocked_suppliers_customer_company" FOREIGN KEY ("customer_company_id") REFERENCES "customer_companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_customer_blocked_suppliers_supplier_profile" FOREIGN KEY ("supplier_profile_id") REFERENCES "supplier_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_customer_blocked_suppliers_blocked_by" FOREIGN KEY ("blocked_by") REFERENCES "customer_profiles"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_customer_blocked_suppliers_company" ON "customer_blocked_suppliers" ("customer_company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_customer_blocked_suppliers_supplier" ON "customer_blocked_suppliers" ("supplier_profile_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_customer_blocked_suppliers_supplier"`);
    await queryRunner.query(`DROP INDEX "IDX_customer_blocked_suppliers_company"`);
    await queryRunner.query(`DROP TABLE "customer_blocked_suppliers"`);
  }
}
