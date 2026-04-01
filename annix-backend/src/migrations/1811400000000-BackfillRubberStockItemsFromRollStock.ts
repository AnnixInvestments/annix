import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillRubberStockItemsFromRollStock1811400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE stock_items si
      SET
        name = COALESCE(rpc.name, si.name),
        sku = CASE
          WHEN rpc.code IS NOT NULL THEN rpc.code || '-R' || SUBSTRING(si.name FROM '(\\d{4,6})')
          ELSE si.sku
        END,
        description = 'Roll #' || SUBSTRING(si.name FROM '(\\d{4,6})') ||
          CASE
            WHEN rrs.thickness_mm IS NOT NULL OR rrs.width_mm IS NOT NULL OR rrs.length_m IS NOT NULL
            THEN ' — ' || CONCAT_WS(' x ',
              CASE WHEN rrs.thickness_mm IS NOT NULL THEN rrs.thickness_mm || 'mm thick' END,
              CASE WHEN rrs.width_mm IS NOT NULL THEN rrs.width_mm || 'mm wide' END,
              CASE WHEN rrs.length_m IS NOT NULL THEN rrs.length_m || 'm long' END
            )
            ELSE ''
          END,
        category = 'RUBBER',
        compound_code = COALESCE(rpc.code, si.compound_code),
        thickness_mm = COALESCE(rrs.thickness_mm, si.thickness_mm),
        width_mm = COALESCE(rrs.width_mm, si.width_mm),
        length_m = COALESCE(rrs.length_m, si.length_m),
        roll_number = rrs.roll_number
      FROM rubber_roll_stock rrs
      LEFT JOIN rubber_product_coding rpc ON rpc.id = rrs.compound_coding_id
      WHERE (si.name ~* 'ROLL[\\s#-]*(\\d{4,6})' OR si.sku ~* 'Roll\\s*#?\\s*(\\d{4,6})')
        AND si.roll_number IS NULL
        AND (
          rrs.roll_number = SUBSTRING(si.name FROM '(\\d{4,6})')
          OR rrs.roll_number LIKE '%-' || SUBSTRING(si.name FROM '(\\d{4,6})')
        )
    `);

    await queryRunner.query(`
      UPDATE stock_items
      SET
        category = 'RUBBER',
        roll_number = SUBSTRING(name FROM '(\\d{4,6})'),
        description = COALESCE(
          NULLIF(description, ''),
          'Roll #' || SUBSTRING(name FROM '(\\d{4,6})')
        )
      WHERE (name ~* 'ROLL[\\s#-]*(\\d{4,6})' OR sku ~* 'Roll\\s*#?\\s*(\\d{4,6})')
        AND category IS DISTINCT FROM 'RUBBER'
        AND roll_number IS NULL
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    /* Data enrichment — no rollback */
  }
}
