import { type MigrationInterface, type QueryRunner } from "typeorm";

export class CreateWebsitePageTable1817200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "website_page" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" varchar(200) NOT NULL,
        "title" varchar(200) NOT NULL,
        "meta_title" varchar(200),
        "meta_description" text,
        "content" text NOT NULL DEFAULT '',
        "hero_image_url" varchar(500),
        "sort_order" int NOT NULL DEFAULT 0,
        "is_published" boolean NOT NULL DEFAULT false,
        "is_home_page" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_website_page" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_website_page_slug"
      ON "website_page" ("slug")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_website_page_slug"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "website_page"`);
  }
}
