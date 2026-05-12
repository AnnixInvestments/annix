import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds customer assignment to nix_extraction_sessions so the promoted-quote
 * page can show / capture who the quote is for. Two columns:
 *
 *   customer_company_id   nullable FK → companies.id, set when the quoter
 *                         picks an existing customer from the master list
 *                         OR ticks "Save for future use" on a freshly typed
 *                         customer (creates a Company with type CUSTOMER).
 *
 *   customer_snapshot     JSONB carrying { name, contactPerson, email,
 *                         phone, vatNumber, registrationNumber, address
 *                         lines, city, province, postalCode, country }
 *                         as they were AT QUOTE TIME — so the customer
 *                         block on the PDF stays stable even if the master
 *                         row is later updated. Always populated when a
 *                         customer is assigned; required for one-off
 *                         customers that the quoter chose NOT to save.
 */
export class AddCustomerToNixExtractionSessions1820100000079 implements MigrationInterface {
  name = "AddCustomerToNixExtractionSessions1820100000079";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
        ADD COLUMN IF NOT EXISTS "customer_company_id" int NULL,
        ADD COLUMN IF NOT EXISTS "customer_snapshot" jsonb NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "nix_extraction_sessions"
          ADD CONSTRAINT "FK_nix_sessions_customer_company"
          FOREIGN KEY ("customer_company_id")
          REFERENCES "companies"("id")
          ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_nix_sessions_customer_company"
        ON "nix_extraction_sessions" ("customer_company_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_nix_sessions_customer_company"`);
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
        DROP CONSTRAINT IF EXISTS "FK_nix_sessions_customer_company"
    `);
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
        DROP COLUMN IF EXISTS "customer_snapshot",
        DROP COLUMN IF EXISTS "customer_company_id"
    `);
  }
}
