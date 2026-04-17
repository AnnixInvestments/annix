import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIdToSessions1820100000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_sessions
        ADD COLUMN IF NOT EXISTS user_id INT REFERENCES "user"(id)
    `);

    await queryRunner.query(`
      UPDATE customer_sessions cs
      SET user_id = cp.user_id
      FROM customer_profiles cp
      WHERE cp.id = cs.customer_profile_id
        AND cs.user_id IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_sessions_user_id
        ON customer_sessions (user_id)
        WHERE user_id IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE supplier_sessions
        ADD COLUMN IF NOT EXISTS user_id INT REFERENCES "user"(id)
    `);

    await queryRunner.query(`
      UPDATE supplier_sessions ss
      SET user_id = sp.user_id
      FROM supplier_profiles sp
      WHERE sp.id = ss.supplier_profile_id
        AND ss.user_id IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_sessions_user_id
        ON supplier_sessions (user_id)
        WHERE user_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_supplier_sessions_user_id");
    await queryRunner.query("ALTER TABLE supplier_sessions DROP COLUMN IF EXISTS user_id");
    await queryRunner.query("DROP INDEX IF EXISTS idx_customer_sessions_user_id");
    await queryRunner.query("ALTER TABLE customer_sessions DROP COLUMN IF EXISTS user_id");
  }
}
