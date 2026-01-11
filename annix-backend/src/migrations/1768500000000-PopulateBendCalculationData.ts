import { MigrationInterface, QueryRunner } from 'typeorm';

export class PopulateBendCalculationData1768500000000
  implements MigrationInterface
{
  name = 'PopulateBendCalculationData1768500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "bend_rfqs"
      SET "calculation_data" = jsonb_build_object(
        'tangentLengths', COALESCE("tangent_lengths", '[]'::json),
        'numberOfSegments', COALESCE("number_of_segments", 0)
      )
      WHERE "calculation_data" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "bend_rfqs"
      SET "calculation_data" = COALESCE("calculation_data", '{}'::jsonb) || jsonb_build_object(
        'tangentLengths', COALESCE("tangent_lengths", '[]'::json)
      )
      WHERE "calculation_data" IS NOT NULL
        AND NOT ("calculation_data" ? 'tangentLengths')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "bend_rfqs"
      SET "calculation_data" = "calculation_data" - 'tangentLengths' - 'numberOfSegments'
      WHERE "calculation_data" IS NOT NULL
    `);
  }
}
