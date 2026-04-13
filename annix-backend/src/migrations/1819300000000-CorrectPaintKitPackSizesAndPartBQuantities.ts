import { MigrationInterface, QueryRunner } from "typeorm";

export class CorrectPaintKitPackSizesAndPartBQuantities1819300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Jotamastic 90 small kits: Part A 3.62L + Part B 1.0L = 4.62L total
    await queryRunner.query(`
      UPDATE stock_items SET pack_size_litres = 4.62
      WHERE id IN (72, 73, 74, 75, 76)
        AND pack_size_litres = 3.62
    `);

    // Jotamastic 90 large kit: Part A 15.6L + Part B 4.4L = 20.0L total
    await queryRunner.query(`
      UPDATE stock_items SET pack_size_litres = 20.0
      WHERE id = 71 AND pack_size_litres = 15.60
    `);

    // Penguard Express kits: Part A 4.0L + Part B 1.0L = 5.0L total
    await queryRunner.query(`
      UPDATE stock_items SET pack_size_litres = 5.0
      WHERE id IN (80, 81, 82)
        AND pack_size_litres = 4.00
    `);

    // Hardtop Flexi kits: Part A 4.04L + Part B 1.0L = 5.04L total
    await queryRunner.query(`
      UPDATE stock_items SET pack_size_litres = 5.04
      WHERE id IN (85, 86, 87, 88, 89, 90)
        AND pack_size_litres = 4.04
    `);

    // Barrier 80: Part A 7.5L + Part B 1.25L = 8.75L total
    await queryRunner.query(`
      UPDATE stock_items SET pack_size_litres = 8.75
      WHERE id = 84 AND pack_size_litres = 7.50
    `);

    // Carbothane 137HS kits: Part A 4.0L + Part B 1.0L = 5.0L total
    await queryRunner.query(`
      UPDATE stock_items SET pack_size_litres = 5.0
      WHERE id IN (108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118)
        AND pack_size_litres = 4.00
    `);

    // Carbothane 134: pack_size_litres was 134 (product number, not volume)
    await queryRunner.query(`
      UPDATE stock_items SET pack_size_litres = 5.0
      WHERE id = 119 AND pack_size_litres = 134.00
    `);

    // CARB. 137HS Part A kit: 4.0L → 5.0L total
    await queryRunner.query(`
      UPDATE stock_items SET pack_size_litres = 5.0
      WHERE id = 310 AND pack_size_litres = 4.00
    `);

    // Proguard Pipe Blue: Part A 4.29L + Part B 0.71L = 5.0L total
    await queryRunner.query(`
      UPDATE stock_items SET pack_size_litres = 5.0
      WHERE id = 79 AND pack_size_litres = 4.29
    `);

    // Thermaline 400: Part A 4.0L + Part B 1.0L = 5.0L total
    await queryRunner.query(`
      UPDATE stock_items SET pack_size_litres = 5.0
      WHERE id = 121 AND pack_size_litres = 4.00
    `);

    // Sync Part B quantities to match kit totals
    // Jotamastic 90 Comp B 1L (ID 212): sum of small kits (72+73+74+75+76)
    await queryRunner.query(`
      UPDATE stock_items SET quantity = (
        SELECT COALESCE(SUM(quantity), 0) FROM stock_items WHERE id IN (72, 73, 74, 75, 76)
      ) WHERE id = 212
    `);

    // Jotamastic 90 Comp B 4.4L (ID 256): large kit qty * 4.4
    await queryRunner.query(`
      UPDATE stock_items SET quantity = (
        SELECT quantity * 4.4 FROM stock_items WHERE id = 71
      ) WHERE id = 256
    `);

    // Jotamastic 90 Part A 3.62L (ID 211): Beige kit qty * 3.62
    await queryRunner.query(`
      UPDATE stock_items SET quantity = (
        SELECT quantity * 3.62 FROM stock_items WHERE id = 73
      ) WHERE id = 211
    `);

    // Jotamastic 90 Alu A 15.6L (ID 255): Alu kit qty * 15.6
    await queryRunner.query(`
      UPDATE stock_items SET quantity = (
        SELECT quantity * 15.6 FROM stock_items WHERE id = 71
      ) WHERE id = 255
    `);

    // Penguard Express Comp B 1L (ID 214): sum of kits (80+81+82)
    await queryRunner.query(`
      UPDATE stock_items SET quantity = (
        SELECT COALESCE(SUM(quantity), 0) FROM stock_items WHERE id IN (80, 81, 82)
      ) WHERE id = 214
    `);

    // Penguard Express MIO Buff A 4L (ID 213): MIO Buff kit qty * 4
    await queryRunner.query(`
      UPDATE stock_items SET quantity = (
        SELECT quantity * 4 FROM stock_items WHERE id = 80
      ) WHERE id = 213
    `);

    // Hardtop Flexi Comp B 1L (ID 221): sum of kits
    await queryRunner.query(`
      UPDATE stock_items SET quantity = (
        SELECT COALESCE(SUM(quantity), 0) FROM stock_items WHERE id IN (85, 86, 87, 88, 89, 90)
      ) WHERE id = 221
    `);

    // Hardtop Flexi Comp A 3.81L (ID 220): sum of kits * 3.81
    await queryRunner.query(`
      UPDATE stock_items SET quantity = (
        SELECT COALESCE(SUM(quantity), 0) * 3.81 FROM stock_items WHERE id IN (85, 86, 87, 88, 89, 90)
      ) WHERE id = 220
    `);

    // Proguard Part A (ID 209): kit qty * 4.29
    await queryRunner.query(`
      UPDATE stock_items SET quantity = (
        SELECT quantity * 4.29 FROM stock_items WHERE id = 79
      ) WHERE id = 209
    `);

    // Proguard Part B (ID 210): kit qty * 0.71
    await queryRunner.query(`
      UPDATE stock_items SET quantity = (
        SELECT quantity * 0.71 FROM stock_items WHERE id = 79
      ) WHERE id = 210
    `);

    // CARB. 137HS Part B (ID 311): match Part A qty (ID 310)
    await queryRunner.query(`
      UPDATE stock_items SET quantity = (
        SELECT quantity FROM stock_items WHERE id = 310
      ) WHERE id = 311
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert pack sizes back to Part A only values
    await queryRunner.query(
      "UPDATE stock_items SET pack_size_litres = 3.62 WHERE id IN (72, 73, 74, 75, 76)",
    );
    await queryRunner.query("UPDATE stock_items SET pack_size_litres = 15.60 WHERE id = 71");
    await queryRunner.query(
      "UPDATE stock_items SET pack_size_litres = 4.00 WHERE id IN (80, 81, 82)",
    );
    await queryRunner.query(
      "UPDATE stock_items SET pack_size_litres = 4.04 WHERE id IN (85, 86, 87, 88, 89, 90)",
    );
    await queryRunner.query("UPDATE stock_items SET pack_size_litres = 7.50 WHERE id = 84");
    await queryRunner.query(
      "UPDATE stock_items SET pack_size_litres = 4.00 WHERE id IN (108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118)",
    );
    await queryRunner.query("UPDATE stock_items SET pack_size_litres = 134.00 WHERE id = 119");
    await queryRunner.query("UPDATE stock_items SET pack_size_litres = 4.00 WHERE id = 310");
    await queryRunner.query("UPDATE stock_items SET pack_size_litres = 4.29 WHERE id = 79");
    await queryRunner.query("UPDATE stock_items SET pack_size_litres = 4.00 WHERE id = 121");
  }
}
