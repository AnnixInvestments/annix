import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAppBrandingImages1820100001600 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS app_branding_images (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        brand_code varchar(64) NOT NULL,
        label varchar(200) NOT NULL DEFAULT '',
        path varchar(500) NOT NULL,
        sort_order int NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT pk_app_branding_images PRIMARY KEY (id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_branding_images_brand
        ON app_branding_images (brand_code)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS app_branding_images");
  }
}
