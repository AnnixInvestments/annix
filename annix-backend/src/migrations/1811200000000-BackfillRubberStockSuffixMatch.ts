import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillRubberStockSuffixMatch1811200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const backfillSql =
      "UPDATE stock_items si" +
      " SET" +
      " name = COALESCE(rpc.name, si.name)," +
      " description = CASE" +
      " WHEN rrs.thickness_mm IS NOT NULL OR rrs.width_mm IS NOT NULL OR rrs.length_m IS NOT NULL" +
      " THEN CONCAT_WS(' x '," +
      " CASE WHEN rrs.thickness_mm IS NOT NULL THEN rrs.thickness_mm || 'mm thick' END," +
      " CASE WHEN rrs.width_mm IS NOT NULL THEN rrs.width_mm || 'mm wide' END," +
      " CASE WHEN rrs.length_m IS NOT NULL THEN rrs.length_m || 'm long' END)" +
      " ELSE si.description END," +
      " category = 'RUBBER'," +
      " compound_code = COALESCE(rpc.code, si.compound_code)," +
      " thickness_mm = COALESCE(rrs.thickness_mm, si.thickness_mm)," +
      " width_mm = COALESCE(rrs.width_mm, si.width_mm)," +
      " length_m = COALESCE(rrs.length_m, si.length_m)," +
      " roll_number = rrs.roll_number" +
      " FROM rubber_roll_stock rrs" +
      " LEFT JOIN rubber_product_coding rpc ON rpc.id = rrs.compound_coding_id" +
      " WHERE rrs.roll_number LIKE '%-' || TRIM(" +
      "   CASE" +
      "     WHEN si.name ~* 'ROLL[\\s#-]*(\\d{4,6})' THEN SUBSTRING(si.name FROM '(\\d{4,6})')" +
      "     WHEN si.sku ~* 'Roll\\s*#?\\s*(\\d{4,6})' THEN SUBSTRING(si.sku FROM '(\\d{4,6})')" +
      "     ELSE NULL" +
      "   END)" +
      " AND si.roll_number IS NULL" +
      " AND si.category IS DISTINCT FROM 'RUBBER'";

    await queryRunner.query(backfillSql);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // no-op: backfill is idempotent, no rollback needed
  }
}
