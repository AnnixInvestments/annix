import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComprehensiveBoltNutData1770500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const gradeColumnExists = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'bolts' AND column_name = 'grade'
    `);
    if (gradeColumnExists.length === 0) {
      await queryRunner.query(`ALTER TABLE bolts ADD COLUMN grade varchar NULL`);
      await queryRunner.query(`ALTER TABLE bolts ADD COLUMN material varchar NULL`);
      await queryRunner.query(`ALTER TABLE bolts ADD COLUMN head_style varchar NULL`);
      await queryRunner.query(`ALTER TABLE bolts ADD COLUMN thread_type varchar NULL`);
    }

    const nutGradeColumnExists = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'nut_masses' AND column_name = 'grade'
    `);
    if (nutGradeColumnExists.length === 0) {
      await queryRunner.query(`ALTER TABLE nut_masses ADD COLUMN grade varchar NULL`);
      await queryRunner.query(`ALTER TABLE nut_masses ADD COLUMN type varchar NULL`);
    }

    await queryRunner.query(`UPDATE bolts SET grade = '8.8', material = 'Carbon Steel', head_style = 'hex', thread_type = 'coarse' WHERE grade IS NULL`);

    const boltIds: Record<string, number> = {};
    const boltSizes = ['M10', 'M12', 'M16', 'M20', 'M24', 'M27', 'M30', 'M33', 'M36', 'M39', 'M42', 'M45', 'M48', 'M52', 'M56', 'M64'];
    for (const size of boltSizes) {
      const result = await queryRunner.query(`SELECT id FROM bolts WHERE designation = '${size}'`);
      if (result.length > 0) {
        boltIds[size] = result[0].id;
      }
    }

    const newBoltSizes = ['M48'];
    for (const size of newBoltSizes) {
      if (!boltIds[size]) {
        const result = await queryRunner.query(`INSERT INTO bolts (designation, grade, material, head_style, thread_type) VALUES ('${size}', '8.8', 'Carbon Steel', 'hex', 'coarse') RETURNING id`);
        boltIds[size] = result[0].id;
      }
    }

    const boltMassData: Record<string, [number, number][]> = {
      'M10': [
        [25, 0.025], [30, 0.028], [35, 0.032], [40, 0.035], [45, 0.039], [50, 0.041],
        [55, 0.045], [60, 0.049], [65, 0.053], [70, 0.057], [75, 0.060], [80, 0.064],
        [90, 0.072], [100, 0.080], [110, 0.088], [120, 0.096], [130, 0.104], [140, 0.112],
        [150, 0.120], [160, 0.128], [180, 0.144], [200, 0.160],
      ],
      'M12': [
        [25, 0.037], [30, 0.042], [35, 0.047], [40, 0.052], [45, 0.057], [50, 0.062],
        [55, 0.067], [60, 0.073], [65, 0.078], [70, 0.084], [75, 0.089], [80, 0.095],
        [90, 0.106], [100, 0.117], [110, 0.128], [120, 0.140], [130, 0.151], [140, 0.162],
        [150, 0.173], [160, 0.185], [180, 0.208], [200, 0.231],
      ],
      'M16': [
        [30, 0.073], [35, 0.081], [40, 0.089], [45, 0.098], [50, 0.107], [55, 0.116],
        [60, 0.125], [65, 0.134], [70, 0.143], [75, 0.152], [80, 0.161], [90, 0.179],
        [100, 0.197], [110, 0.216], [120, 0.234], [130, 0.252], [140, 0.270], [150, 0.289],
        [160, 0.307], [180, 0.344], [200, 0.380], [220, 0.417], [240, 0.453], [260, 0.490],
      ],
      'M20': [
        [40, 0.142], [45, 0.155], [50, 0.168], [55, 0.181], [60, 0.195], [65, 0.208],
        [70, 0.222], [75, 0.235], [80, 0.249], [90, 0.276], [100, 0.303], [110, 0.330],
        [120, 0.357], [130, 0.384], [140, 0.411], [150, 0.438], [160, 0.465], [180, 0.519],
        [200, 0.573], [220, 0.627], [240, 0.681], [260, 0.735], [280, 0.789], [300, 0.843],
      ],
      'M24': [
        [50, 0.265], [55, 0.285], [60, 0.305], [65, 0.325], [70, 0.346], [75, 0.366],
        [80, 0.386], [90, 0.427], [100, 0.468], [110, 0.508], [120, 0.549], [130, 0.590],
        [140, 0.630], [150, 0.671], [160, 0.712], [180, 0.793], [200, 0.874], [220, 0.956],
        [240, 1.037], [260, 1.118], [280, 1.200], [300, 1.281], [320, 1.362], [340, 1.444],
      ],
      'M27': [
        [60, 0.420], [70, 0.470], [80, 0.530], [90, 0.590], [100, 0.650], [110, 0.710],
        [120, 0.770], [130, 0.830], [140, 0.890], [150, 0.950], [160, 1.010], [180, 1.130],
        [200, 1.250], [220, 1.370], [240, 1.490], [260, 1.610], [280, 1.730], [300, 1.850],
      ],
      'M30': [
        [60, 0.513], [70, 0.577], [80, 0.641], [90, 0.705], [100, 0.769], [110, 0.833],
        [120, 0.898], [130, 0.962], [140, 1.026], [150, 1.090], [160, 1.154], [180, 1.282],
        [200, 1.410], [220, 1.539], [240, 1.667], [260, 1.795], [280, 1.923], [300, 2.051],
        [320, 2.180], [340, 2.308], [360, 2.436], [380, 2.564], [400, 2.692],
      ],
      'M33': [
        [70, 0.730], [80, 0.810], [90, 0.890], [100, 0.970], [110, 1.050], [120, 1.130],
        [130, 1.210], [140, 1.290], [150, 1.370], [160, 1.450], [180, 1.610], [200, 1.770],
        [220, 1.930], [240, 2.090], [260, 2.250], [280, 2.410], [300, 2.570], [320, 2.730],
      ],
      'M36': [
        [80, 1.020], [90, 1.115], [100, 1.210], [110, 1.305], [120, 1.400], [130, 1.495],
        [140, 1.590], [150, 1.685], [160, 1.780], [180, 1.970], [200, 2.160], [220, 2.350],
        [240, 2.540], [260, 2.730], [280, 2.920], [300, 3.110], [320, 3.300], [340, 3.490],
        [360, 3.680], [380, 3.870], [400, 4.060],
      ],
      'M39': [
        [90, 1.350], [100, 1.463], [110, 1.576], [120, 1.689], [130, 1.802], [140, 1.915],
        [150, 2.028], [160, 2.141], [180, 2.367], [200, 2.593], [220, 2.819], [240, 3.045],
        [260, 3.271], [280, 3.497], [300, 3.723], [320, 3.949], [340, 4.175], [360, 4.401],
      ],
      'M42': [
        [100, 1.720], [110, 1.855], [120, 1.990], [130, 2.125], [140, 2.260], [150, 2.395],
        [160, 2.530], [180, 2.800], [200, 3.070], [220, 3.340], [240, 3.610], [260, 3.880],
        [280, 4.150], [300, 4.420], [320, 4.690], [340, 4.960], [360, 5.230], [380, 5.500],
        [400, 5.770],
      ],
      'M45': [
        [100, 2.080], [110, 2.235], [120, 2.390], [130, 2.545], [140, 2.700], [150, 2.855],
        [160, 3.010], [180, 3.320], [200, 3.630], [220, 3.940], [240, 4.250], [260, 4.560],
        [280, 4.870], [300, 5.180], [320, 5.490], [340, 5.800], [360, 6.110], [380, 6.420],
        [400, 6.730],
      ],
      'M48': [
        [100, 2.360], [110, 2.545], [120, 2.730], [130, 2.915], [140, 3.100], [150, 3.285],
        [160, 3.470], [180, 3.840], [200, 4.210], [220, 4.580], [240, 4.950], [260, 5.320],
        [280, 5.690], [300, 6.060], [320, 6.430], [340, 6.800], [360, 7.170], [380, 7.540],
        [400, 7.910],
      ],
      'M52': [
        [120, 3.350], [140, 3.800], [160, 4.250], [180, 4.700], [200, 5.150], [220, 5.600],
        [240, 6.050], [260, 6.500], [280, 6.950], [300, 7.400], [320, 7.850], [340, 8.300],
        [360, 8.750], [380, 9.200], [400, 9.650],
      ],
      'M56': [
        [120, 3.900], [140, 4.430], [160, 4.960], [180, 5.490], [200, 6.020], [220, 6.550],
        [240, 7.080], [260, 7.610], [280, 8.140], [300, 8.670], [320, 9.200], [340, 9.730],
        [360, 10.26], [380, 10.79], [400, 11.32],
      ],
      'M64': [
        [140, 5.850], [160, 6.530], [180, 7.210], [200, 7.890], [220, 8.570], [240, 9.250],
        [260, 9.930], [280, 10.61], [300, 11.29], [320, 11.97], [340, 12.65], [360, 13.33],
        [380, 14.01], [400, 14.69],
      ],
    };

    for (const [size, lengths] of Object.entries(boltMassData)) {
      const boltId = boltIds[size];
      if (boltId) {
        for (const [length, mass] of lengths) {
          const existing = await queryRunner.query(`SELECT id FROM bolt_masses WHERE "boltId" = ${boltId} AND length_mm = ${length}`);
          if (existing.length === 0) {
            await queryRunner.query(`INSERT INTO bolt_masses ("boltId", length_mm, mass_kg) VALUES (${boltId}, ${length}, ${mass})`);
          }
        }
      }
    }

    const nutMassData: [string, number][] = [
      ['M10', 0.0116],
      ['M12', 0.0173],
      ['M16', 0.0333],
      ['M20', 0.0644],
      ['M24', 0.110],
      ['M27', 0.165],
      ['M30', 0.223],
      ['M33', 0.288],
      ['M36', 0.393],
      ['M39', 0.502],
      ['M42', 0.652],
      ['M45', 0.800],
      ['M48', 0.980],
      ['M52', 1.220],
      ['M56', 1.420],
      ['M64', 1.980],
    ];

    for (const [size, mass] of nutMassData) {
      const boltId = boltIds[size];
      if (boltId) {
        const existing = await queryRunner.query(`SELECT id FROM nut_masses WHERE bolt_id = ${boltId}`);
        if (existing.length === 0) {
          await queryRunner.query(`INSERT INTO nut_masses (bolt_id, mass_kg, grade, type) VALUES (${boltId}, ${mass}, 'Grade 8', 'hex')`);
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM bolt_masses`);
    await queryRunner.query(`DELETE FROM nut_masses`);
    await queryRunner.query(`ALTER TABLE bolts DROP COLUMN IF EXISTS grade`);
    await queryRunner.query(`ALTER TABLE bolts DROP COLUMN IF EXISTS material`);
    await queryRunner.query(`ALTER TABLE bolts DROP COLUMN IF EXISTS head_style`);
    await queryRunner.query(`ALTER TABLE bolts DROP COLUMN IF EXISTS thread_type`);
    await queryRunner.query(`ALTER TABLE nut_masses DROP COLUMN IF EXISTS grade`);
    await queryRunner.query(`ALTER TABLE nut_masses DROP COLUMN IF EXISTS type`);
  }
}
