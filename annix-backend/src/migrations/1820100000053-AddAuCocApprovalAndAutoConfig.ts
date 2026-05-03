import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuCocApprovalAndAutoConfig1820100000053 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'rubber_au_cocs_status_enum' AND e.enumlabel = 'APPROVED'
        ) THEN
          ALTER TYPE rubber_au_cocs_status_enum ADD VALUE 'APPROVED' BEFORE 'SENT';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_au_cocs
      ADD COLUMN IF NOT EXISTS last_auto_processed_at timestamptz NULL
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_company
      ADD COLUMN IF NOT EXISTS au_coc_recipient_email varchar(255) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE rubber_company
      ADD COLUMN IF NOT EXISTS auto_approve_au_cocs boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices
      ADD COLUMN IF NOT EXISTS linked_au_coc_id integer NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_rubber_tax_invoices_au_coc'
        ) THEN
          ALTER TABLE rubber_tax_invoices
          ADD CONSTRAINT fk_rubber_tax_invoices_au_coc
          FOREIGN KEY (linked_au_coc_id) REFERENCES rubber_au_cocs(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_tax_invoices_au_coc
      ON rubber_tax_invoices (linked_au_coc_id) WHERE linked_au_coc_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_au_cocs_readiness_status
      ON rubber_au_cocs (readiness_status, status)
      WHERE status IN ('DRAFT', 'GENERATED')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_rubber_au_cocs_readiness_status");
    await queryRunner.query("DROP INDEX IF EXISTS idx_rubber_tax_invoices_au_coc");
    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices DROP CONSTRAINT IF EXISTS fk_rubber_tax_invoices_au_coc
    `);
    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices DROP COLUMN IF EXISTS linked_au_coc_id
    `);
    await queryRunner.query(`
      ALTER TABLE rubber_company DROP COLUMN IF EXISTS auto_approve_au_cocs
    `);
    await queryRunner.query(`
      ALTER TABLE rubber_company DROP COLUMN IF EXISTS au_coc_recipient_email
    `);
    await queryRunner.query(`
      ALTER TABLE rubber_au_cocs DROP COLUMN IF EXISTS last_auto_processed_at
    `);
  }
}
