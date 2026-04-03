import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFastenerRfqTable1797200000000 implements MigrationInterface {
  name = "CreateFastenerRfqTable1797200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fastener_rfqs_fastener_category_enum') THEN
          CREATE TYPE fastener_rfqs_fastener_category_enum AS ENUM ('bolt', 'nut', 'washer', 'gasket', 'set_screw', 'machine_screw', 'insert');
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fastener_rfqs (
        id SERIAL PRIMARY KEY,
        rfq_item_id INTEGER UNIQUE REFERENCES rfq_items(id) ON DELETE CASCADE,
        fastener_category fastener_rfqs_fastener_category_enum NOT NULL,
        specific_type VARCHAR(100) NOT NULL,
        size VARCHAR(20) NOT NULL,
        grade VARCHAR(50),
        material VARCHAR(100),
        finish VARCHAR(50),
        thread_type VARCHAR(20),
        standard VARCHAR(100),
        length_mm FLOAT,
        quantity_value INTEGER DEFAULT 1,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      ALTER TYPE rfq_items_item_type_enum ADD VALUE IF NOT EXISTS 'fastener'
    `);

    await queryRunner.query(`
      ALTER TYPE boq_line_items_item_type_enum ADD VALUE IF NOT EXISTS 'fastener'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS fastener_rfqs");
  }
}
