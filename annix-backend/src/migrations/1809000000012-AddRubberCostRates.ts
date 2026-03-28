import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRubberCostRates1809000000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rubber_cost_rates_rate_type_enum') THEN
          CREATE TYPE rubber_cost_rates_rate_type_enum AS ENUM ('CALENDERER_UNCURED', 'CALENDERER_CURED_BUFFED', 'COMPOUND');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rubber_cost_rates (
        id SERIAL PRIMARY KEY,
        rate_type rubber_cost_rates_rate_type_enum NOT NULL,
        cost_per_kg_zar DECIMAL(10, 2) NOT NULL,
        compound_coding_id INT NULL,
        notes TEXT NULL,
        updated_by VARCHAR(100) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_rubber_cost_rates_compound_coding
          FOREIGN KEY (compound_coding_id)
          REFERENCES rubber_product_coding(id)
          ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_cost_rates_rate_type ON rubber_cost_rates (rate_type);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_cost_rates_compound_coding_id ON rubber_cost_rates (compound_coding_id);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_rubber_cost_rates_unique_type_compound
        ON rubber_cost_rates (rate_type, compound_coding_id)
        WHERE compound_coding_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_rubber_cost_rates_unique_type_no_compound
        ON rubber_cost_rates (rate_type)
        WHERE compound_coding_id IS NULL AND rate_type IN ('CALENDERER_UNCURED', 'CALENDERER_CURED_BUFFED');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS rubber_cost_rates;");
    await queryRunner.query("DROP TYPE IF EXISTS rubber_cost_rates_rate_type_enum;");
  }
}
