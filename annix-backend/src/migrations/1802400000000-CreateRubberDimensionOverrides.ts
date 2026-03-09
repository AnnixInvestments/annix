import { type MigrationInterface, type QueryRunner } from "typeorm";

export class CreateRubberDimensionOverrides1802400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rubber_dimension_overrides (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        item_type varchar(30),
        nb_mm integer,
        od_mm numeric(8,2),
        schedule varchar(30),
        pipe_length_mm integer NOT NULL,
        flange_config varchar(30),
        calculated_width_mm integer NOT NULL,
        calculated_length_mm integer NOT NULL,
        override_width_mm integer NOT NULL,
        override_length_mm integer NOT NULL,
        usage_count integer NOT NULL DEFAULT 1,
        last_used_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_rubber_dim_override_lookup
      ON rubber_dimension_overrides (
        company_id,
        COALESCE(item_type, ''),
        COALESCE(nb_mm, 0),
        COALESCE(od_mm, 0),
        COALESCE(schedule, ''),
        pipe_length_mm,
        COALESCE(flange_config, '')
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_rubber_dim_override_lookup`);
    await queryRunner.query(`DROP TABLE IF EXISTS rubber_dimension_overrides`);
  }
}
