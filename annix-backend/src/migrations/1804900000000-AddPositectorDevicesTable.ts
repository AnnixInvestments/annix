import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPositectorDevicesTable1804900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS positector_devices (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        device_name varchar(255) NOT NULL,
        ip_address varchar(45) NOT NULL,
        port integer NOT NULL DEFAULT 8080,
        probe_type varchar(20),
        serial_number varchar(100),
        is_active boolean NOT NULL DEFAULT true,
        last_connected_at timestamptz,
        registered_by_name varchar(255) NOT NULL,
        registered_by_id integer,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE(company_id, ip_address)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_positector_devices_company
        ON positector_devices (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_positector_devices_active
        ON positector_devices (company_id)
        WHERE is_active = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS positector_devices");
  }
}
