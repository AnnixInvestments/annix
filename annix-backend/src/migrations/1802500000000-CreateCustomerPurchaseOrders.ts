import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCustomerPurchaseOrders1802500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customer_purchase_orders (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        cpo_number varchar(100) NOT NULL,
        job_number varchar(500) NOT NULL,
        job_name varchar(255),
        customer_name varchar(255),
        po_number varchar(500),
        site_location varchar(255),
        contact_person varchar(255),
        due_date varchar(500),
        notes text,
        reference varchar(255),
        custom_fields jsonb,
        status varchar(50) NOT NULL DEFAULT 'active',
        total_items integer NOT NULL DEFAULT 0,
        total_quantity numeric(12,2) NOT NULL DEFAULT 0,
        fulfilled_quantity numeric(12,2) NOT NULL DEFAULT 0,
        source_file_path varchar(500),
        source_file_name varchar(255),
        created_by varchar(255),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cpo_number_company
        ON customer_purchase_orders (company_id, cpo_number)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customer_purchase_order_items (
        id SERIAL PRIMARY KEY,
        cpo_id integer NOT NULL REFERENCES customer_purchase_orders(id) ON DELETE CASCADE,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        item_code varchar(500),
        item_description text,
        item_no varchar(500),
        quantity_ordered numeric(12,2) NOT NULL DEFAULT 0,
        quantity_fulfilled numeric(12,2) NOT NULL DEFAULT 0,
        jt_no varchar(500),
        m2 numeric(12,4),
        sort_order integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cpo_items_cpo_id
        ON customer_purchase_order_items (cpo_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS customer_purchase_order_items");
    await queryRunner.query("DROP TABLE IF EXISTS customer_purchase_orders");
  }
}
