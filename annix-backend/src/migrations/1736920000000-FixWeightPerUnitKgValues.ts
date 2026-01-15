import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixWeightPerUnitKgValues1736920000000 implements MigrationInterface {
  name = 'FixWeightPerUnitKgValues1736920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix weight_per_unit_kg for straight pipes
    // The correct formula is: weight_per_unit_kg = total_weight_kg / quantity
    // Previously, some records incorrectly stored pipe_weight_per_meter instead
    await queryRunner.query(`
      UPDATE rfq_items ri
      SET weight_per_unit_kg = ROUND((ri.total_weight_kg / NULLIF(ri.quantity, 0))::numeric, 3)
      WHERE ri.item_type = 'straight_pipe'
        AND ri.quantity > 0
        AND ri.total_weight_kg > 0
        AND ri.weight_per_unit_kg IS DISTINCT FROM ROUND((ri.total_weight_kg / ri.quantity)::numeric, 3)
    `);

    console.log(
      'Updated rfq_items weight_per_unit_kg values using formula: total_weight_kg / quantity',
    );

    // Also fix BOQ line items that were created from incorrect RFQ data
    // Update unit_weight_kg and total_weight_kg to match the corrected RFQ items
    await queryRunner.query(`
      UPDATE boq_line_items bli
      SET
        unit_weight_kg = ri.weight_per_unit_kg,
        total_weight_kg = ri.total_weight_kg
      FROM boqs b
      JOIN rfqs r ON r.id = b.rfq_id
      JOIN rfq_items ri ON ri.rfq_id = r.id
      WHERE bli.boq_id = b.id
        AND bli.line_number = ri.line_number
        AND (bli.unit_weight_kg IS DISTINCT FROM ri.weight_per_unit_kg
             OR bli.total_weight_kg IS DISTINCT FROM ri.total_weight_kg)
    `);

    console.log(
      'Updated boq_line_items weights to match corrected rfq_items',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      'Cannot revert weight_per_unit_kg values - would need original values stored',
    );
  }
}
