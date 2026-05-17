import { MigrationInterface, QueryRunner } from "typeorm";

export class WidenRubberSupplierCocIdentifierColumns1820100000110 implements MigrationInterface {
  name = "WidenRubberSupplierCocIdentifierColumns1820100000110";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Impilo Calenderer CoCs can reference many ticket numbers; the raw
    // comma-joined ticket string and the generated coc_number both overflow
    // varchar(100). Widening varchar is a metadata-only change in Postgres.
    await queryRunner.query(
      `ALTER TABLE "rubber_supplier_cocs" ALTER COLUMN "coc_number" TYPE varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rubber_supplier_cocs" ALTER COLUMN "order_number" TYPE varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rubber_supplier_cocs" ALTER COLUMN "ticket_number" TYPE varchar(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rubber_supplier_cocs" ALTER COLUMN "ticket_number" TYPE varchar(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rubber_supplier_cocs" ALTER COLUMN "order_number" TYPE varchar(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "rubber_supplier_cocs" ALTER COLUMN "coc_number" TYPE varchar(100)`,
    );
  }
}
