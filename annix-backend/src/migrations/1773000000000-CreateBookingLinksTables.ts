import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBookingLinksTables1773000000000 implements MigrationInterface {
  name = "CreateBookingLinksTables1773000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE annix_rep_booking_links (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        slug UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        meeting_duration_minutes INT DEFAULT 30,
        buffer_before_minutes INT DEFAULT 0,
        buffer_after_minutes INT DEFAULT 0,
        available_days VARCHAR(20) DEFAULT '1,2,3,4,5',
        available_start_hour INT DEFAULT 8,
        available_end_hour INT DEFAULT 17,
        max_days_ahead INT DEFAULT 30,
        is_active BOOLEAN DEFAULT TRUE,
        custom_questions JSONB,
        meeting_type VARCHAR(20) DEFAULT 'video',
        location VARCHAR(500),
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_booking_links_user ON annix_rep_booking_links(user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_booking_links_slug ON annix_rep_booking_links(slug)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_booking_links_active ON annix_rep_booking_links(is_active) WHERE is_active = TRUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_booking_links_active");
    await queryRunner.query("DROP INDEX IF EXISTS idx_booking_links_slug");
    await queryRunner.query("DROP INDEX IF EXISTS idx_booking_links_user");
    await queryRunner.query("DROP TABLE IF EXISTS annix_rep_booking_links");
  }
}
