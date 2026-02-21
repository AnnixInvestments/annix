import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCalendarBufferSettings1771000000000 implements MigrationInterface {
  name = "AddCalendarBufferSettings1771000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE annix_rep_rep_profiles
      ADD COLUMN IF NOT EXISTS default_buffer_before_minutes INT DEFAULT 15,
      ADD COLUMN IF NOT EXISTS default_buffer_after_minutes INT DEFAULT 15,
      ADD COLUMN IF NOT EXISTS working_hours_start VARCHAR(5) DEFAULT '08:00',
      ADD COLUMN IF NOT EXISTS working_hours_end VARCHAR(5) DEFAULT '17:00',
      ADD COLUMN IF NOT EXISTS working_days VARCHAR(20) DEFAULT '1,2,3,4,5'
    `);

    await queryRunner.query(`
      ALTER TABLE annix_rep_calendar_connections
      ADD COLUMN IF NOT EXISTS display_color VARCHAR(7) DEFAULT '#3B82F6'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS annix_rep_calendar_colors (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        color_type VARCHAR(50) NOT NULL,
        color_key VARCHAR(50) NOT NULL,
        color_value VARCHAR(7) NOT NULL,
        UNIQUE(user_id, color_type, color_key)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_colors_user ON annix_rep_calendar_colors(user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_calendar_colors_user");
    await queryRunner.query("DROP TABLE IF EXISTS annix_rep_calendar_colors");
    await queryRunner.query(`
      ALTER TABLE annix_rep_calendar_connections
      DROP COLUMN IF EXISTS display_color
    `);
    await queryRunner.query(`
      ALTER TABLE annix_rep_rep_profiles
      DROP COLUMN IF EXISTS default_buffer_before_minutes,
      DROP COLUMN IF EXISTS default_buffer_after_minutes,
      DROP COLUMN IF EXISTS working_hours_start,
      DROP COLUMN IF EXISTS working_hours_end,
      DROP COLUMN IF EXISTS working_days
    `);
  }
}
