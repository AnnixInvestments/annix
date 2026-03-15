import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillCompoundStockFromDocuments1807000000033
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO rubber_compound_stock (firebase_uid, compound_coding_id, quantity_kg, min_stock_level_kg, reorder_point_kg, cost_per_kg)
      SELECT
        'pg_' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 9),
        pc.id,
        0,
        0,
        0,
        NULL
      FROM rubber_product_coding pc
      WHERE pc.coding_type = 'COMPOUND'
        AND NOT EXISTS (
          SELECT 1 FROM rubber_compound_stock cs WHERE cs.compound_coding_id = pc.id
        )
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        inv RECORD;
        v_coding_id INT;
        v_stock_id INT;
        v_qty NUMERIC;
        v_cost NUMERIC;
        v_code TEXT;
        v_text TEXT;
      BEGIN
        FOR inv IN
          SELECT ti.id, ti.invoice_number, ti.extracted_data, ti.total_amount
          FROM rubber_tax_invoices ti
          WHERE ti.invoice_type = 'SUPPLIER'
            AND ti.status = 'APPROVED'
            AND NOT EXISTS (
              SELECT 1 FROM rubber_compound_movements cm
              WHERE cm.reference_type = 'INVOICE_RECEIPT' AND cm.reference_id = ti.id
            )
        LOOP
          v_coding_id := NULL;
          v_qty := NULL;
          v_cost := NULL;

          v_text := COALESCE(
            inv.extracted_data->>'productSummary',
            ''
          );
          IF v_text = '' AND inv.extracted_data->'lineItems' IS NOT NULL THEN
            SELECT string_agg(item->>'description', ' ')
            INTO v_text
            FROM jsonb_array_elements(inv.extracted_data->'lineItems') AS item;
          END IF;
          v_text := COALESCE(v_text, '');

          SELECT pc.id INTO v_coding_id
          FROM rubber_product_coding pc
          WHERE pc.coding_type = 'COMPOUND'
            AND UPPER(v_text) LIKE '%' || UPPER(pc.code) || '%'
          ORDER BY length(pc.code) DESC
          LIMIT 1;

          IF v_coding_id IS NULL THEN
            CONTINUE;
          END IF;

          IF inv.extracted_data->>'productQuantity' IS NOT NULL
             AND LOWER(COALESCE(inv.extracted_data->>'productUnit', '')) = 'kg' THEN
            v_qty := (inv.extracted_data->>'productQuantity')::numeric;
          END IF;

          IF v_qty IS NULL OR v_qty <= 0 THEN
            SELECT (regexp_matches(v_text, '(\d[\d,.]*)\s*kg', 'i'))[1]
            INTO v_code;
            IF v_code IS NOT NULL THEN
              v_qty := replace(v_code, ',', '')::numeric;
            END IF;
          END IF;

          IF v_qty IS NULL OR v_qty <= 0 THEN
            CONTINUE;
          END IF;

          IF inv.extracted_data->>'subtotal' IS NOT NULL AND v_qty > 0 THEN
            v_cost := (inv.extracted_data->>'subtotal')::numeric / v_qty;
          END IF;

          SELECT cs.id INTO v_stock_id
          FROM rubber_compound_stock cs
          WHERE cs.compound_coding_id = v_coding_id;

          IF v_stock_id IS NULL THEN
            INSERT INTO rubber_compound_stock (firebase_uid, compound_coding_id, quantity_kg, min_stock_level_kg, reorder_point_kg, cost_per_kg)
            VALUES (
              'pg_' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 9),
              v_coding_id,
              0, 0, 0, NULL
            )
            RETURNING id INTO v_stock_id;
          END IF;

          UPDATE rubber_compound_stock
          SET quantity_kg = quantity_kg + v_qty,
              cost_per_kg = COALESCE(v_cost, cost_per_kg)
          WHERE id = v_stock_id;

          INSERT INTO rubber_compound_movements (compound_stock_id, movement_type, quantity_kg, reference_type, reference_id, notes, created_at)
          VALUES (
            v_stock_id,
            'IN',
            v_qty,
            'INVOICE_RECEIPT',
            inv.id,
            'Supplier invoice ' || COALESCE(inv.invoice_number, '#' || inv.id),
            NOW()
          );

        END LOOP;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        dn RECORD;
        v_coding_id INT;
        v_stock_id INT;
        v_total_kg NUMERIC;
        v_compound_code TEXT;
      BEGIN
        FOR dn IN
          SELECT d.id, d.delivery_note_number, d.delivery_note_type, d.linked_coc_id
          FROM rubber_delivery_notes d
          WHERE d.status = 'STOCK_CREATED'
            AND NOT EXISTS (
              SELECT 1 FROM rubber_compound_movements cm
              WHERE cm.reference_type = 'DELIVERY_DEDUCTION' AND cm.reference_id = d.id
            )
        LOOP
          v_coding_id := NULL;
          v_compound_code := NULL;

          IF dn.linked_coc_id IS NOT NULL THEN
            SELECT sc.compound_code INTO v_compound_code
            FROM rubber_supplier_cocs sc
            WHERE sc.id = dn.linked_coc_id
              AND sc.compound_code IS NOT NULL;
          END IF;

          IF v_compound_code IS NULL THEN
            SELECT di.compound_type INTO v_compound_code
            FROM rubber_delivery_note_items di
            WHERE di.delivery_note_id = dn.id
              AND di.compound_type IS NOT NULL
            LIMIT 1;
          END IF;

          IF v_compound_code IS NULL THEN
            CONTINUE;
          END IF;

          SELECT pc.id INTO v_coding_id
          FROM rubber_product_coding pc
          WHERE pc.coding_type = 'COMPOUND'
            AND UPPER(pc.code) = UPPER(v_compound_code);

          IF v_coding_id IS NULL THEN
            CONTINUE;
          END IF;

          IF dn.delivery_note_type = 'COMPOUND' THEN
            SELECT COALESCE(SUM(COALESCE(di.weight_kg, 0)), 0)
            INTO v_total_kg
            FROM rubber_delivery_note_items di
            WHERE di.delivery_note_id = dn.id;
          ELSE
            SELECT COALESCE(SUM(COALESCE(di.roll_weight_kg, 0)), 0)
            INTO v_total_kg
            FROM rubber_delivery_note_items di
            WHERE di.delivery_note_id = dn.id;
          END IF;

          IF v_total_kg <= 0 THEN
            CONTINUE;
          END IF;

          SELECT cs.id INTO v_stock_id
          FROM rubber_compound_stock cs
          WHERE cs.compound_coding_id = v_coding_id;

          IF v_stock_id IS NULL THEN
            INSERT INTO rubber_compound_stock (firebase_uid, compound_coding_id, quantity_kg, min_stock_level_kg, reorder_point_kg, cost_per_kg)
            VALUES (
              'pg_' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 9),
              v_coding_id,
              0, 0, 0, NULL
            )
            RETURNING id INTO v_stock_id;
          END IF;

          UPDATE rubber_compound_stock
          SET quantity_kg = quantity_kg - v_total_kg
          WHERE id = v_stock_id;

          INSERT INTO rubber_compound_movements (compound_stock_id, movement_type, quantity_kg, reference_type, reference_id, notes, created_at)
          VALUES (
            v_stock_id,
            'OUT',
            v_total_kg,
            'DELIVERY_DEDUCTION',
            dn.id,
            'Delivery note ' || COALESCE(dn.delivery_note_number, '#' || dn.id),
            NOW()
          );

        END LOOP;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM rubber_compound_movements
      WHERE reference_type IN ('INVOICE_RECEIPT', 'DELIVERY_DEDUCTION')
        AND notes LIKE 'Supplier invoice %' OR notes LIKE 'Delivery note %'
    `);

    await queryRunner.query(`
      UPDATE rubber_compound_stock cs
      SET quantity_kg = COALESCE((
        SELECT SUM(
          CASE
            WHEN cm.movement_type = 'IN' THEN cm.quantity_kg
            WHEN cm.movement_type = 'OUT' THEN -cm.quantity_kg
            ELSE 0
          END
        )
        FROM rubber_compound_movements cm
        WHERE cm.compound_stock_id = cs.id
      ), 0)
    `);
  }
}
