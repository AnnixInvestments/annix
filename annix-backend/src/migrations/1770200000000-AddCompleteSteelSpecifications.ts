import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompleteSteelSpecifications1770200000000 implements MigrationInterface {
  name = "AddCompleteSteelSpecifications1770200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO steel_specifications (steel_spec_name)
      VALUES
        -- South African Standards (ensure these exist)
        ('SABS 62 ERW Medium'),
        ('SABS 62 ERW Heavy'),
        ('SABS 719 ERW'),

        -- Carbon Steel - ASTM A106 (High-Temp Seamless)
        ('ASTM A106 Grade A'),
        ('ASTM A106 Grade B'),
        ('ASTM A106 Grade C'),

        -- Carbon Steel - ASTM A53 (General Purpose)
        ('ASTM A53 Grade A'),
        ('ASTM A53 Grade B'),

        -- Line Pipe - API 5L (Oil/Gas Pipelines)
        ('API 5L Grade A'),
        ('API 5L Grade B'),
        ('API 5L X42'),
        ('API 5L X46'),
        ('API 5L X52'),
        ('API 5L X56'),
        ('API 5L X60'),
        ('API 5L X65'),
        ('API 5L X70'),
        ('API 5L X80'),

        -- Low Temperature - ASTM A333
        ('ASTM A333 Grade 1'),

        -- Heat Exchangers/Boilers
        ('ASTM A179'),
        ('ASTM A192'),

        -- Structural Tubing - ASTM A500
        ('ASTM A500 Grade A'),
        ('ASTM A500 Grade B'),
        ('ASTM A500 Grade C'),

        -- EN Standards
        ('EN 10217'),
        ('EN 10216'),
        ('EN 10255'),

        -- Additional common specs
        ('ASTM A333 Grade 4'),
        ('ASTM A333 Grade 7'),
        ('ASTM A333 Grade 8'),
        ('API 5L X90'),
        ('API 5L X100')
      ON CONFLICT (steel_spec_name) DO NOTHING
    `);

    console.warn("Added complete set of steel specifications");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM steel_specifications
      WHERE steel_spec_name IN (
        'SABS 62 ERW Medium',
        'SABS 62 ERW Heavy',
        'SABS 719 ERW',
        'ASTM A106 Grade A',
        'ASTM A106 Grade B',
        'ASTM A106 Grade C',
        'ASTM A53 Grade A',
        'ASTM A53 Grade B',
        'API 5L Grade A',
        'API 5L Grade B',
        'API 5L X42',
        'API 5L X46',
        'API 5L X52',
        'API 5L X56',
        'API 5L X60',
        'API 5L X65',
        'API 5L X70',
        'API 5L X80',
        'ASTM A333 Grade 1',
        'ASTM A179',
        'ASTM A192',
        'ASTM A500 Grade A',
        'ASTM A500 Grade B',
        'ASTM A500 Grade C',
        'EN 10217',
        'EN 10216',
        'EN 10255',
        'ASTM A333 Grade 4',
        'ASTM A333 Grade 7',
        'ASTM A333 Grade 8',
        'API 5L X90',
        'API 5L X100'
      )
    `);
  }
}
