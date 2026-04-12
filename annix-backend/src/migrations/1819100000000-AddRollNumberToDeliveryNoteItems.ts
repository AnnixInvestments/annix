import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRollNumberToDeliveryNoteItems1819100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE delivery_note_items
      ADD COLUMN IF NOT EXISTS roll_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10, 2)
    `);

    await queryRunner.query(`
      UPDATE delivery_note_items dni
      SET
        roll_number = sub.roll_number,
        weight_kg = sub.weight_kg
      FROM (
        SELECT
          dni2.id AS dni_id,
          SUBSTRING(si.name FROM 'Roll\\s*#\\s*(\\d{4,6})') AS roll_number,
          CASE
            WHEN si.name ~* 'Roll\\s*#\\s*\\d{4,6}' AND si.unit_of_measure = 'kg'
            THEN si.quantity
            ELSE NULL
          END AS weight_kg
        FROM delivery_note_items dni2
        JOIN stock_items si ON si.id = dni2.stock_item_id
        JOIN delivery_notes dn ON dn.id = dni2.delivery_note_id
        WHERE dn.supplier_name ILIKE '%Impilo%'
          AND si.name ~* 'Roll\\s*#\\s*\\d{4,6}'
      ) sub
      WHERE dni.id = sub.dni_id
        AND dni.roll_number IS NULL
    `);

    await queryRunner.query(`
      UPDATE stock_items si
      SET
        name = CASE
          WHEN ed.parent_desc IS NOT NULL AND LENGTH(TRIM(ed.parent_desc)) > 5
          THEN TRIM(ed.parent_desc)
          ELSE si.name
        END
      FROM (
        SELECT
          dni.stock_item_id,
          dn.id AS dn_id,
          (
            SELECT TRIM(
              REGEXP_REPLACE(
                COALESCE(
                  (item_data->>'description'),
                  ''
                ),
                'Roll\\s*#\\s*\\d{4,6}', '', 'gi'
              )
            )
            FROM delivery_notes dn2,
                 jsonb_array_elements(dn2.extracted_data->'lineItems') AS item_data
            WHERE dn2.id = dn.id
              AND (item_data->>'description') IS NOT NULL
              AND LENGTH(TRIM(REGEXP_REPLACE(COALESCE(item_data->>'description', ''), 'Roll\\s*#\\s*\\d{4,6}', '', 'gi'))) > 10
            LIMIT 1
          ) AS parent_desc
        FROM delivery_note_items dni
        JOIN stock_items s ON s.id = dni.stock_item_id
        JOIN delivery_notes dn ON dn.id = dni.delivery_note_id
        WHERE dn.supplier_name ILIKE '%Impilo%'
          AND s.name ~* '^Roll\\s*#\\s*\\d{4,6}$'
      ) ed
      WHERE si.id = ed.stock_item_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE delivery_note_items
      DROP COLUMN IF EXISTS weight_kg,
      DROP COLUMN IF EXISTS roll_number
    `);
  }
}
