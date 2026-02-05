import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingForeignKeyIndexes1780000000000
  implements MigrationInterface
{
  name = 'AddMissingForeignKeyIndexes1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rfqs_created_by_user_id" ON "rfqs" ("created_by_user_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_boqs_created_by_user_id" ON "boqs" ("created_by_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_boqs_drawing_id" ON "boqs" ("drawing_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_boqs_rfq_id" ON "boqs" ("rfq_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_drawings_rfq_id" ON "drawings" ("rfq_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_drawings_uploaded_by_user_id" ON "drawings" ("uploaded_by_user_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rfq_items_rfq_id" ON "rfq_items" ("rfq_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_profiles_user_id" ON "customer_profiles" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_profiles_company_id" ON "customer_profiles" ("company_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_supplier_profiles_user_id" ON "supplier_profiles" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_supplier_profiles_company_id" ON "supplier_profiles" ("company_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_message_conversation_id" ON "message" ("conversation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_message_sender_id" ON "message" ("sender_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_nix_extractions_user_id" ON "nix_extractions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_nix_extractions_rfq_id" ON "nix_extractions" ("rfq_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rfqs_created_by_user_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_boqs_created_by_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_boqs_drawing_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_boqs_rfq_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_drawings_rfq_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_drawings_uploaded_by_user_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rfq_items_rfq_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customer_profiles_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customer_profiles_company_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_supplier_profiles_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_supplier_profiles_company_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_message_conversation_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_message_sender_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_nix_extractions_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_nix_extractions_rfq_id"`);
  }
}
