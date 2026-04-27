import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTestimonialTable1820100000035 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS testimonial (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        author_name VARCHAR(200) NOT NULL,
        author_role VARCHAR(200),
        author_company VARCHAR(200),
        rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        body TEXT NOT NULL,
        date_published DATE NOT NULL,
        source VARCHAR(20) NOT NULL DEFAULT 'manual',
        highlight BOOLEAN NOT NULL DEFAULT FALSE,
        is_published BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_testimonial_published_sort
        ON testimonial (is_published, sort_order, date_published DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_testimonial_published_sort");
    await queryRunner.query("DROP TABLE IF EXISTS testimonial");
  }
}
