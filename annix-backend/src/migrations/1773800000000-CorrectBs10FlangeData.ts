import { MigrationInterface, QueryRunner } from 'typeorm';

export class CorrectBs10FlangeData1773800000000 implements MigrationInterface {
  name = 'CorrectBs10FlangeData1773800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Correcting BS10 flange dimension data...');

    const bs10Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 10'`,
    );
    if (bs10Result.length === 0) {
      console.warn('BS 10 standard not found, skipping...');
      return;
    }
    const bs10Id = bs10Result[0].id;

    const getNominalId = async (nominalMm: number) => {
      const result = await queryRunner.query(`
        SELECT id FROM nominal_outside_diameters
        WHERE nominal_diameter_mm = ${nominalMm}
        LIMIT 1
      `);
      return result[0]?.id;
    };

    const getPressureClassId = async (designation: string) => {
      const result = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes
        WHERE designation = '${designation}' AND "standardId" = ${bs10Id}
      `);
      return result[0]?.id;
    };

    const getTypeId = async (code: string) => {
      const result = await queryRunner.query(
        `SELECT id FROM flange_types WHERE code = '${code}'`,
      );
      return result[0]?.id;
    };

    const getBoltId = async (designation: string) => {
      if (!designation) return null;
      const result = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = '${designation}'`,
      );
      return result[0]?.id;
    };

    const typeIds = {
      '/1': await getTypeId('/1'),
      '/2': await getTypeId('/2'),
      '/3': await getTypeId('/3'),
      '/8': await getTypeId('/8'),
    };

    const updateFlange = async (
      nb: number,
      typeCode: string,
      tableCode: string,
      D: number,
      b: number,
      holes: number,
      d1: number,
      bolt: string,
      pcd: number,
      mass: number,
    ) => {
      const nominalId = await getNominalId(nb);
      const typeId = typeIds[typeCode as keyof typeof typeIds];
      const pressureClassId = await getPressureClassId(tableCode);
      const boltId = bolt ? await getBoltId(bolt) : null;

      if (!nominalId || !typeId || !pressureClassId) {
        return;
      }

      await queryRunner.query(`
        UPDATE flange_dimensions SET
          "D" = ${D}, "b" = ${b}, "num_holes" = ${holes}, "d1" = ${d1},
          "boltId" = ${boltId || 'NULL'}, "pcd" = ${pcd}, "mass_kg" = ${mass}
        WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "standardId" = ${bs10Id}
          AND "pressureClassId" = ${pressureClassId}
          AND "flangeTypeId" = ${typeId}
      `);
    };

    // BS10 uses imperial bolts - using metric equivalents for database
    // 3/4"=M20, 7/8"=M22, 1"=M24, 1-1/8"=M27/M30, 1-1/4"=M30, 1-3/8"=M33, 1-1/2"=M36, 1-3/4"=M42

    // ===== 300NB (12") CORRECTIONS =====
    // Table D (Low Pressure)
    await updateFlange(300, '/3', 'T/D', 457, 22, 12, 19, 'M20', 406, 10.0);
    await updateFlange(300, '/2', 'T/D', 457, 28, 12, 19, 'M20', 406, 14.0);
    await updateFlange(300, '/8', 'T/D', 457, 25, 12, 19, 'M20', 406, 18.0);
    // Table E (Low Pressure)
    await updateFlange(300, '/3', 'T/E', 457, 25, 12, 22, 'M22', 406, 12.0);
    await updateFlange(300, '/2', 'T/E', 457, 32, 12, 22, 'M22', 406, 18.0);
    await updateFlange(300, '/8', 'T/E', 457, 28, 12, 22, 'M22', 406, 22.0);
    // Table F (Medium Pressure)
    await updateFlange(300, '/3', 'T/F', 489, 29, 16, 22, 'M22', 438, 16.0);
    await updateFlange(300, '/2', 'T/F', 489, 38, 16, 22, 'M22', 438, 26.0);
    await updateFlange(300, '/8', 'T/F', 489, 32, 16, 22, 'M22', 438, 32.0);
    // Table H (Medium Pressure)
    await updateFlange(300, '/3', 'T/H', 489, 38, 16, 22, 'M22', 438, 22.0);
    await updateFlange(300, '/2', 'T/H', 489, 52, 16, 22, 'M22', 438, 38.0);
    await updateFlange(300, '/8', 'T/H', 489, 45, 16, 22, 'M22', 438, 46.0);
    // Table J (High Pressure)
    await updateFlange(300, '/3', 'T/J', 533, 45, 16, 25, 'M24', 476, 32.0);
    await updateFlange(300, '/2', 'T/J', 533, 62, 16, 25, 'M24', 476, 55.0);
    await updateFlange(300, '/8', 'T/J', 533, 52, 16, 25, 'M24', 476, 65.0);
    // Table K (High Pressure)
    await updateFlange(300, '/3', 'T/K', 584, 54, 16, 29, 'M27', 521, 48.0);
    await updateFlange(300, '/2', 'T/K', 584, 74, 16, 29, 'M27', 521, 82.0);
    await updateFlange(300, '/8', 'T/K', 584, 64, 16, 29, 'M27', 521, 98.0);

    // ===== 350NB (14") CORRECTIONS =====
    // Table D
    await updateFlange(350, '/3', 'T/D', 527, 25, 12, 22, 'M22', 470, 14.0);
    await updateFlange(350, '/2', 'T/D', 527, 32, 12, 22, 'M22', 470, 20.0);
    await updateFlange(350, '/8', 'T/D', 527, 28, 12, 22, 'M22', 470, 25.0);
    // Table E
    await updateFlange(350, '/3', 'T/E', 527, 25, 12, 22, 'M22', 470, 14.0);
    await updateFlange(350, '/2', 'T/E', 527, 34, 12, 22, 'M22', 470, 22.0);
    await updateFlange(350, '/8', 'T/E', 527, 30, 12, 22, 'M22', 470, 28.0);
    // Table F
    await updateFlange(350, '/3', 'T/F', 553, 32, 16, 25, 'M24', 495, 22.0);
    await updateFlange(350, '/2', 'T/F', 553, 44, 16, 25, 'M24', 495, 38.0);
    await updateFlange(350, '/8', 'T/F', 553, 38, 16, 25, 'M24', 495, 45.0);
    // Table H
    await updateFlange(350, '/3', 'T/H', 553, 41, 16, 25, 'M24', 495, 30.0);
    await updateFlange(350, '/2', 'T/H', 553, 58, 16, 25, 'M24', 495, 52.0);
    await updateFlange(350, '/8', 'T/H', 553, 50, 16, 25, 'M24', 495, 62.0);
    // Table J
    await updateFlange(350, '/3', 'T/J', 597, 51, 16, 29, 'M27', 533, 42.0);
    await updateFlange(350, '/2', 'T/J', 597, 70, 16, 29, 'M27', 533, 72.0);
    await updateFlange(350, '/8', 'T/J', 597, 60, 16, 29, 'M27', 533, 85.0);
    // Table K
    await updateFlange(350, '/3', 'T/K', 648, 64, 16, 32, 'M30', 584, 62.0);
    await updateFlange(350, '/2', 'T/K', 648, 88, 16, 32, 'M30', 584, 108.0);
    await updateFlange(350, '/8', 'T/K', 648, 76, 16, 32, 'M30', 584, 128.0);

    // ===== 400NB (16") CORRECTIONS =====
    // Table D
    await updateFlange(400, '/3', 'T/D', 578, 25, 12, 22, 'M22', 521, 18.0);
    await updateFlange(400, '/2', 'T/D', 578, 34, 12, 22, 'M22', 521, 26.0);
    await updateFlange(400, '/8', 'T/D', 578, 30, 12, 22, 'M22', 521, 32.0);
    // Table E
    await updateFlange(400, '/3', 'T/E', 578, 25, 12, 22, 'M22', 521, 18.0);
    await updateFlange(400, '/2', 'T/E', 578, 36, 12, 22, 'M22', 521, 28.0);
    await updateFlange(400, '/8', 'T/E', 578, 32, 12, 22, 'M22', 521, 34.0);
    // Table F
    await updateFlange(400, '/3', 'T/F', 610, 35, 20, 25, 'M24', 553, 30.0);
    await updateFlange(400, '/2', 'T/F', 610, 50, 20, 25, 'M24', 553, 52.0);
    await updateFlange(400, '/8', 'T/F', 610, 42, 20, 25, 'M24', 553, 62.0);
    // Table H
    await updateFlange(400, '/3', 'T/H', 610, 45, 20, 25, 'M24', 553, 42.0);
    await updateFlange(400, '/2', 'T/H', 610, 64, 20, 25, 'M24', 553, 74.0);
    await updateFlange(400, '/8', 'T/H', 610, 55, 20, 25, 'M24', 553, 88.0);
    // Table J
    await updateFlange(400, '/3', 'T/J', 660, 54, 20, 29, 'M27', 597, 55.0);
    await updateFlange(400, '/2', 'T/J', 660, 76, 20, 29, 'M27', 597, 98.0);
    await updateFlange(400, '/8', 'T/J', 660, 65, 20, 29, 'M27', 597, 115.0);
    // Table K
    await updateFlange(400, '/3', 'T/K', 711, 70, 20, 32, 'M30', 648, 82.0);
    await updateFlange(400, '/2', 'T/K', 711, 98, 20, 32, 'M30', 648, 145.0);
    await updateFlange(400, '/8', 'T/K', 711, 85, 20, 32, 'M30', 648, 172.0);

    // ===== 450NB (18") CORRECTIONS =====
    // Table D
    await updateFlange(450, '/3', 'T/D', 641, 25, 12, 22, 'M22', 584, 22.0);
    await updateFlange(450, '/2', 'T/D', 641, 36, 12, 22, 'M22', 584, 32.0);
    await updateFlange(450, '/8', 'T/D', 641, 32, 12, 22, 'M22', 584, 40.0);
    // Table E
    await updateFlange(450, '/3', 'T/E', 641, 25, 12, 22, 'M22', 584, 22.0);
    await updateFlange(450, '/2', 'T/E', 641, 38, 12, 22, 'M22', 584, 34.0);
    await updateFlange(450, '/8', 'T/E', 641, 34, 12, 22, 'M22', 584, 42.0);
    // Table F
    await updateFlange(450, '/3', 'T/F', 673, 38, 20, 29, 'M27', 610, 38.0);
    await updateFlange(450, '/2', 'T/F', 673, 54, 20, 29, 'M27', 610, 66.0);
    await updateFlange(450, '/8', 'T/F', 673, 46, 20, 29, 'M27', 610, 78.0);
    // Table H
    await updateFlange(450, '/3', 'T/H', 673, 48, 20, 29, 'M27', 610, 52.0);
    await updateFlange(450, '/2', 'T/H', 673, 68, 20, 29, 'M27', 610, 92.0);
    await updateFlange(450, '/8', 'T/H', 673, 58, 20, 29, 'M27', 610, 108.0);
    // Table J
    await updateFlange(450, '/3', 'T/J', 718, 57, 20, 32, 'M30', 654, 68.0);
    await updateFlange(450, '/2', 'T/J', 718, 82, 20, 32, 'M30', 654, 120.0);
    await updateFlange(450, '/8', 'T/J', 718, 70, 20, 32, 'M30', 654, 142.0);
    // Table K
    await updateFlange(450, '/3', 'T/K', 768, 76, 20, 35, 'M33', 705, 102.0);
    await updateFlange(450, '/2', 'T/K', 768, 106, 20, 35, 'M33', 705, 180.0);
    await updateFlange(450, '/8', 'T/K', 768, 92, 20, 35, 'M33', 705, 212.0);

    // ===== 500NB (20") CORRECTIONS (KEY FIXES) =====
    // Table D - CORRECTED: holes=16 (was 20)
    await updateFlange(500, '/3', 'T/D', 705, 32, 16, 22, 'M22', 641, 28.0);
    await updateFlange(500, '/2', 'T/D', 705, 44, 16, 22, 'M22', 641, 46.0);
    await updateFlange(500, '/8', 'T/D', 705, 38, 16, 22, 'M22', 641, 55.0);
    // Table E - CORRECTED: holes=16 (was 20)
    await updateFlange(500, '/3', 'T/E', 705, 38, 16, 22, 'M22', 641, 35.0);
    await updateFlange(500, '/2', 'T/E', 705, 52, 16, 22, 'M22', 641, 58.0);
    await updateFlange(500, '/8', 'T/E', 705, 45, 16, 22, 'M22', 641, 70.0);
    // Table F - CORRECTED: D=737, d1=29, bolt=M30
    await updateFlange(500, '/3', 'T/F', 737, 41, 20, 29, 'M30', 673, 48.0);
    await updateFlange(500, '/2', 'T/F', 737, 58, 20, 29, 'M30', 673, 84.0);
    await updateFlange(500, '/8', 'T/F', 737, 50, 20, 29, 'M30', 673, 100.0);
    // Table H - CORRECTED: D=737, PCD=673, holes=24, d1=29, bolt=M30 (was D=787, PCD=705)
    await updateFlange(500, '/3', 'T/H', 737, 57, 24, 29, 'M30', 673, 68.0);
    await updateFlange(500, '/2', 'T/H', 737, 80, 24, 29, 'M30', 673, 120.0);
    await updateFlange(500, '/8', 'T/H', 737, 68, 24, 29, 'M30', 673, 142.0);
    // Table J - CORRECTED: D=737, PCD=673, holes=20, d1=35, bolt=M33 (was D=876, PCD=781)
    await updateFlange(500, '/3', 'T/J', 737, 64, 20, 35, 'M33', 673, 82.0);
    await updateFlange(500, '/2', 'T/J', 737, 92, 20, 35, 'M33', 673, 145.0);
    await updateFlange(500, '/8', 'T/J', 737, 78, 20, 35, 'M33', 673, 172.0);
    // Table K - CORRECTED: D=787, PCD=711, holes=20, d1=41, bolt=M36 (was D=965, PCD=857)
    await updateFlange(500, '/3', 'T/K', 787, 83, 20, 41, 'M36', 711, 122.0);
    await updateFlange(500, '/2', 'T/K', 787, 116, 20, 41, 'M36', 711, 215.0);
    await updateFlange(500, '/8', 'T/K', 787, 100, 20, 41, 'M36', 711, 255.0);

    // ===== 600NB (24") CORRECTIONS =====
    // Table D
    await updateFlange(600, '/3', 'T/D', 826, 32, 16, 25, 'M24', 756, 42.0);
    await updateFlange(600, '/2', 'T/D', 826, 46, 16, 25, 'M24', 756, 70.0);
    await updateFlange(600, '/8', 'T/D', 826, 40, 16, 25, 'M24', 756, 85.0);
    // Table E
    await updateFlange(600, '/3', 'T/E', 826, 48, 16, 30, 'M27', 756, 58.0);
    await updateFlange(600, '/2', 'T/E', 826, 68, 16, 30, 'M27', 756, 105.0);
    await updateFlange(600, '/8', 'T/E', 826, 58, 16, 30, 'M27', 756, 125.0);
    // Table F
    await updateFlange(600, '/3', 'T/F', 851, 57, 24, 33, 'M30', 781, 85.0);
    await updateFlange(600, '/2', 'T/F', 851, 80, 24, 33, 'M30', 781, 150.0);
    await updateFlange(600, '/8', 'T/F', 851, 68, 24, 33, 'M30', 781, 178.0);
    // Table H
    await updateFlange(600, '/3', 'T/H', 851, 76, 24, 36, 'M30', 781, 125.0);
    await updateFlange(600, '/2', 'T/H', 851, 106, 24, 36, 'M30', 781, 220.0);
    await updateFlange(600, '/8', 'T/H', 851, 92, 24, 36, 'M30', 781, 260.0);
    // Table J
    await updateFlange(600, '/3', 'T/J', 851, 70, 24, 38, 'M36', 781, 105.0);
    await updateFlange(600, '/2', 'T/J', 851, 100, 24, 38, 'M36', 781, 188.0);
    await updateFlange(600, '/8', 'T/J', 851, 85, 24, 38, 'M36', 781, 222.0);
    // Table K
    await updateFlange(600, '/3', 'T/K', 914, 95, 24, 44, 'M42', 838, 175.0);
    await updateFlange(600, '/2', 'T/K', 914, 134, 24, 44, 'M42', 838, 312.0);
    await updateFlange(600, '/8', 'T/K', 914, 115, 24, 44, 'M42', 838, 368.0);

    console.warn('BS10 flange data corrections complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      'BS10 correction rollback not implemented - data would need manual restoration',
    );
  }
}
