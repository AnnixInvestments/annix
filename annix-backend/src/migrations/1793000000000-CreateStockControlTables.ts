import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockControlTables1793000000000 implements MigrationInterface {
  name = "CreateStockControlTables1793000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_control_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'storeman',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_items (
        id SERIAL PRIMARY KEY,
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        unit_of_measure VARCHAR(50) DEFAULT 'each',
        cost_per_unit NUMERIC(12,2) DEFAULT 0,
        quantity INTEGER DEFAULT 0,
        min_stock_level INTEGER DEFAULT 0,
        location VARCHAR(255),
        photo_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS job_cards (
        id SERIAL PRIMARY KEY,
        job_number VARCHAR(100) UNIQUE NOT NULL,
        job_name VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255),
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_allocations (
        id SERIAL PRIMARY KEY,
        stock_item_id INTEGER NOT NULL REFERENCES stock_items(id),
        job_card_id INTEGER NOT NULL REFERENCES job_cards(id),
        quantity_used INTEGER NOT NULL,
        photo_url TEXT,
        notes TEXT,
        allocated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS delivery_notes (
        id SERIAL PRIMARY KEY,
        delivery_number VARCHAR(100) UNIQUE NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        received_date TIMESTAMP DEFAULT NOW(),
        notes TEXT,
        photo_url TEXT,
        received_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS delivery_note_items (
        id SERIAL PRIMARY KEY,
        delivery_note_id INTEGER NOT NULL REFERENCES delivery_notes(id),
        stock_item_id INTEGER NOT NULL REFERENCES stock_items(id),
        quantity_received INTEGER NOT NULL,
        photo_url TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        stock_item_id INTEGER NOT NULL REFERENCES stock_items(id),
        movement_type VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        notes TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_items_sku ON stock_items(sku)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_cards_job_number ON job_cards(job_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_cards_status ON job_cards(status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_delivery_notes_delivery_number ON delivery_notes(delivery_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_allocations_stock_item_id ON stock_allocations(stock_item_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_allocations_job_card_id ON stock_allocations(job_card_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_delivery_note_items_delivery_note_id ON delivery_note_items(delivery_note_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_delivery_note_items_stock_item_id ON delivery_note_items(stock_item_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_stock_item_id ON stock_movements(stock_item_id)
    `);

    console.log(
      "Created Stock Control tables: stock_control_users, stock_items, job_cards, stock_allocations, delivery_notes, delivery_note_items, stock_movements",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS stock_movements CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS delivery_note_items CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS delivery_notes CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS stock_allocations CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS job_cards CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS stock_items CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS stock_control_users CASCADE");

    console.log("Dropped Stock Control tables");
  }
}
