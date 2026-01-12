import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPipeDimensionsMassValues1768500000000 implements MigrationInterface {
  name = 'FixPipeDimensionsMassValues1768500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE pipe_dimensions pd
      SET mass_kgm = ROUND(
        (((nod.outside_diameter_mm - pd.wall_thickness_mm) * pd.wall_thickness_mm) * 0.02466)::numeric,
        2
      )
      FROM nominal_outside_diameters nod
      WHERE nod.id = pd.nominal_outside_diameter_id
    `);

    console.log(
      'Updated pipe_dimensions mass_kgm values using formula: ((OD - WT) * WT) * 0.02466',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log(
      'Cannot revert mass values - would need original values stored',
    );
  }
}
