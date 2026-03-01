import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHeroImageUrl1793350000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_control_companies" ADD COLUMN IF NOT EXISTS "hero_image_url" VARCHAR(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_control_companies" DROP COLUMN IF EXISTS "hero_image_url"`,
    );
  }
}
