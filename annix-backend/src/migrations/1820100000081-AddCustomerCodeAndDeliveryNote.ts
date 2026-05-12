import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds two small header-data fields that appear on the customer-facing
 * quote PDF:
 *
 *   companies.customer_code               varchar(50)
 *     The customer's account code at the supplier — printed in the header
 *     strip on every quote / invoice (e.g. "MIN001" on the example Polymer
 *     Liners quote). Per-customer, on the master row.
 *
 *   nix_extraction_sessions.delivery_note_ref   varchar(255)
 *     Per-quote reference for the future delivery note. Usually blank at
 *     quote time but the column exists on the PDF template, so the field
 *     is editable here too.
 */
export class AddCustomerCodeAndDeliveryNote1820100000081 implements MigrationInterface {
  name = "AddCustomerCodeAndDeliveryNote1820100000081";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
        ADD COLUMN IF NOT EXISTS "customer_code" varchar(50) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
        ADD COLUMN IF NOT EXISTS "delivery_note_ref" varchar(255) NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
        DROP COLUMN IF EXISTS "delivery_note_ref"
    `);
    await queryRunner.query(`
      ALTER TABLE "companies"
        DROP COLUMN IF EXISTS "customer_code"
    `);
  }
}
