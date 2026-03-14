import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveDuplicateAuCocs1807000000031 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM rubber_au_cocs
      WHERE id IN (16, 19, 20, 21, 22, 23)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Duplicates cannot be restored — they were test/duplicate records
  }
}
