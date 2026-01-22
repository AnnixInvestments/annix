import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDuplicateAsmeB1647Standards1774100000000 implements MigrationInterface {
  name = 'RemoveDuplicateAsmeB1647Standards1774100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Removing duplicate ASME B16.47 A & B standards...');

    const withSpaceA = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47 A'`
    );
    const withSpaceB = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47 B'`
    );
    const noSpaceA = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47A'`
    );
    const noSpaceB = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.47B'`
    );

    const withSpaceAId = withSpaceA.length > 0 ? withSpaceA[0].id : null;
    const withSpaceBId = withSpaceB.length > 0 ? withSpaceB[0].id : null;
    const noSpaceAId = noSpaceA.length > 0 ? noSpaceA[0].id : null;
    const noSpaceBId = noSpaceB.length > 0 ? noSpaceB[0].id : null;

    console.warn(`Found standards - With space A: ${withSpaceAId}, B: ${withSpaceBId}`);
    console.warn(`Found standards - No space A: ${noSpaceAId}, B: ${noSpaceBId}`);

    const migrateData = async (fromId: number, toId: number, standardName: string) => {
      if (!fromId || !toId) return;

      const pressureClassesFrom = await queryRunner.query(
        `SELECT id, designation FROM flange_pressure_classes WHERE "standardId" = ${fromId}`
      );
      const pressureClassesTo = await queryRunner.query(
        `SELECT id, designation FROM flange_pressure_classes WHERE "standardId" = ${toId}`
      );

      const toClassMap: { [key: string]: number } = {};
      for (const pc of pressureClassesTo) {
        toClassMap[pc.designation] = pc.id;
      }

      for (const fromClass of pressureClassesFrom) {
        const toClassId = toClassMap[fromClass.designation];
        if (toClassId) {
          await queryRunner.query(`
            UPDATE flange_pt_ratings
            SET pressure_class_id = ${toClassId}
            WHERE pressure_class_id = ${fromClass.id}
              AND NOT EXISTS (
                SELECT 1 FROM flange_pt_ratings
                WHERE pressure_class_id = ${toClassId}
                  AND material_group = flange_pt_ratings.material_group
                  AND temperature_celsius = flange_pt_ratings.temperature_celsius
              )
          `);
        }
      }

      await queryRunner.query(
        `DELETE FROM flange_pt_ratings WHERE pressure_class_id IN
         (SELECT id FROM flange_pressure_classes WHERE "standardId" = ${fromId})`
      );
      await queryRunner.query(
        `DELETE FROM flange_pressure_classes WHERE "standardId" = ${fromId}`
      );
      await queryRunner.query(
        `DELETE FROM flange_dimensions WHERE "standardId" = ${fromId}`
      );
      await queryRunner.query(
        `DELETE FROM flange_bolting WHERE standard_id = ${fromId}`
      );
      await queryRunner.query(
        `DELETE FROM flange_standards WHERE id = ${fromId}`
      );

      console.warn(`Removed duplicate standard: ${standardName}`);
    };

    if (withSpaceAId && noSpaceAId) {
      await migrateData(withSpaceAId, noSpaceAId, 'ASME B16.47 A (with space)');
    } else if (withSpaceAId && !noSpaceAId) {
      await queryRunner.query(
        `UPDATE flange_standards SET code = 'ASME B16.47A' WHERE id = ${withSpaceAId}`
      );
      console.warn('Renamed "ASME B16.47 A" to "ASME B16.47A"');
    }

    if (withSpaceBId && noSpaceBId) {
      await migrateData(withSpaceBId, noSpaceBId, 'ASME B16.47 B (with space)');
    } else if (withSpaceBId && !noSpaceBId) {
      await queryRunner.query(
        `UPDATE flange_standards SET code = 'ASME B16.47B' WHERE id = ${withSpaceBId}`
      );
      console.warn('Renamed "ASME B16.47 B" to "ASME B16.47B"');
    }

    const finalStandards = await queryRunner.query(
      `SELECT id, code FROM flange_standards WHERE code LIKE 'ASME B16.47%' ORDER BY code`
    );
    console.warn('Final ASME B16.47 standards:', finalStandards);
    console.warn('Duplicate ASME B16.47 standards removal complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Rollback not supported - data consolidation is one-way');
  }
}
