import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBlogPostTable1820100000036 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS blog_post (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(200) NOT NULL UNIQUE,
        title VARCHAR(200) NOT NULL,
        meta_title VARCHAR(200),
        meta_description TEXT,
        excerpt TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        hero_image_url VARCHAR(500),
        author VARCHAR(200) NOT NULL DEFAULT 'AU Industries',
        published_at TIMESTAMPTZ,
        is_published BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_post_published
        ON blog_post (is_published, published_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_blog_post_published");
    await queryRunner.query("DROP TABLE IF EXISTS blog_post");
  }
}
