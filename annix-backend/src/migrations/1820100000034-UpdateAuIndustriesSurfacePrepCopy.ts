import type { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAuIndustriesSurfacePrepCopy1820100000034 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE website_page
      SET content = REPLACE(content, 'to SA 2.5 standard', 'up to SA 3 standard'),
          updated_at = NOW()
      WHERE slug IN ('rubber-lining', 'site-maintenance')
        AND content LIKE '%to SA 2.5 standard%'
    `);
  }

  public async down(): Promise<void> {}
}
