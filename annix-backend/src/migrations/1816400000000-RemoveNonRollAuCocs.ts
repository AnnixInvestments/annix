import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveNonRollAuCocs1816400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const nonRollIds = [37, 38, 47, 48, 55, 56];

    await queryRunner.query("DELETE FROM rubber_au_coc_items WHERE au_coc_id = ANY($1)", [
      nonRollIds,
    ]);

    await queryRunner.query(
      "UPDATE rubber_roll_stock SET au_coc_id = NULL WHERE au_coc_id = ANY($1)",
      [nonRollIds],
    );

    await queryRunner.query("DELETE FROM rubber_au_cocs WHERE id = ANY($1)", [nonRollIds]);

    const remaining: { id: number }[] = await queryRunner.query(
      "SELECT id FROM rubber_au_cocs ORDER BY id ASC",
    );

    for (let i = 0; i < remaining.length; i++) {
      const newNumber = `AU-COC-${String(i + 1).padStart(4, "0")}`;
      await queryRunner.query("UPDATE rubber_au_cocs SET coc_number = $1 WHERE id = $2", [
        newNumber,
        remaining[i].id,
      ]);
    }

    const nextVal = remaining.length + 1;
    await queryRunner.query(`SELECT setval('rubber_au_coc_number_seq', $1, false)`, [nextVal]);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Data cleanup migration - not reversible
  }
}
