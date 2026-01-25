import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComprehensiveBoltNutData1770500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const gradeColumnExists = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'bolts' AND column_name = 'grade'
    `);
    if (gradeColumnExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE bolts ADD COLUMN grade varchar NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE bolts ADD COLUMN material varchar NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE bolts ADD COLUMN head_style varchar NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE bolts ADD COLUMN thread_type varchar NULL`,
      );
    }

    const nutGradeColumnExists = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'nut_masses' AND column_name = 'grade'
    `);
    if (nutGradeColumnExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE nut_masses ADD COLUMN grade varchar NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE nut_masses ADD COLUMN type varchar NULL`,
      );
    }

    await queryRunner.query(
      `UPDATE bolts SET grade = '8.8', material = 'Carbon Steel', head_style = 'hex', thread_type = 'coarse' WHERE grade IS NULL`,
    );

    const boltIds: Record<string, number> = {};
    const boltSizes = [
      'M10',
      'M12',
      'M16',
      'M20',
      'M24',
      'M27',
      'M30',
      'M33',
      'M36',
      'M39',
      'M42',
      'M45',
      'M48',
      'M52',
      'M56',
      'M64',
    ];
    for (const size of boltSizes) {
      const result = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = '${size}'`,
      );
      if (result.length > 0) {
        boltIds[size] = result[0].id;
      }
    }

    const newBoltSizes = ['M48'];
    for (const size of newBoltSizes) {
      if (!boltIds[size]) {
        const result = await queryRunner.query(
          `INSERT INTO bolts (designation, grade, material, head_style, thread_type) VALUES ('${size}', '8.8', 'Carbon Steel', 'hex', 'coarse') RETURNING id`,
        );
        boltIds[size] = result[0].id;
      }
    }

    const boltMassData: Record<string, [number, number][]> = {
      M10: [
        [25, 0.025],
        [30, 0.028],
        [35, 0.032],
        [40, 0.035],
        [45, 0.039],
        [50, 0.041],
        [55, 0.045],
        [60, 0.049],
        [65, 0.053],
        [70, 0.057],
        [75, 0.06],
        [80, 0.064],
        [90, 0.072],
        [100, 0.08],
        [110, 0.088],
        [120, 0.096],
        [130, 0.104],
        [140, 0.112],
        [150, 0.12],
        [160, 0.128],
        [180, 0.144],
        [200, 0.16],
      ],
      M12: [
        [25, 0.037],
        [30, 0.042],
        [35, 0.047],
        [40, 0.052],
        [45, 0.057],
        [50, 0.062],
        [55, 0.067],
        [60, 0.073],
        [65, 0.078],
        [70, 0.084],
        [75, 0.089],
        [80, 0.095],
        [90, 0.106],
        [100, 0.117],
        [110, 0.128],
        [120, 0.14],
        [130, 0.151],
        [140, 0.162],
        [150, 0.173],
        [160, 0.185],
        [180, 0.208],
        [200, 0.231],
      ],
      M16: [
        [30, 0.073],
        [35, 0.081],
        [40, 0.089],
        [45, 0.098],
        [50, 0.107],
        [55, 0.116],
        [60, 0.125],
        [65, 0.134],
        [70, 0.143],
        [75, 0.152],
        [80, 0.161],
        [90, 0.179],
        [100, 0.197],
        [110, 0.216],
        [120, 0.234],
        [130, 0.252],
        [140, 0.27],
        [150, 0.289],
        [160, 0.307],
        [180, 0.344],
        [200, 0.38],
        [220, 0.417],
        [240, 0.453],
        [260, 0.49],
      ],
      M20: [
        [40, 0.142],
        [45, 0.155],
        [50, 0.168],
        [55, 0.181],
        [60, 0.195],
        [65, 0.208],
        [70, 0.222],
        [75, 0.235],
        [80, 0.249],
        [90, 0.276],
        [100, 0.303],
        [110, 0.33],
        [120, 0.357],
        [130, 0.384],
        [140, 0.411],
        [150, 0.438],
        [160, 0.465],
        [180, 0.519],
        [200, 0.573],
        [220, 0.627],
        [240, 0.681],
        [260, 0.735],
        [280, 0.789],
        [300, 0.843],
      ],
      M24: [
        [50, 0.265],
        [55, 0.285],
        [60, 0.305],
        [65, 0.325],
        [70, 0.346],
        [75, 0.366],
        [80, 0.386],
        [90, 0.427],
        [100, 0.468],
        [110, 0.508],
        [120, 0.549],
        [130, 0.59],
        [140, 0.63],
        [150, 0.671],
        [160, 0.712],
        [180, 0.793],
        [200, 0.874],
        [220, 0.956],
        [240, 1.037],
        [260, 1.118],
        [280, 1.2],
        [300, 1.281],
        [320, 1.362],
        [340, 1.444],
      ],
      M27: [
        [60, 0.42],
        [70, 0.47],
        [80, 0.53],
        [90, 0.59],
        [100, 0.65],
        [110, 0.71],
        [120, 0.77],
        [130, 0.83],
        [140, 0.89],
        [150, 0.95],
        [160, 1.01],
        [180, 1.13],
        [200, 1.25],
        [220, 1.37],
        [240, 1.49],
        [260, 1.61],
        [280, 1.73],
        [300, 1.85],
      ],
      M30: [
        [60, 0.513],
        [70, 0.577],
        [80, 0.641],
        [90, 0.705],
        [100, 0.769],
        [110, 0.833],
        [120, 0.898],
        [130, 0.962],
        [140, 1.026],
        [150, 1.09],
        [160, 1.154],
        [180, 1.282],
        [200, 1.41],
        [220, 1.539],
        [240, 1.667],
        [260, 1.795],
        [280, 1.923],
        [300, 2.051],
        [320, 2.18],
        [340, 2.308],
        [360, 2.436],
        [380, 2.564],
        [400, 2.692],
      ],
      M33: [
        [70, 0.73],
        [80, 0.81],
        [90, 0.89],
        [100, 0.97],
        [110, 1.05],
        [120, 1.13],
        [130, 1.21],
        [140, 1.29],
        [150, 1.37],
        [160, 1.45],
        [180, 1.61],
        [200, 1.77],
        [220, 1.93],
        [240, 2.09],
        [260, 2.25],
        [280, 2.41],
        [300, 2.57],
        [320, 2.73],
      ],
      M36: [
        [80, 1.02],
        [90, 1.115],
        [100, 1.21],
        [110, 1.305],
        [120, 1.4],
        [130, 1.495],
        [140, 1.59],
        [150, 1.685],
        [160, 1.78],
        [180, 1.97],
        [200, 2.16],
        [220, 2.35],
        [240, 2.54],
        [260, 2.73],
        [280, 2.92],
        [300, 3.11],
        [320, 3.3],
        [340, 3.49],
        [360, 3.68],
        [380, 3.87],
        [400, 4.06],
      ],
      M39: [
        [90, 1.35],
        [100, 1.463],
        [110, 1.576],
        [120, 1.689],
        [130, 1.802],
        [140, 1.915],
        [150, 2.028],
        [160, 2.141],
        [180, 2.367],
        [200, 2.593],
        [220, 2.819],
        [240, 3.045],
        [260, 3.271],
        [280, 3.497],
        [300, 3.723],
        [320, 3.949],
        [340, 4.175],
        [360, 4.401],
      ],
      M42: [
        [100, 1.72],
        [110, 1.855],
        [120, 1.99],
        [130, 2.125],
        [140, 2.26],
        [150, 2.395],
        [160, 2.53],
        [180, 2.8],
        [200, 3.07],
        [220, 3.34],
        [240, 3.61],
        [260, 3.88],
        [280, 4.15],
        [300, 4.42],
        [320, 4.69],
        [340, 4.96],
        [360, 5.23],
        [380, 5.5],
        [400, 5.77],
      ],
      M45: [
        [100, 2.08],
        [110, 2.235],
        [120, 2.39],
        [130, 2.545],
        [140, 2.7],
        [150, 2.855],
        [160, 3.01],
        [180, 3.32],
        [200, 3.63],
        [220, 3.94],
        [240, 4.25],
        [260, 4.56],
        [280, 4.87],
        [300, 5.18],
        [320, 5.49],
        [340, 5.8],
        [360, 6.11],
        [380, 6.42],
        [400, 6.73],
      ],
      M48: [
        [100, 2.36],
        [110, 2.545],
        [120, 2.73],
        [130, 2.915],
        [140, 3.1],
        [150, 3.285],
        [160, 3.47],
        [180, 3.84],
        [200, 4.21],
        [220, 4.58],
        [240, 4.95],
        [260, 5.32],
        [280, 5.69],
        [300, 6.06],
        [320, 6.43],
        [340, 6.8],
        [360, 7.17],
        [380, 7.54],
        [400, 7.91],
      ],
      M52: [
        [120, 3.35],
        [140, 3.8],
        [160, 4.25],
        [180, 4.7],
        [200, 5.15],
        [220, 5.6],
        [240, 6.05],
        [260, 6.5],
        [280, 6.95],
        [300, 7.4],
        [320, 7.85],
        [340, 8.3],
        [360, 8.75],
        [380, 9.2],
        [400, 9.65],
      ],
      M56: [
        [120, 3.9],
        [140, 4.43],
        [160, 4.96],
        [180, 5.49],
        [200, 6.02],
        [220, 6.55],
        [240, 7.08],
        [260, 7.61],
        [280, 8.14],
        [300, 8.67],
        [320, 9.2],
        [340, 9.73],
        [360, 10.26],
        [380, 10.79],
        [400, 11.32],
      ],
      M64: [
        [140, 5.85],
        [160, 6.53],
        [180, 7.21],
        [200, 7.89],
        [220, 8.57],
        [240, 9.25],
        [260, 9.93],
        [280, 10.61],
        [300, 11.29],
        [320, 11.97],
        [340, 12.65],
        [360, 13.33],
        [380, 14.01],
        [400, 14.69],
      ],
    };

    for (const [size, lengths] of Object.entries(boltMassData)) {
      const boltId = boltIds[size];
      if (boltId) {
        for (const [length, mass] of lengths) {
          const existing = await queryRunner.query(
            `SELECT id FROM bolt_masses WHERE "boltId" = ${boltId} AND length_mm = ${length}`,
          );
          if (existing.length === 0) {
            await queryRunner.query(
              `INSERT INTO bolt_masses ("boltId", length_mm, mass_kg) VALUES (${boltId}, ${length}, ${mass})`,
            );
          }
        }
      }
    }

    const nutMassData: [string, number][] = [
      ['M10', 0.0116],
      ['M12', 0.0173],
      ['M16', 0.0333],
      ['M20', 0.0644],
      ['M24', 0.11],
      ['M27', 0.165],
      ['M30', 0.223],
      ['M33', 0.288],
      ['M36', 0.393],
      ['M39', 0.502],
      ['M42', 0.652],
      ['M45', 0.8],
      ['M48', 0.98],
      ['M52', 1.22],
      ['M56', 1.42],
      ['M64', 1.98],
    ];

    for (const [size, mass] of nutMassData) {
      const boltId = boltIds[size];
      if (boltId) {
        const existing = await queryRunner.query(
          `SELECT id FROM nut_masses WHERE bolt_id = ${boltId}`,
        );
        if (existing.length === 0) {
          await queryRunner.query(
            `INSERT INTO nut_masses (bolt_id, mass_kg, grade, type) VALUES (${boltId}, ${mass}, 'Grade 8', 'hex')`,
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM bolt_masses`);
    await queryRunner.query(`DELETE FROM nut_masses`);
    await queryRunner.query(`ALTER TABLE bolts DROP COLUMN IF EXISTS grade`);
    await queryRunner.query(`ALTER TABLE bolts DROP COLUMN IF EXISTS material`);
    await queryRunner.query(
      `ALTER TABLE bolts DROP COLUMN IF EXISTS head_style`,
    );
    await queryRunner.query(
      `ALTER TABLE bolts DROP COLUMN IF EXISTS thread_type`,
    );
    await queryRunner.query(
      `ALTER TABLE nut_masses DROP COLUMN IF EXISTS grade`,
    );
    await queryRunner.query(
      `ALTER TABLE nut_masses DROP COLUMN IF EXISTS type`,
    );
  }
}
