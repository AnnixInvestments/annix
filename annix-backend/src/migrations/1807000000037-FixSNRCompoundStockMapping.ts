import { MigrationInterface, QueryRunner } from "typeorm";

export class FixSNRCompoundStockMapping1807000000037 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tablesExist = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'rubber_tax_invoices'
      ) AS invoices_exist,
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'rubber_compound_movement'
      ) AS movements_exist
    `);
    if (!tablesExist[0]?.invoices_exist || !tablesExist[0]?.movements_exist) {
      return;
    }

    const invoiceRows = await queryRunner.query(`
      SELECT ti.id, ti.invoice_number, ti.extracted_data
      FROM rubber_tax_invoices ti
      JOIN rubber_company rc ON ti.company_id = rc.id
      WHERE rc.name ILIKE '%S&N%'
        AND ti.status = 'APPROVED'
        AND ti.invoice_type = 'SUPPLIER'
        AND (
          ti.extracted_data::text ILIKE '%A38%'
          OR ti.extracted_data::text ILIKE '%A40%'
        )
    `);

    for (const invoice of invoiceRows) {
      const movements = await queryRunner.query(
        `SELECT cm.id, cm.compound_stock_id, cm.quantity_kg, cm.movement_type
         FROM rubber_compound_movement cm
         WHERE cm.reference_type = 'INVOICE_RECEIPT'
           AND cm.reference_id = $1`,
        [invoice.id],
      );

      for (const movement of movements) {
        const stock = await queryRunner.query(
          `SELECT cs.id, cs.quantity_kg, rpc.code, rpc.name
           FROM rubber_compound_stock cs
           JOIN rubber_product_coding rpc ON cs.compound_coding_id = rpc.id
           WHERE cs.id = $1`,
          [movement.compound_stock_id],
        );

        if (stock.length > 0) {
          const compoundCode = stock[0].code;
          const isRubberTypeCode = [
            "CR",
            "NBR",
            "NR",
            "EPDM",
            "SBR",
            "IIR",
            "CIIR",
            "CSM",
            "IRHD",
          ].includes(compoundCode);

          if (isRubberTypeCode) {
            const newQty = Math.max(0, Number(stock[0].quantity_kg) - Number(movement.quantity_kg));
            await queryRunner.query(
              "UPDATE rubber_compound_stock SET quantity_kg = $1 WHERE id = $2",
              [newQty, movement.compound_stock_id],
            );
            await queryRunner.query("DELETE FROM rubber_compound_movement WHERE id = $1", [
              movement.id,
            ]);
          }
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Data correction — no automatic rollback
  }
}
