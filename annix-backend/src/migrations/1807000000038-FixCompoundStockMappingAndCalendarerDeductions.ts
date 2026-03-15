import { MigrationInterface, QueryRunner } from "typeorm";

export class FixCompoundStockMappingAndCalendarerDeductions1807000000038
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tablesExist = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'rubber_tax_invoices'
      ) AS invoices_exist,
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'rubber_compound_movements'
      ) AS movements_exist,
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'rubber_compound_stock'
      ) AS stock_exist
    `);
    if (
      !tablesExist[0]?.invoices_exist ||
      !tablesExist[0]?.movements_exist ||
      !tablesExist[0]?.stock_exist
    ) {
      return;
    }

    const BASIC_RUBBER_CODES = [
      "CR",
      "NBR",
      "NR",
      "EPDM",
      "SBR",
      "IIR",
      "CIIR",
      "CSM",
      "IRHD",
      "BR",
      "IR",
      "BIIR",
    ];

    const snInvoices = await queryRunner.query(`
      SELECT ti.id, ti.invoice_number, ti.extracted_data
      FROM rubber_tax_invoices ti
      JOIN rubber_company rc ON ti.company_id = rc.id
      WHERE rc.name ILIKE '%S&N%'
        AND ti.status = 'APPROVED'
        AND ti.invoice_type = 'SUPPLIER'
    `);

    for (const invoice of snInvoices) {
      const movements = await queryRunner.query(
        `SELECT cm.id, cm.compound_stock_id, cm.quantity_kg, cm.movement_type
         FROM rubber_compound_movements cm
         WHERE cm.reference_type = 'INVOICE_RECEIPT'
           AND cm.reference_id = $1`,
        [invoice.id],
      );

      for (const movement of movements) {
        const stock = await queryRunner.query(
          `SELECT cs.id, cs.quantity_kg, rpc.code
           FROM rubber_compound_stock cs
           JOIN rubber_product_coding rpc ON cs.compound_coding_id = rpc.id
           WHERE cs.id = $1`,
          [movement.compound_stock_id],
        );

        if (stock.length > 0 && BASIC_RUBBER_CODES.includes(stock[0].code)) {
          const newQty = Math.max(
            0,
            Number(stock[0].quantity_kg) - Number(movement.quantity_kg),
          );
          await queryRunner.query(
            "UPDATE rubber_compound_stock SET quantity_kg = $1 WHERE id = $2",
            [newQty, movement.compound_stock_id],
          );
          await queryRunner.query(
            "DELETE FROM rubber_compound_movements WHERE id = $1",
            [movement.id],
          );
        }
      }
    }

    const CURING_METHODS = ["SC", "AC", "PC", "RC"];

    for (const invoice of snInvoices) {
      const alreadyProcessed = await queryRunner.query(
        `SELECT 1 FROM rubber_compound_movements
         WHERE reference_type = 'INVOICE_RECEIPT' AND reference_id = $1
         LIMIT 1`,
        [invoice.id],
      );
      if (alreadyProcessed.length > 0) continue;

      const data = invoice.extracted_data;
      if (!data) continue;

      const textToSearch =
        data.productSummary ||
        (data.lineItems || []).map((i: { description: string }) => i.description).join(" ") ||
        "";

      let code: string | null = null;

      const dashMatch = textToSearch.match(
        /AU-([A-Z])(\d{2})-([A-Z]{1,2}(?:SC|AC|PC|RC))/i,
      );
      if (dashMatch) {
        code = dashMatch[0].replace(/-/g, "").toUpperCase();
      }

      if (!code) {
        const stripped = textToSearch.replace(/-/g, "");
        const plainMatch = stripped.match(
          /AU([A-Z])(\d{2})([A-Z]{1,2}(?:SC|AC|PC|RC))/i,
        );
        if (plainMatch) {
          code = plainMatch[0].toUpperCase();
        }
      }

      if (!code) continue;

      const suffix = code.slice(4);
      const hasCuringMethod = CURING_METHODS.some((cm) => suffix.endsWith(cm));
      if (!hasCuringMethod) continue;

      let codingRow = await queryRunner.query(
        `SELECT id FROM rubber_product_coding
         WHERE code = $1 AND coding_type = 'COMPOUND'`,
        [code],
      );

      if (codingRow.length === 0) {
        await queryRunner.query(
          `INSERT INTO rubber_product_coding (code, name, coding_type)
           VALUES ($1, $2, 'COMPOUND')`,
          [code, code],
        );
        codingRow = await queryRunner.query(
          `SELECT id FROM rubber_product_coding
           WHERE code = $1 AND coding_type = 'COMPOUND'`,
          [code],
        );
      }

      const codingId = codingRow[0].id;

      let qty: number | null = null;
      if (data.productQuantity != null && (data.productUnit || "").toLowerCase() === "kg") {
        qty = Number(data.productQuantity);
      }
      if (!qty || qty <= 0) {
        const kgMatch = textToSearch.match(/(\d[\d,.]*)\s*kg/i);
        if (kgMatch) {
          qty = Number(kgMatch[1].replace(/,/g, ""));
        }
      }
      if (!qty || qty <= 0) continue;

      let costPerKg: number | null = null;
      if (data.subtotal && qty > 0) {
        costPerKg = Math.round((Number(data.subtotal) / qty) * 100) / 100;
      }

      let stockRow = await queryRunner.query(
        `SELECT id FROM rubber_compound_stock WHERE compound_coding_id = $1`,
        [codingId],
      );

      if (stockRow.length === 0) {
        await queryRunner.query(
          `INSERT INTO rubber_compound_stock (firebase_uid, compound_coding_id, quantity_kg, min_stock_level_kg, reorder_point_kg, cost_per_kg)
           VALUES ($1, $2, 0, 0, 0, NULL)`,
          [
            `pg_${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            codingId,
          ],
        );
        stockRow = await queryRunner.query(
          `SELECT id FROM rubber_compound_stock WHERE compound_coding_id = $1`,
          [codingId],
        );
      }

      const stockId = stockRow[0].id;

      await queryRunner.query(
        `UPDATE rubber_compound_stock
         SET quantity_kg = quantity_kg + $1,
             cost_per_kg = COALESCE($2, cost_per_kg)
         WHERE id = $3`,
        [qty, costPerKg, stockId],
      );

      await queryRunner.query(
        `INSERT INTO rubber_compound_movements
         (compound_stock_id, movement_type, quantity_kg, reference_type, reference_id, notes, created_at)
         VALUES ($1, 'IN', $2, 'INVOICE_RECEIPT', $3, $4, NOW())`,
        [stockId, qty, invoice.id, `Supplier invoice ${invoice.invoice_number}`],
      );
    }

    const impiloInvoices = await queryRunner.query(`
      SELECT ti.id, ti.invoice_number, ti.extracted_data
      FROM rubber_tax_invoices ti
      JOIN rubber_company rc ON ti.company_id = rc.id
      WHERE rc.name ILIKE '%impilo%'
        AND ti.status = 'APPROVED'
        AND ti.invoice_type = 'SUPPLIER'
        AND NOT EXISTS (
          SELECT 1 FROM rubber_compound_movements cm
          WHERE cm.reference_type = 'CALENDARING' AND cm.reference_id = ti.id
        )
    `);

    const REVERSE_COLOR: Record<string, string> = {
      red: "R",
      black: "B",
      grey: "G",
      white: "W",
      natural: "N",
      yellow: "Y",
      orange: "O",
      green: "GR",
    };

    const DEFAULT_SG = 1.5;

    for (const invoice of impiloInvoices) {
      const data = invoice.extracted_data;
      if (!data) continue;

      const text =
        data.productSummary ||
        (data.lineItems || []).map((i: { description: string }) => i.description).join(" ") ||
        "";

      const rollMatch = text.match(
        /(\d+)\s*rolls?\s*(Steam(?:\s*cure)?|Autoclave|Press|Rotocure)\s*(\d+)\s*(Black|Red|Grey|White|Natural|Yellow|Orange|Green)\s*(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/i,
      );
      if (!rollMatch) continue;

      const quantity = data.productQuantity || Number(rollMatch[1]) || 1;
      const curingLower = rollMatch[2].toLowerCase().replace(/\s+/g, "");
      const curingCode = curingLower.includes("steam")
        ? "SC"
        : curingLower.includes("autoclave")
          ? "AC"
          : curingLower.includes("press")
            ? "PC"
            : "RC";
      const shore = String(rollMatch[3]).padStart(2, "0");
      const colorCode =
        REVERSE_COLOR[rollMatch[4].toLowerCase()] || rollMatch[4][0].toUpperCase();
      const thicknessMm = Number(rollMatch[5]);
      const widthMm = Number(rollMatch[6]);
      const lengthM = Number(rollMatch[7]);

      const compoundCode = `AUA${shore}${colorCode}${curingCode}`;

      let sgResult = await queryRunner.query(
        `SELECT rp.specific_gravity
         FROM rubber_product rp
         JOIN rubber_product_coding rpc ON rp.compound_firebase_uid = rpc.firebase_uid
         WHERE rpc.code = $1 AND rpc.coding_type = 'COMPOUND' AND rp.specific_gravity IS NOT NULL
         LIMIT 1`,
        [compoundCode],
      );
      const sg =
        sgResult.length > 0 && sgResult[0].specific_gravity
          ? Number(sgResult[0].specific_gravity)
          : DEFAULT_SG;

      const rollWeightKg = (thicknessMm / 1000) * (widthMm / 1000) * lengthM * sg * 1000;
      const totalKg = rollWeightKg * quantity;
      if (totalKg <= 0) continue;

      let codingRow = await queryRunner.query(
        `SELECT id FROM rubber_product_coding
         WHERE code = $1 AND coding_type = 'COMPOUND'`,
        [compoundCode],
      );

      if (codingRow.length === 0) {
        await queryRunner.query(
          `INSERT INTO rubber_product_coding (code, name, coding_type)
           VALUES ($1, $2, 'COMPOUND')`,
          [compoundCode, compoundCode],
        );
        codingRow = await queryRunner.query(
          `SELECT id FROM rubber_product_coding
           WHERE code = $1 AND coding_type = 'COMPOUND'`,
          [compoundCode],
        );
      }

      const codingId = codingRow[0].id;

      let stockRow = await queryRunner.query(
        `SELECT id FROM rubber_compound_stock WHERE compound_coding_id = $1`,
        [codingId],
      );

      if (stockRow.length === 0) {
        await queryRunner.query(
          `INSERT INTO rubber_compound_stock (firebase_uid, compound_coding_id, quantity_kg, min_stock_level_kg, reorder_point_kg, cost_per_kg)
           VALUES ($1, $2, 0, 0, 0, NULL)`,
          [
            `pg_${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            codingId,
          ],
        );
        stockRow = await queryRunner.query(
          `SELECT id FROM rubber_compound_stock WHERE compound_coding_id = $1`,
          [codingId],
        );
      }

      const stockId = stockRow[0].id;

      await queryRunner.query(
        `UPDATE rubber_compound_stock SET quantity_kg = quantity_kg - $1 WHERE id = $2`,
        [totalKg, stockId],
      );

      await queryRunner.query(
        `INSERT INTO rubber_compound_movements
         (compound_stock_id, movement_type, quantity_kg, reference_type, reference_id, notes, created_at)
         VALUES ($1, 'OUT', $2, 'CALENDARING', $3, $4, NOW())`,
        [
          stockId,
          totalKg,
          invoice.id,
          `Calendarer invoice ${invoice.invoice_number} (${quantity} roll${quantity !== 1 ? "s" : ""} × ${rollWeightKg.toFixed(1)} kg)`,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM rubber_compound_movements
      WHERE reference_type = 'CALENDARING'
        AND notes LIKE 'Calendarer invoice %'
    `);
  }
}
