import { MigrationInterface, QueryRunner } from "typeorm";

export class MergeDuplicateSprayTips1799950000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicatePairs = [
      { keepSku: "200-219", mergeSku: "ST-219" },
      { keepSku: "200-317", mergeSku: "ST-317" },
      { keepSku: "200-319", mergeSku: "ST-319" },
    ];

    for (const pair of duplicatePairs) {
      const keepItem = await queryRunner.query(
        "SELECT id, quantity FROM stock_items WHERE sku = $1",
        [pair.keepSku],
      );
      const mergeItem = await queryRunner.query(
        "SELECT id, quantity FROM stock_items WHERE sku = $1",
        [pair.mergeSku],
      );

      if (keepItem.length === 0 || mergeItem.length === 0) {
        console.log(`Skipping ${pair.mergeSku} -> ${pair.keepSku}: one or both items not found`);
        continue;
      }

      const keepId = keepItem[0].id;
      const mergeId = mergeItem[0].id;
      const keepQty = parseFloat(keepItem[0].quantity) || 0;
      const mergeQty = parseFloat(mergeItem[0].quantity) || 0;
      const totalQty = keepQty + mergeQty;

      console.log(
        `Merging ${pair.mergeSku} (id=${mergeId}, qty=${mergeQty}) into ${pair.keepSku} (id=${keepId}, qty=${keepQty}) -> total: ${totalQty}`,
      );

      await queryRunner.query("UPDATE stock_items SET quantity = $1 WHERE id = $2", [
        totalQty,
        keepId,
      ]);

      await queryRunner.query(
        "UPDATE stock_movements SET stock_item_id = $1 WHERE stock_item_id = $2",
        [keepId, mergeId],
      );

      await queryRunner.query(
        "UPDATE delivery_note_items SET stock_item_id = $1 WHERE stock_item_id = $2",
        [keepId, mergeId],
      );

      await queryRunner.query(
        "UPDATE stock_allocations SET stock_item_id = $1 WHERE stock_item_id = $2",
        [keepId, mergeId],
      );

      await queryRunner.query("DELETE FROM stock_items WHERE id = $1", [mergeId]);

      console.log(`Successfully merged ${pair.mergeSku} into ${pair.keepSku}`);
    }
  }

  public async down(): Promise<void> {
    console.log("Cannot reverse merge - data has been consolidated");
  }
}
