import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLinkedCalenderRollCocToTaxInvoices1820100000111 implements MigrationInterface {
  name = "AddLinkedCalenderRollCocToTaxInvoices1820100000111";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Supplier credit notes register against the Calender Roll supplier CoC
    // the credited rolls arrived on.
    await queryRunner.query(
      `ALTER TABLE "rubber_tax_invoices" ADD COLUMN IF NOT EXISTS "linked_calender_roll_coc_id" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rubber_tax_invoices" DROP COLUMN IF EXISTS "linked_calender_roll_coc_id"`,
    );
  }
}
