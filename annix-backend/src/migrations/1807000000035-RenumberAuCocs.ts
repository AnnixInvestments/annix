import type { MigrationInterface, QueryRunner } from "typeorm";

export class RenumberAuCocs1807000000035 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const cocs = await queryRunner.query("SELECT id FROM rubber_au_cocs ORDER BY id ASC");

    for (let i = 0; i < cocs.length; i++) {
      const newNumber = `AU-COC-${String(i + 1).padStart(4, "0")}`;
      await queryRunner.query("UPDATE rubber_au_cocs SET coc_number = $1 WHERE id = $2", [
        newNumber,
        cocs[i].id,
      ]);
    }

    await queryRunner.query(
      `ALTER SEQUENCE rubber_au_coc_number_seq RESTART WITH ${cocs.length + 1}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cocs = await queryRunner.query("SELECT id FROM rubber_au_cocs ORDER BY id ASC");

    for (let i = 0; i < cocs.length; i++) {
      const oldNumber = `COC-${String(i + 1).padStart(5, "0")}`;
      await queryRunner.query("UPDATE rubber_au_cocs SET coc_number = $1 WHERE id = $2", [
        oldNumber,
        cocs[i].id,
      ]);
    }

    await queryRunner.query(
      `ALTER SEQUENCE rubber_au_coc_number_seq RESTART WITH ${cocs.length + 1}`,
    );
  }
}
