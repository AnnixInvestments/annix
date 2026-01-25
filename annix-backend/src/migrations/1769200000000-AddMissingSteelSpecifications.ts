import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingSteelSpecifications1769200000000 implements MigrationInterface {
  name = 'AddMissingSteelSpecifications1769200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO steel_specifications (steel_spec_name)
      VALUES
        ('ASTM A312 TP304'),
        ('ASTM A312 TP304L'),
        ('ASTM A312 TP316'),
        ('ASTM A312 TP316L'),
        ('ASTM A312 TP321'),
        ('ASTM A312 TP347'),
        ('ASTM A335 P1'),
        ('ASTM A335 P5'),
        ('ASTM A335 P9'),
        ('ASTM A335 P11'),
        ('ASTM A335 P12'),
        ('ASTM A335 P22'),
        ('ASTM A335 P91'),
        ('ASTM A333 Grade 3'),
        ('ASTM A333 Grade 6'),
        ('ASTM A790 S31803'),
        ('ASTM A790 S32205'),
        ('ASTM A358 TP304'),
        ('ASTM A358 TP316')
      ON CONFLICT (steel_spec_name) DO NOTHING
    `);

    console.warn(
      'Added missing stainless steel and alloy steel specifications',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM steel_specifications
      WHERE steel_spec_name IN (
        'ASTM A312 TP304',
        'ASTM A312 TP304L',
        'ASTM A312 TP316',
        'ASTM A312 TP316L',
        'ASTM A312 TP321',
        'ASTM A312 TP347',
        'ASTM A335 P1',
        'ASTM A335 P5',
        'ASTM A335 P9',
        'ASTM A335 P11',
        'ASTM A335 P12',
        'ASTM A335 P22',
        'ASTM A335 P91',
        'ASTM A333 Grade 3',
        'ASTM A333 Grade 6',
        'ASTM A790 S31803',
        'ASTM A790 S32205',
        'ASTM A358 TP304',
        'ASTM A358 TP316'
      )
    `);
  }
}
