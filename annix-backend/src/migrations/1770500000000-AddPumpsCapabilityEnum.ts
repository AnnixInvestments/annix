import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPumpsCapabilityEnum1770500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const enumTypeName = 'supplier_capabilities_product_category_enum';

    await queryRunner.query(`
      ALTER TYPE ${enumTypeName} ADD VALUE IF NOT EXISTS 'pumps';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      'Note: Enum values cannot be easily removed in PostgreSQL. Manual intervention required if needed.',
    );
  }
}
