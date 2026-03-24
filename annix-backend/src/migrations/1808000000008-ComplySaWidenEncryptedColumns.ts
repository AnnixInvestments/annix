import { MigrationInterface, QueryRunner } from "typeorm";

export class ComplySaWidenEncryptedColumns1808000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "comply_sa_companies"
        ALTER COLUMN "id_number" TYPE VARCHAR(255),
        ALTER COLUMN "passport_number" TYPE VARCHAR(255),
        ALTER COLUMN "sars_tax_reference" TYPE VARCHAR(255),
        ALTER COLUMN "date_of_birth" TYPE VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "comply_sa_companies"
        ALTER COLUMN "id_number" TYPE VARCHAR(20),
        ALTER COLUMN "passport_number" TYPE VARCHAR(50),
        ALTER COLUMN "sars_tax_reference" TYPE VARCHAR(30),
        ALTER COLUMN "date_of_birth" TYPE VARCHAR(20)
    `);
  }
}
