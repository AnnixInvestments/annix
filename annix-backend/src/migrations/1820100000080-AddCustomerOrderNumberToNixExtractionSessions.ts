import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds customer_order_number to nix_extraction_sessions for the quote-meta
 * strip on the promoted-quote page. Maps to the "Order No" field on the
 * customer-facing PDF (e.g. "STEEL AFRICA - 32452E" on the example
 * Polymer Liners quote). Distinct from externalReference (which is
 * documented for the customer's RFQ number) — Order No is the customer's
 * downstream PO / order reference for fulfilment.
 */
export class AddCustomerOrderNumberToNixExtractionSessions1820100000080
  implements MigrationInterface
{
  name = "AddCustomerOrderNumberToNixExtractionSessions1820100000080";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
        ADD COLUMN IF NOT EXISTS "customer_order_number" varchar(255) NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nix_extraction_sessions"
        DROP COLUMN IF EXISTS "customer_order_number"
    `);
  }
}
