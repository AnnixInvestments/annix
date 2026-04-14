import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInspectionBookingResponseFields1819700000000 implements MigrationInterface {
  name = "AddInspectionBookingResponseFields1819700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE inspection_bookings
        ADD COLUMN IF NOT EXISTS response_token varchar(64),
        ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
        ADD COLUMN IF NOT EXISTS proposed_date date,
        ADD COLUMN IF NOT EXISTS proposed_start_time varchar(5),
        ADD COLUMN IF NOT EXISTS proposed_end_time varchar(5),
        ADD COLUMN IF NOT EXISTS proposed_note text,
        ADD COLUMN IF NOT EXISTS proposed_at timestamptz,
        ADD COLUMN IF NOT EXISTS responded_at timestamptz
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_bookings_response_token
        ON inspection_bookings (response_token)
        WHERE response_token IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_inspection_bookings_response_token");
    await queryRunner.query(`
      ALTER TABLE inspection_bookings
        DROP COLUMN IF EXISTS response_token,
        DROP COLUMN IF EXISTS token_expires_at,
        DROP COLUMN IF EXISTS proposed_date,
        DROP COLUMN IF EXISTS proposed_start_time,
        DROP COLUMN IF EXISTS proposed_end_time,
        DROP COLUMN IF EXISTS proposed_note,
        DROP COLUMN IF EXISTS proposed_at,
        DROP COLUMN IF EXISTS responded_at
    `);
  }
}
