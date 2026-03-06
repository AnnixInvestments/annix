import type { MigrationInterface, QueryRunner } from "typeorm";
import { nowISO } from "../lib/datetime";

export class AddSans1198TypeCodings1800500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const timestamp = nowISO();

    const typeCodes = [
      { code: "3", name: "Type 3" },
      { code: "4", name: "Type 4" },
      { code: "5", name: "Type 5" },
    ];

    for (const { code, name } of typeCodes) {
      const existing = await queryRunner.query(
        `SELECT id FROM rubber_product_coding WHERE coding_type = 'TYPE' AND code = $1`,
        [code],
      );
      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO rubber_product_coding (firebase_uid, coding_type, code, name, created_at, updated_at)
           VALUES ($1, 'TYPE', $2, $3, $4, $4)`,
          [`sans1198-type${code}`, code, name, timestamp],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM rubber_product_coding WHERE coding_type = 'TYPE' AND code IN ('3', '4', '5')`,
    );
  }
}
