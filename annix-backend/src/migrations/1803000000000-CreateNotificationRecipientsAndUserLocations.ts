import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNotificationRecipientsAndUserLocations1803000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_notification_recipients (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        workflow_step VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(company_id, workflow_step, email)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_location_assignments (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES stock_control_users(id) ON DELETE CASCADE,
        location_id INTEGER NOT NULL REFERENCES stock_control_locations(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(company_id, user_id, location_id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS user_location_assignments");
    await queryRunner.query("DROP TABLE IF EXISTS workflow_notification_recipients");
  }
}
