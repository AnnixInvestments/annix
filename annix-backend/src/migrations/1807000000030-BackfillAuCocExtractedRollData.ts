import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillAuCocExtractedRollData1807000000030 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE rubber_au_cocs ac
      SET extracted_roll_data = (
        SELECT jsonb_agg(
          jsonb_build_object(
            'rollNumber', COALESCE(roll->>'rollNumber', ''),
            'thicknessMm', (roll->>'thicknessMm')::numeric,
            'widthMm', (roll->>'widthMm')::numeric,
            'lengthM', (roll->>'lengthM')::numeric,
            'weightKg', (roll->>'weightKg')::numeric,
            'areaSqM', (roll->>'areaSqM')::numeric
          )
        )
        FROM rubber_delivery_notes dn,
             jsonb_array_elements(dn.extracted_data->'rolls') AS roll
        WHERE dn.id = ac.source_delivery_note_id
      )
      WHERE ac.extracted_roll_data IS NULL
        AND ac.source_delivery_note_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM rubber_delivery_notes dn
          WHERE dn.id = ac.source_delivery_note_id
            AND dn.extracted_data IS NOT NULL
            AND jsonb_array_length(COALESCE(dn.extracted_data->'rolls', '[]'::jsonb)) > 0
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE rubber_au_cocs
      SET extracted_roll_data = NULL
      WHERE extracted_roll_data IS NOT NULL
    `);
  }
}
