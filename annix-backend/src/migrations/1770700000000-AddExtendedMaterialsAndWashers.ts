import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtendedMaterialsAndWashers1770700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const washerTableExists = await queryRunner.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'washers' AND table_schema = 'public'
    `);

    if (washerTableExists.length === 0) {
      await queryRunner.query(`
        CREATE TABLE washers (
          id SERIAL PRIMARY KEY,
          designation VARCHAR(50) NOT NULL,
          specification VARCHAR(100),
          inner_diameter_mm FLOAT NOT NULL,
          outer_diameter_mm FLOAT NOT NULL,
          thickness_mm FLOAT NOT NULL,
          mass_kg FLOAT NOT NULL,
          material VARCHAR(100),
          UNIQUE(designation, specification)
        )
      `);
    }

    const newMaterials = [
      ['Carbon Steel A350 LF2 (Group 1.2)', 'ASTM A320 L7', 'ASTM A320 L7', 'ASTM A194 4', 'ASTM F436'],
      ['Alloy Steel A182 F11 (Group 2.3)', 'ASTM A193 B7', 'ASTM A193 B7', 'ASTM A194 2H', 'ASTM F436'],
      ['Alloy Steel A182 F22 (Group 2.4)', 'ASTM A193 B7', 'ASTM A193 B7', 'ASTM A194 2H', 'ASTM F436'],
      ['Duplex SS A182 F51 (Group 3.1)', 'ASTM A193 B8M', 'ASTM A193 B8M', 'ASTM A194 8M', 'ASTM F844'],
      ['Super Duplex SS A182 F55 (Group 3.2)', 'ASTM A193 B8M', 'ASTM A193 B8M', 'ASTM A194 8M', 'ASTM F844'],
      ['Inconel 625 (Group 4.1)', 'ASTM A453 660', 'ASTM A453 660', 'ASTM A453 660', 'Inconel'],
      ['Monel 400 (Group 4.2)', 'ASTM A453 660', 'ASTM A453 660', 'ASTM A453 660', 'Monel'],
      ['Hastelloy C276 (Group 4.3)', 'ASTM A453 660', 'ASTM A453 660', 'ASTM A453 660', 'Hastelloy'],
    ];

    for (const [materialGroup, studSpec, machineBoltSpec, nutSpec, washerSpec] of newMaterials) {
      const existing = await queryRunner.query(`SELECT id FROM flange_bolting_materials WHERE material_group = '${materialGroup}'`);
      if (existing.length === 0) {
        await queryRunner.query(`
          INSERT INTO flange_bolting_materials (material_group, stud_spec, machine_bolt_spec, nut_spec, washer_spec)
          VALUES ('${materialGroup}', '${studSpec}', '${machineBoltSpec}', '${nutSpec}', '${washerSpec}')
        `);
      }
    }

    const washerData: [string, string, number, number, number, number, string][] = [
      ['M10', 'ASTM F436', 10.5, 21, 3, 0.008, 'Carbon Steel'],
      ['M12', 'ASTM F436', 13, 24, 3, 0.010, 'Carbon Steel'],
      ['M16', 'ASTM F436', 17, 30, 3, 0.017, 'Carbon Steel'],
      ['M20', 'ASTM F436', 21, 37, 3, 0.027, 'Carbon Steel'],
      ['M24', 'ASTM F436', 25, 44, 4, 0.044, 'Carbon Steel'],
      ['M27', 'ASTM F436', 28, 50, 4, 0.058, 'Carbon Steel'],
      ['M30', 'ASTM F436', 31, 56, 4, 0.072, 'Carbon Steel'],
      ['M33', 'ASTM F436', 34, 60, 5, 0.094, 'Carbon Steel'],
      ['M36', 'ASTM F436', 37, 66, 5, 0.115, 'Carbon Steel'],
      ['M39', 'ASTM F436', 40, 72, 6, 0.150, 'Carbon Steel'],
      ['M42', 'ASTM F436', 43, 78, 6, 0.180, 'Carbon Steel'],
      ['M45', 'ASTM F436', 46, 85, 7, 0.230, 'Carbon Steel'],
      ['M48', 'ASTM F436', 50, 92, 8, 0.300, 'Carbon Steel'],
      ['M52', 'ASTM F436', 54, 98, 8, 0.350, 'Carbon Steel'],
      ['M56', 'ASTM F436', 58, 105, 9, 0.420, 'Carbon Steel'],
      ['M64', 'ASTM F436', 66, 115, 9, 0.500, 'Carbon Steel'],
      ['M10', 'ASTM F844', 10.5, 21, 3, 0.007, 'Stainless Steel'],
      ['M12', 'ASTM F844', 13, 24, 3, 0.009, 'Stainless Steel'],
      ['M16', 'ASTM F844', 17, 30, 3, 0.015, 'Stainless Steel'],
      ['M20', 'ASTM F844', 21, 37, 3, 0.024, 'Stainless Steel'],
      ['M24', 'ASTM F844', 25, 44, 4, 0.039, 'Stainless Steel'],
      ['M27', 'ASTM F844', 28, 50, 4, 0.052, 'Stainless Steel'],
      ['M30', 'ASTM F844', 31, 56, 4, 0.064, 'Stainless Steel'],
      ['M33', 'ASTM F844', 34, 60, 5, 0.084, 'Stainless Steel'],
      ['M36', 'ASTM F844', 37, 66, 5, 0.103, 'Stainless Steel'],
      ['M39', 'ASTM F844', 40, 72, 6, 0.134, 'Stainless Steel'],
      ['M42', 'ASTM F844', 43, 78, 6, 0.161, 'Stainless Steel'],
      ['M45', 'ASTM F844', 46, 85, 7, 0.205, 'Stainless Steel'],
      ['M48', 'ASTM F844', 50, 92, 8, 0.268, 'Stainless Steel'],
      ['M52', 'ASTM F844', 54, 98, 8, 0.313, 'Stainless Steel'],
      ['M56', 'ASTM F844', 58, 105, 9, 0.375, 'Stainless Steel'],
      ['M64', 'ASTM F844', 66, 115, 9, 0.447, 'Stainless Steel'],
    ];

    for (const [designation, specification, innerDia, outerDia, thickness, mass, material] of washerData) {
      const existing = await queryRunner.query(`SELECT id FROM washers WHERE designation = '${designation}' AND specification = '${specification}'`);
      if (existing.length === 0) {
        await queryRunner.query(`
          INSERT INTO washers (designation, specification, inner_diameter_mm, outer_diameter_mm, thickness_mm, mass_kg, material)
          VALUES ('${designation}', '${specification}', ${innerDia}, ${outerDia}, ${thickness}, ${mass}, '${material}')
        `);
      }
    }

    const imperialBolts = [
      ['1/2"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
      ['5/8"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
      ['3/4"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
      ['7/8"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
      ['1"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
      ['1-1/8"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
      ['1-1/4"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
      ['1-3/8"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
      ['1-1/2"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
      ['1-5/8"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
      ['1-3/4"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
      ['2"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
      ['2-1/4"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
      ['2-1/2"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
      ['2-3/4"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
      ['3"', '8.8', 'Carbon Steel', 'hex', 'coarse'],
    ];

    for (const [designation, grade, material, headStyle, threadType] of imperialBolts) {
      const existing = await queryRunner.query(`SELECT id FROM bolts WHERE designation = '${designation}'`);
      if (existing.length === 0) {
        await queryRunner.query(`
          INSERT INTO bolts (designation, grade, material, head_style, thread_type)
          VALUES ('${designation}', '${grade}', '${material}', '${headStyle}', '${threadType}')
        `);
      }
    }

    const imperialNutMasses: [string, number][] = [
      ['1/2"', 0.023],
      ['5/8"', 0.041],
      ['3/4"', 0.068],
      ['7/8"', 0.104],
      ['1"', 0.145],
      ['1-1/8"', 0.195],
      ['1-1/4"', 0.259],
      ['1-3/8"', 0.336],
      ['1-1/2"', 0.418],
      ['1-5/8"', 0.513],
      ['1-3/4"', 0.617],
      ['2"', 0.862],
      ['2-1/4"', 1.157],
      ['2-1/2"', 1.497],
      ['2-3/4"', 1.882],
      ['3"', 2.313],
    ];

    for (const [designation, mass] of imperialNutMasses) {
      const boltResult = await queryRunner.query(`SELECT id FROM bolts WHERE designation = '${designation}'`);
      if (boltResult.length > 0) {
        const boltId = boltResult[0].id;
        const existing = await queryRunner.query(`SELECT id FROM nut_masses WHERE bolt_id = ${boltId}`);
        if (existing.length === 0) {
          await queryRunner.query(`
            INSERT INTO nut_masses (bolt_id, mass_kg, grade, type)
            VALUES (${boltId}, ${mass}, 'Grade 2H', 'hex')
          `);
        }
      }
    }

    const imperialBoltMasses: [string, [number, number][]][] = [
      ['1/2"', [[50, 0.045], [75, 0.065], [100, 0.085], [125, 0.105], [150, 0.125]]],
      ['5/8"', [[50, 0.080], [75, 0.115], [100, 0.150], [125, 0.185], [150, 0.220]]],
      ['3/4"', [[50, 0.125], [75, 0.175], [100, 0.225], [125, 0.275], [150, 0.325]]],
      ['7/8"', [[75, 0.270], [100, 0.340], [125, 0.410], [150, 0.480], [175, 0.550]]],
      ['1"', [[75, 0.365], [100, 0.455], [125, 0.545], [150, 0.635], [175, 0.725], [200, 0.815]]],
      ['1-1/8"', [[100, 0.600], [125, 0.715], [150, 0.830], [175, 0.945], [200, 1.060]]],
      ['1-1/4"', [[100, 0.780], [125, 0.920], [150, 1.060], [175, 1.200], [200, 1.340]]],
      ['1-3/8"', [[100, 0.980], [125, 1.150], [150, 1.320], [175, 1.490], [200, 1.660]]],
      ['1-1/2"', [[100, 1.200], [125, 1.400], [150, 1.600], [175, 1.800], [200, 2.000], [250, 2.400]]],
    ];

    for (const [designation, lengths] of imperialBoltMasses) {
      const boltResult = await queryRunner.query(`SELECT id FROM bolts WHERE designation = '${designation}'`);
      if (boltResult.length > 0) {
        const boltId = boltResult[0].id;
        for (const [length, mass] of lengths) {
          const existing = await queryRunner.query(`SELECT id FROM bolt_masses WHERE "boltId" = ${boltId} AND length_mm = ${length}`);
          if (existing.length === 0) {
            await queryRunner.query(`INSERT INTO bolt_masses ("boltId", length_mm, mass_kg) VALUES (${boltId}, ${length}, ${mass})`);
          }
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS washers`);

    const materialGroups = [
      'Carbon Steel A350 LF2 (Group 1.2)',
      'Alloy Steel A182 F11 (Group 2.3)',
      'Alloy Steel A182 F22 (Group 2.4)',
      'Duplex SS A182 F51 (Group 3.1)',
      'Super Duplex SS A182 F55 (Group 3.2)',
      'Inconel 625 (Group 4.1)',
      'Monel 400 (Group 4.2)',
      'Hastelloy C276 (Group 4.3)',
    ];

    for (const mg of materialGroups) {
      await queryRunner.query(`DELETE FROM flange_bolting_materials WHERE material_group = '${mg}'`);
    }

    const imperialBolts = ['1/2"', '5/8"', '3/4"', '7/8"', '1"', '1-1/8"', '1-1/4"', '1-3/8"', '1-1/2"', '1-5/8"', '1-3/4"', '2"', '2-1/4"', '2-1/2"', '2-3/4"', '3"'];
    for (const designation of imperialBolts) {
      const boltResult = await queryRunner.query(`SELECT id FROM bolts WHERE designation = '${designation}'`);
      if (boltResult.length > 0) {
        const boltId = boltResult[0].id;
        await queryRunner.query(`DELETE FROM bolt_masses WHERE "boltId" = ${boltId}`);
        await queryRunner.query(`DELETE FROM nut_masses WHERE bolt_id = ${boltId}`);
        await queryRunner.query(`DELETE FROM bolts WHERE id = ${boltId}`);
      }
    }
  }
}
