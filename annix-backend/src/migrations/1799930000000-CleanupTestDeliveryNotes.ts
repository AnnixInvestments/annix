import { MigrationInterface, QueryRunner } from "typeorm";

export class CleanupTestDeliveryNotes1799930000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Delivery notes to delete (keep only DN-1772539282171)
    const deliveryNumbersToDelete = [
      "WHS394260-1772536741946",
      "DN-1772533247757",
      "WHS394260",
      "DN-1772530542804",
    ];

    for (const deliveryNumber of deliveryNumbersToDelete) {
      // Get the delivery note ID
      const deliveryNotes = await queryRunner.query(
        "SELECT id FROM delivery_notes WHERE delivery_number = $1",
        [deliveryNumber],
      );

      if (deliveryNotes.length === 0) {
        continue;
      }

      const deliveryNoteId = deliveryNotes[0].id;

      // Get stock movements for this delivery note and reverse the quantities
      const movements = await queryRunner.query(
        `SELECT stock_item_id, quantity FROM stock_movements
         WHERE reference_type = 'DELIVERY' AND reference_id = $1`,
        [deliveryNoteId],
      );

      for (const movement of movements) {
        // Subtract the quantity that was added
        await queryRunner.query("UPDATE stock_items SET quantity = quantity - $1 WHERE id = $2", [
          movement.quantity,
          movement.stock_item_id,
        ]);
      }

      // Delete stock movements for this delivery note
      await queryRunner.query(
        `DELETE FROM stock_movements WHERE reference_type = 'DELIVERY' AND reference_id = $1`,
        [deliveryNoteId],
      );

      // Delete delivery note items
      await queryRunner.query("DELETE FROM delivery_note_items WHERE delivery_note_id = $1", [
        deliveryNoteId,
      ]);

      // Delete the delivery note
      await queryRunner.query("DELETE FROM delivery_notes WHERE id = $1", [deliveryNoteId]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration cannot be reversed as it deletes test data
  }
}
