import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBendRadiusTypeAndFixSABS719CenterToFace1768300000000 implements MigrationInterface {
  name = 'AddBendRadiusTypeAndFixSABS719CenterToFace1768300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      ADD COLUMN IF NOT EXISTS "bend_radius_type" varchar(20)
    `);

    await queryRunner.query(`
      ALTER TABLE "bend_rfqs"
      ALTER COLUMN "bend_type" DROP NOT NULL
    `);

    const sabs719Bends = await queryRunner.query(`
      SELECT br.id, br.nominal_bore_mm, br.bend_degrees, br.center_to_face_mm,
             br.calculation_data, br.steel_specification_id
      FROM bend_rfqs br
      WHERE br.steel_specification_id = 8
    `);

    const SABS719_LONG_RADIUS: Record<
      number,
      { A: number; B: number; C: number; R: number }
    > = {
      200: { A: 610, B: 405, C: 205, R: 610 },
      250: { A: 760, B: 510, C: 255, R: 760 },
      300: { A: 915, B: 610, C: 305, R: 915 },
      350: { A: 1065, B: 710, C: 355, R: 1065 },
      400: { A: 1220, B: 815, C: 405, R: 1220 },
      450: { A: 1370, B: 915, C: 455, R: 1370 },
      500: { A: 1525, B: 1015, C: 510, R: 1525 },
      600: { A: 1830, B: 1220, C: 610, R: 1830 },
      700: { A: 2135, B: 1420, C: 710, R: 2135 },
      750: { A: 2285, B: 1525, C: 760, R: 2285 },
      800: { A: 2440, B: 1625, C: 815, R: 2440 },
      900: { A: 2745, B: 1830, C: 915, R: 2745 },
    };

    const SABS719_MEDIUM_RADIUS: Record<
      number,
      { A: number; B: number; C: number; R: number }
    > = {
      200: { A: 405, B: 205, C: 140, R: 405 },
      250: { A: 510, B: 255, C: 175, R: 510 },
      300: { A: 610, B: 305, C: 205, R: 610 },
      350: { A: 715, B: 355, C: 240, R: 715 },
      400: { A: 815, B: 405, C: 280, R: 815 },
      450: { A: 915, B: 455, C: 305, R: 915 },
      500: { A: 1015, B: 510, C: 355, R: 1015 },
      600: { A: 1220, B: 610, C: 405, R: 1220 },
      700: { A: 1420, B: 710, C: 480, R: 1420 },
      750: { A: 1525, B: 760, C: 510, R: 1525 },
      800: { A: 1625, B: 815, C: 560, R: 1625 },
      900: { A: 1830, B: 915, C: 610, R: 1830 },
    };

    const SABS719_ELBOWS: Record<
      number,
      { A: number; B: number; C: number; R: number }
    > = {
      200: { A: 230, B: 155, C: 115, R: 230 },
      250: { A: 280, B: 180, C: 140, R: 280 },
      300: { A: 305, B: 205, C: 155, R: 305 },
      350: { A: 355, B: 230, C: 175, R: 355 },
      400: { A: 405, B: 265, C: 200, R: 405 },
      450: { A: 455, B: 305, C: 230, R: 455 },
      500: { A: 510, B: 330, C: 255, R: 510 },
      600: { A: 610, B: 405, C: 305, R: 610 },
      700: { A: 710, B: 460, C: 355, R: 710 },
      750: { A: 760, B: 510, C: 380, R: 760 },
      800: { A: 815, B: 560, C: 410, R: 815 },
      900: { A: 915, B: 610, C: 460, R: 915 },
    };

    const getColumnBySegments = (
      bendRadiusType: string,
      segments: number,
    ): 'A' | 'B' | 'C' => {
      const map: Record<string, Record<number, 'A' | 'B' | 'C'>> = {
        elbow: { 7: 'A', 6: 'A', 5: 'A', 4: 'A', 3: 'B', 2: 'C' },
        medium: { 7: 'A', 6: 'A', 5: 'A', 4: 'B', 3: 'B', 2: 'C' },
        long: { 7: 'A', 6: 'A', 5: 'A', 4: 'B', 3: 'B', 2: 'C' },
      };
      return map[bendRadiusType]?.[segments] || 'B';
    };

    const getCenterToFace = (
      bendRadiusType: string,
      nominalBoreMm: number,
      segments: number,
    ): { centerToFace: number; radius: number } | null => {
      const tables: Record<
        string,
        Record<number, { A: number; B: number; C: number; R: number }>
      > = {
        elbow: SABS719_ELBOWS,
        medium: SABS719_MEDIUM_RADIUS,
        long: SABS719_LONG_RADIUS,
      };
      const table = tables[bendRadiusType];
      if (!table) return null;
      const data = table[nominalBoreMm];
      if (!data) return null;
      const column = getColumnBySegments(bendRadiusType, segments);
      return { centerToFace: data[column], radius: data.R };
    };

    for (const bend of sabs719Bends) {
      const nominalBore = Number(bend.nominal_bore_mm);
      const calcData = bend.calculation_data || {};
      const segments = Number(calcData.numberOfSegments) || 5;

      const bendRadiusType = calcData.bendRadiusType || 'long';

      const longResult = getCenterToFace('long', nominalBore, segments);

      if (longResult) {
        await queryRunner.query(
          `
          UPDATE "bend_rfqs"
          SET "bend_radius_type" = $1,
              "center_to_face_mm" = $2,
              "calculation_data" = COALESCE("calculation_data", '{}'::jsonb) || $3::jsonb
          WHERE "id" = $4
        `,
          [
            bendRadiusType,
            longResult.centerToFace,
            JSON.stringify({
              bendRadiusType,
              correctedCF: longResult.centerToFace,
            }),
            bend.id,
          ],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bend_rfqs" DROP COLUMN IF EXISTS "bend_radius_type"
    `);
  }
}
