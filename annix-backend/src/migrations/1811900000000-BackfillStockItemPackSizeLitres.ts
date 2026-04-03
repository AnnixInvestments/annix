import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillStockItemPackSizeLitres1811900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE stock_items si
      SET pack_size_litres = sub.volume
      FROM (
        SELECT DISTINCT ON (s.id)
          s.id AS stock_item_id,
          (li.value ->> 'volumeLitersPerPack')::numeric AS volume
        FROM stock_items s
        JOIN delivery_note_items dni ON dni.stock_item_id = s.id
        JOIN delivery_notes dn ON dn.id = dni.delivery_note_id
        CROSS JOIN LATERAL jsonb_array_elements(dn.extracted_data -> 'lineItems') AS li(value)
        WHERE s.pack_size_litres IS NULL
          AND s.unit_of_measure = 'L'
          AND dn.extracted_data IS NOT NULL
          AND dn.extracted_data -> 'lineItems' IS NOT NULL
          AND jsonb_typeof(dn.extracted_data -> 'lineItems') = 'array'
          AND (li.value ->> 'isPaint')::boolean = true
          AND (li.value ->> 'volumeLitersPerPack') IS NOT NULL
          AND (li.value ->> 'volumeLitersPerPack')::numeric > 0
          AND (
            LOWER(COALESCE(li.value ->> 'description', '')) LIKE '%' || LOWER(LEFT(s.name, 30)) || '%'
            OR LOWER(s.name) LIKE '%' || LOWER(LEFT(COALESCE(li.value ->> 'description', ''), 30)) || '%'
          )
        ORDER BY s.id, dn.created_at DESC
      ) sub
      WHERE si.id = sub.stock_item_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No rollback — cannot distinguish backfilled items from those set by other means
  }
}
