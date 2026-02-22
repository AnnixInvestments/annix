import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1793900000000 implements MigrationInterface {
  name = "AddPerformanceIndexes1793900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add index on customer_profiles.user_id for faster user lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customer_profiles_user_id"
      ON "customer_profiles" ("user_id")
    `);

    // Add index on supplier_profiles.user_id for faster user lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_supplier_profiles_user_id"
      ON "supplier_profiles" ("user_id")
    `);

    // Add index on rfq_items.rfq_id for faster RFQ item queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rfq_items_rfq_id"
      ON "rfq_items" ("rfq_id")
    `);

    // Add composite index on rfq_items for common query patterns
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rfq_items_rfq_id_line_number"
      ON "rfq_items" ("rfq_id", "line_number")
    `);

    // Add index on rfqs.created_at for ordering queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rfqs_created_at"
      ON "rfqs" ("created_at" DESC)
    `);

    // Add index on rfqs.status for filtering queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rfqs_status"
      ON "rfqs" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rfqs_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rfqs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rfq_items_rfq_id_line_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rfq_items_rfq_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_supplier_profiles_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customer_profiles_user_id"`);
  }
}
