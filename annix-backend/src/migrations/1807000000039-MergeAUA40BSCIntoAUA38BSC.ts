import { MigrationInterface, QueryRunner } from "typeorm";

export class MergeAUA40BSCIntoAUA38BSC1807000000039 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tablesExist = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'rubber_product_coding'
      ) AS coding_exist,
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'rubber_compound_stock'
      ) AS stock_exist,
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'rubber_compound_movements'
      ) AS movements_exist
    `);
    if (
      !tablesExist[0]?.coding_exist ||
      !tablesExist[0]?.stock_exist ||
      !tablesExist[0]?.movements_exist
    ) {
      return;
    }

    const oldCoding = await queryRunner.query(
      `SELECT id FROM rubber_product_coding WHERE code = 'AUA40BSC' AND coding_type = 'COMPOUND' LIMIT 1`,
    );
    const newCoding = await queryRunner.query(
      `SELECT id FROM rubber_product_coding WHERE code = 'AUA38BSC' AND coding_type = 'COMPOUND' LIMIT 1`,
    );

    if (oldCoding.length === 0 || newCoding.length === 0) {
      return;
    }

    const oldCodingId = oldCoding[0].id;
    const newCodingId = newCoding[0].id;

    const oldStock = await queryRunner.query(
      "SELECT id, quantity_kg FROM rubber_compound_stock WHERE compound_coding_id = $1 LIMIT 1",
      [oldCodingId],
    );
    const newStock = await queryRunner.query(
      "SELECT id, quantity_kg FROM rubber_compound_stock WHERE compound_coding_id = $1 LIMIT 1",
      [newCodingId],
    );

    if (oldStock.length === 0 || newStock.length === 0) {
      return;
    }

    const oldStockId = oldStock[0].id;
    const newStockId = newStock[0].id;
    const oldQuantity = Number(oldStock[0].quantity_kg);

    await queryRunner.query(
      "UPDATE rubber_compound_movements SET compound_stock_id = $1 WHERE compound_stock_id = $2",
      [newStockId, oldStockId],
    );

    await queryRunner.query(
      "UPDATE rubber_compound_stock SET quantity_kg = quantity_kg + $1 WHERE id = $2",
      [oldQuantity, newStockId],
    );

    await queryRunner.query("DELETE FROM rubber_compound_stock WHERE id = $1", [oldStockId]);

    const productRefs = await queryRunner.query(
      `SELECT id FROM rubber_product WHERE compound_firebase_uid = (
        SELECT firebase_uid FROM rubber_product_coding WHERE id = $1
      ) LIMIT 1`,
      [oldCodingId],
    );

    if (productRefs.length === 0) {
      await queryRunner.query("DELETE FROM rubber_product_coding WHERE id = $1", [oldCodingId]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
