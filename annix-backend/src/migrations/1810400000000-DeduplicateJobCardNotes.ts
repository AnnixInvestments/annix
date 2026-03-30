import { MigrationInterface, QueryRunner } from "typeorm";

export class DeduplicateJobCardNotes1810400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const jobCards: Array<{ id: number; notes: string }> = await queryRunner.query(`
      SELECT id, notes FROM job_cards
      WHERE notes IS NOT NULL
        AND notes != ''
        AND is_cpo_calloff = true
    `);

    const updates = jobCards
      .map((jc) => {
        const lines = jc.notes
          .split("\n")
          .map((l: string) => l.trim())
          .filter(Boolean);
        const unique = [...new Set(lines)];
        const deduped = unique.join("\n");
        return deduped !== jc.notes ? { id: jc.id, notes: deduped } : null;
      })
      .filter((u): u is { id: number; notes: string } => u !== null);

    for (const update of updates) {
      await queryRunner.query("UPDATE job_cards SET notes = $1 WHERE id = $2", [
        update.notes,
        update.id,
      ]);
    }

    const cpos: Array<{ id: number; coating_specs: string }> = await queryRunner.query(`
      SELECT id, coating_specs FROM customer_purchase_orders
      WHERE coating_specs IS NOT NULL
        AND coating_specs != ''
    `);

    const cpoUpdates = cpos
      .map((cpo) => {
        const lines = cpo.coating_specs
          .split("\n")
          .map((l: string) => l.trim())
          .filter(Boolean);
        const unique = [...new Set(lines)];
        const deduped = unique.join("\n");
        return deduped !== cpo.coating_specs ? { id: cpo.id, specs: deduped } : null;
      })
      .filter((u): u is { id: number; specs: string } => u !== null);

    for (const update of cpoUpdates) {
      await queryRunner.query(
        "UPDATE customer_purchase_orders SET coating_specs = $1 WHERE id = $2",
        [update.specs, update.id],
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // no-op
  }
}
