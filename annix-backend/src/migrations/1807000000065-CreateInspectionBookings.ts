import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInspectionBookings1807000000065 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inspection_bookings (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        job_card_id INTEGER NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        inspection_date DATE NOT NULL,
        start_time VARCHAR(5) NOT NULL,
        end_time VARCHAR(5) NOT NULL,
        inspector_email VARCHAR(255) NOT NULL,
        inspector_name VARCHAR(255),
        notes TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'booked',
        booked_by_id INTEGER REFERENCES stock_control_users(id) ON DELETE SET NULL,
        booked_by_name VARCHAR(255),
        completed_at TIMESTAMPTZ,
        completed_by_id INTEGER REFERENCES stock_control_users(id) ON DELETE SET NULL,
        completed_by_name VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inspection_bookings_company_date
      ON inspection_bookings (company_id, inspection_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inspection_bookings_job_card
      ON inspection_bookings (job_card_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS inspection_bookings");
  }
}
