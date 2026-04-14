import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillRollNumbersOnInvoiceItems1819600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const rollPattern = "^\\s*[Rr]oll\\s*#?\\s*([A-Za-z0-9-]+)\\s*$";

    type Row = {
      id: string;
      invoice_id: string;
      line_number: string;
      extracted_description: string | null;
    };

    const allRows: Row[] = await queryRunner.query(
      `SELECT id, invoice_id, line_number, extracted_description
       FROM supplier_invoice_items
       ORDER BY invoice_id ASC, line_number ASC, id ASC`,
    );

    const byInvoice = allRows.reduce<Map<string, Row[]>>((acc, row) => {
      const key = String(row.invoice_id);
      const existing = acc.get(key) || [];
      existing.push(row);
      acc.set(key, existing);
      return acc;
    }, new Map());

    const rollRe = new RegExp(rollPattern);

    const deleteIds: string[] = [];
    const parentUpdates: { id: string; rolls: string[] }[] = [];

    byInvoice.forEach((rows) => {
      let parent: Row | null = null;
      let parentRolls: string[] = [];

      const flush = () => {
        if (parent && parentRolls.length > 0) {
          parentUpdates.push({ id: parent.id, rolls: parentRolls });
        }
        parent = null;
        parentRolls = [];
      };

      rows.forEach((row) => {
        const desc = row.extracted_description || "";
        const match = desc.match(rollRe);
        if (match && parent) {
          parentRolls.push(match[1]);
          deleteIds.push(row.id);
          return;
        }
        flush();
        parent = row;
        parentRolls = [];
      });

      flush();
    });

    await parentUpdates.reduce(async (prev, update) => {
      await prev;
      await queryRunner.query(
        `UPDATE supplier_invoice_items
         SET roll_numbers = $1::jsonb,
             quantity = $2
         WHERE id = $3`,
        [JSON.stringify(update.rolls), update.rolls.length, update.id],
      );
    }, Promise.resolve());

    if (deleteIds.length > 0) {
      const chunkSize = 500;
      const chunks: string[][] = [];
      for (let i = 0; i < deleteIds.length; i += chunkSize) {
        chunks.push(deleteIds.slice(i, i + chunkSize));
      }
      await chunks.reduce(async (prev, chunk) => {
        await prev;
        await queryRunner.query("DELETE FROM supplier_invoice_items WHERE id = ANY($1::int[])", [
          chunk.map((id) => Number(id)),
        ]);
      }, Promise.resolve());
    }
  }

  public async down(): Promise<void> {
    // Data-only backfill; cannot reverse.
  }
}
