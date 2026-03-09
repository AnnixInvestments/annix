import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCpoCalloffColumns1802800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE requisitions
        ADD COLUMN IF NOT EXISTS cpo_id integer REFERENCES customer_purchase_orders(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS is_calloff_order boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_requisitions_cpo_id ON requisitions (cpo_id) WHERE cpo_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_requisitions_cpo_id");
    await queryRunner.query("ALTER TABLE requisitions DROP COLUMN IF EXISTS is_calloff_order");
    await queryRunner.query("ALTER TABLE requisitions DROP COLUMN IF EXISTS cpo_id");
  }
}
