import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudBoltData1771600000000 implements MigrationInterface {
  name = 'AddStudBoltData1771600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding stud bolt specifications...');

    const studBolts = [
      { designation: 'M10 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 1.5 },
      { designation: 'M12 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 1.75 },
      { designation: 'M14 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 2.0 },
      { designation: 'M16 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 2.0 },
      { designation: 'M20 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 2.5 },
      { designation: 'M22 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 2.5 },
      { designation: 'M24 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 3.0 },
      { designation: 'M27 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 3.0 },
      { designation: 'M30 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 3.5 },
      { designation: 'M33 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 3.5 },
      { designation: 'M36 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 4.0 },
      { designation: 'M39 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 4.0 },
      { designation: 'M42 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 4.5 },
      { designation: 'M45 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 4.5 },
      { designation: 'M48 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 5.0 },
      { designation: 'M52 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 5.0 },
      { designation: 'M56 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 5.5 },
      { designation: 'M64 Stud', grade: 'B7', material: 'Alloy Steel', threadPitch: 6.0 },
    ];

    const studBoltIds: Record<string, number> = {};

    for (const stud of studBolts) {
      const existing = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = '${stud.designation}'`
      );

      if (existing.length === 0) {
        const result = await queryRunner.query(`
          INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm)
          VALUES ('${stud.designation}', '${stud.grade}', '${stud.material}', 'stud', 'coarse', ${stud.threadPitch})
          RETURNING id
        `);
        studBoltIds[stud.designation] = result[0].id;
        console.warn(`Added stud bolt: ${stud.designation}`);
      } else {
        studBoltIds[stud.designation] = existing[0].id;
      }
    }

    console.warn('Adding stud bolt mass data...');

    const studBoltMassData: Array<{ designation: string; length: number; mass: number }> = [
      { designation: 'M10 Stud', length: 50, mass: 0.030 },
      { designation: 'M10 Stud', length: 60, mass: 0.036 },
      { designation: 'M10 Stud', length: 70, mass: 0.042 },
      { designation: 'M10 Stud', length: 80, mass: 0.048 },

      { designation: 'M12 Stud', length: 50, mass: 0.044 },
      { designation: 'M12 Stud', length: 60, mass: 0.053 },
      { designation: 'M12 Stud', length: 70, mass: 0.062 },
      { designation: 'M12 Stud', length: 80, mass: 0.070 },
      { designation: 'M12 Stud', length: 90, mass: 0.079 },
      { designation: 'M12 Stud', length: 100, mass: 0.088 },

      { designation: 'M14 Stud', length: 60, mass: 0.072 },
      { designation: 'M14 Stud', length: 70, mass: 0.084 },
      { designation: 'M14 Stud', length: 80, mass: 0.096 },
      { designation: 'M14 Stud', length: 90, mass: 0.108 },
      { designation: 'M14 Stud', length: 100, mass: 0.120 },

      { designation: 'M16 Stud', length: 70, mass: 0.109 },
      { designation: 'M16 Stud', length: 80, mass: 0.125 },
      { designation: 'M16 Stud', length: 90, mass: 0.140 },
      { designation: 'M16 Stud', length: 100, mass: 0.156 },
      { designation: 'M16 Stud', length: 120, mass: 0.187 },

      { designation: 'M20 Stud', length: 80, mass: 0.196 },
      { designation: 'M20 Stud', length: 90, mass: 0.220 },
      { designation: 'M20 Stud', length: 100, mass: 0.244 },
      { designation: 'M20 Stud', length: 120, mass: 0.294 },
      { designation: 'M20 Stud', length: 140, mass: 0.343 },
      { designation: 'M20 Stud', length: 160, mass: 0.392 },

      { designation: 'M22 Stud', length: 90, mass: 0.268 },
      { designation: 'M22 Stud', length: 100, mass: 0.298 },
      { designation: 'M22 Stud', length: 120, mass: 0.357 },
      { designation: 'M22 Stud', length: 140, mass: 0.417 },
      { designation: 'M22 Stud', length: 160, mass: 0.476 },

      { designation: 'M24 Stud', length: 100, mass: 0.355 },
      { designation: 'M24 Stud', length: 120, mass: 0.426 },
      { designation: 'M24 Stud', length: 140, mass: 0.497 },
      { designation: 'M24 Stud', length: 160, mass: 0.568 },
      { designation: 'M24 Stud', length: 180, mass: 0.639 },
      { designation: 'M24 Stud', length: 200, mass: 0.710 },

      { designation: 'M27 Stud', length: 120, mass: 0.538 },
      { designation: 'M27 Stud', length: 140, mass: 0.628 },
      { designation: 'M27 Stud', length: 160, mass: 0.717 },
      { designation: 'M27 Stud', length: 180, mass: 0.807 },
      { designation: 'M27 Stud', length: 200, mass: 0.897 },

      { designation: 'M30 Stud', length: 130, mass: 0.715 },
      { designation: 'M30 Stud', length: 150, mass: 0.825 },
      { designation: 'M30 Stud', length: 170, mass: 0.935 },
      { designation: 'M30 Stud', length: 190, mass: 1.045 },
      { designation: 'M30 Stud', length: 220, mass: 1.210 },

      { designation: 'M33 Stud', length: 140, mass: 0.942 },
      { designation: 'M33 Stud', length: 160, mass: 1.076 },
      { designation: 'M33 Stud', length: 180, mass: 1.210 },
      { designation: 'M33 Stud', length: 200, mass: 1.345 },
      { designation: 'M33 Stud', length: 240, mass: 1.613 },

      { designation: 'M36 Stud', length: 150, mass: 1.194 },
      { designation: 'M36 Stud', length: 170, mass: 1.353 },
      { designation: 'M36 Stud', length: 190, mass: 1.512 },
      { designation: 'M36 Stud', length: 220, mass: 1.751 },
      { designation: 'M36 Stud', length: 260, mass: 2.069 },

      { designation: 'M39 Stud', length: 160, mass: 1.495 },
      { designation: 'M39 Stud', length: 180, mass: 1.682 },
      { designation: 'M39 Stud', length: 200, mass: 1.869 },
      { designation: 'M39 Stud', length: 240, mass: 2.243 },

      { designation: 'M42 Stud', length: 170, mass: 1.846 },
      { designation: 'M42 Stud', length: 190, mass: 2.062 },
      { designation: 'M42 Stud', length: 220, mass: 2.386 },
      { designation: 'M42 Stud', length: 260, mass: 2.818 },
      { designation: 'M42 Stud', length: 300, mass: 3.250 },

      { designation: 'M45 Stud', length: 180, mass: 2.224 },
      { designation: 'M45 Stud', length: 200, mass: 2.472 },
      { designation: 'M45 Stud', length: 240, mass: 2.968 },
      { designation: 'M45 Stud', length: 280, mass: 3.464 },

      { designation: 'M48 Stud', length: 190, mass: 2.687 },
      { designation: 'M48 Stud', length: 220, mass: 3.107 },
      { designation: 'M48 Stud', length: 260, mass: 3.668 },
      { designation: 'M48 Stud', length: 300, mass: 4.228 },
      { designation: 'M48 Stud', length: 350, mass: 4.928 },

      { designation: 'M52 Stud', length: 200, mass: 3.320 },
      { designation: 'M52 Stud', length: 240, mass: 3.984 },
      { designation: 'M52 Stud', length: 280, mass: 4.648 },
      { designation: 'M52 Stud', length: 320, mass: 5.312 },

      { designation: 'M56 Stud', length: 220, mass: 4.220 },
      { designation: 'M56 Stud', length: 260, mass: 4.988 },
      { designation: 'M56 Stud', length: 300, mass: 5.756 },
      { designation: 'M56 Stud', length: 350, mass: 6.716 },

      { designation: 'M64 Stud', length: 250, mass: 6.291 },
      { designation: 'M64 Stud', length: 300, mass: 7.550 },
      { designation: 'M64 Stud', length: 350, mass: 8.809 },
      { designation: 'M64 Stud', length: 400, mass: 10.067 },
    ];

    for (const item of studBoltMassData) {
      const boltId = studBoltIds[item.designation];
      if (!boltId) continue;

      const existing = await queryRunner.query(`
        SELECT id FROM bolt_masses WHERE "boltId" = ${boltId} AND length_mm = ${item.length}
      `);

      if (existing.length === 0) {
        await queryRunner.query(`
          INSERT INTO bolt_masses ("boltId", length_mm, mass_kg)
          VALUES (${boltId}, ${item.length}, ${item.mass})
        `);
      }
    }

    console.warn('Stud bolt data added successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Removing stud bolt data...');

    const studBolts = await queryRunner.query(
      `SELECT id FROM bolts WHERE head_style = 'stud'`
    );

    for (const bolt of studBolts) {
      await queryRunner.query(`DELETE FROM bolt_masses WHERE "boltId" = ${bolt.id}`);
    }

    await queryRunner.query(`DELETE FROM bolts WHERE head_style = 'stud'`);
  }
}
