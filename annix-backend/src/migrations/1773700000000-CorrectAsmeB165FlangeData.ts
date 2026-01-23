import { MigrationInterface, QueryRunner } from 'typeorm';

export class CorrectAsmeB165FlangeData1773700000000 implements MigrationInterface {
  name = 'CorrectAsmeB165FlangeData1773700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Correcting ASME B16.5 flange dimension data...');

    const asmeResult = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.5'`
    );
    if (asmeResult.length === 0) {
      console.warn('ASME B16.5 standard not found, skipping...');
      return;
    }
    const asmeId = asmeResult[0].id;

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
        WHERE designation = '${designation}' AND "standardId" = ${asmeId}
      `);
      return result[0]?.id;
    };

    const getTypeId = async (code: string) => {
      const result = await queryRunner.query(
        `SELECT id FROM flange_types WHERE code = '${code}'`
      );
      return result[0]?.id;
    };

    const getBoltId = async (designation: string) => {
      if (!designation) return null;
      const result = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = '${designation}'`
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
      classNum: number,
      D: number,
      b: number,
      holes: number,
      d1: number,
      bolt: string,
      pcd: number,
      mass: number
    ) => {
      const nominalId = await getNominalId(nb);
      const typeId = typeIds[typeCode as keyof typeof typeIds];
      const pressureClassDesignation = `${classNum}${typeCode}`;
      const pressureClassId = await getPressureClassId(pressureClassDesignation);
      const boltId = bolt ? await getBoltId(bolt) : null;

      if (!nominalId || !typeId || !pressureClassId) {
        return;
      }

      await queryRunner.query(`
        UPDATE flange_dimensions SET
          "D" = ${D}, "b" = ${b}, "num_holes" = ${holes}, "d1" = ${d1},
          "boltId" = ${boltId || 'NULL'}, "pcd" = ${pcd}, "mass_kg" = ${mass}
        WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "standardId" = ${asmeId}
          AND "pressureClassId" = ${pressureClassId}
          AND "flangeTypeId" = ${typeId}
      `);
    };

    // ASME B16.5 uses imperial bolts - store as metric equivalent for database
    // Bolt conversions: 7/8"=M22, 1"=M24, 1-1/8"=M27, 1-1/4"=M30, 1-3/8"=M33, 1-1/2"=M36,
    // 1-5/8"=M39, 1-3/4"=M42, 2"=M48, 2-1/4"=M52, 2-1/2"=M56, 3"=M64

    // ===== NPS 12 (DN300) CORRECTIONS =====
    // Class 150
    await updateFlange(300, '/3', 150, 483, 32, 12, 25, 'M22', 432, 18.0);
    await updateFlange(300, '/2', 150, 483, 48, 12, 25, 'M22', 432, 28.0);
    await updateFlange(300, '/8', 150, 483, 40, 12, 25, 'M22', 432, 35.0);
    // Class 300
    await updateFlange(300, '/3', 300, 521, 51, 16, 32, 'M27', 451, 30.0);
    await updateFlange(300, '/2', 300, 521, 72, 16, 32, 'M27', 451, 52.0);
    await updateFlange(300, '/8', 300, 521, 60, 16, 32, 'M27', 451, 62.0);
    // Class 600
    await updateFlange(300, '/3', 600, 559, 67, 20, 35, 'M30', 489, 48.0);
    await updateFlange(300, '/2', 600, 559, 92, 20, 35, 'M30', 489, 82.0);
    await updateFlange(300, '/8', 600, 559, 78, 20, 35, 'M30', 489, 95.0);
    // Class 900
    await updateFlange(300, '/3', 900, 610, 80, 20, 38, 'M33', 533, 72.0);
    await updateFlange(300, '/2', 900, 610, 108, 20, 38, 'M33', 533, 118.0);
    await updateFlange(300, '/8', 900, 610, 92, 20, 38, 'M33', 533, 135.0);

    // ===== NPS 14 (DN350) CORRECTIONS =====
    // Class 150
    await updateFlange(350, '/3', 150, 533, 35, 12, 29, 'M24', 476, 22.0);
    await updateFlange(350, '/2', 150, 533, 52, 12, 29, 'M24', 476, 36.0);
    await updateFlange(350, '/8', 150, 533, 44, 12, 29, 'M24', 476, 44.0);
    // Class 300
    await updateFlange(350, '/3', 300, 584, 54, 20, 32, 'M27', 514, 42.0);
    await updateFlange(350, '/2', 300, 584, 78, 20, 32, 'M27', 514, 72.0);
    await updateFlange(350, '/8', 300, 584, 65, 20, 32, 'M27', 514, 85.0);
    // Class 600
    await updateFlange(350, '/3', 600, 603, 70, 20, 38, 'M33', 527, 58.0);
    await updateFlange(350, '/2', 600, 603, 98, 20, 38, 'M33', 527, 102.0);
    await updateFlange(350, '/8', 600, 603, 84, 20, 38, 'M33', 527, 118.0);
    // Class 900
    await updateFlange(350, '/3', 900, 641, 86, 20, 41, 'M36', 559, 88.0);
    await updateFlange(350, '/2', 900, 641, 118, 20, 41, 'M36', 559, 148.0);
    await updateFlange(350, '/8', 900, 641, 102, 20, 41, 'M36', 559, 170.0);

    // ===== NPS 16 (DN400) CORRECTIONS =====
    // Class 150
    await updateFlange(400, '/3', 150, 597, 37, 16, 29, 'M24', 540, 28.0);
    await updateFlange(400, '/2', 150, 597, 56, 16, 29, 'M24', 540, 46.0);
    await updateFlange(400, '/8', 150, 597, 48, 16, 29, 'M24', 540, 56.0);
    // Class 300
    await updateFlange(400, '/3', 300, 648, 57, 20, 35, 'M30', 572, 52.0);
    await updateFlange(400, '/2', 300, 648, 84, 20, 35, 'M30', 572, 92.0);
    await updateFlange(400, '/8', 300, 648, 70, 20, 35, 'M30', 572, 108.0);
    // Class 600
    await updateFlange(400, '/3', 600, 686, 76, 20, 41, 'M36', 603, 82.0);
    await updateFlange(400, '/2', 600, 686, 108, 20, 41, 'M36', 603, 145.0);
    await updateFlange(400, '/8', 600, 686, 94, 20, 41, 'M36', 603, 168.0);
    // Class 900
    await updateFlange(400, '/3', 900, 705, 89, 20, 44, 'M39', 616, 105.0);
    await updateFlange(400, '/2', 900, 705, 124, 20, 44, 'M39', 616, 185.0);
    await updateFlange(400, '/8', 900, 705, 108, 20, 44, 'M39', 616, 212.0);

    // ===== NPS 18 (DN450) CORRECTIONS =====
    // Class 150
    await updateFlange(450, '/3', 150, 635, 40, 16, 32, 'M27', 578, 35.0);
    await updateFlange(450, '/2', 150, 635, 60, 16, 32, 'M27', 578, 58.0);
    await updateFlange(450, '/8', 150, 635, 52, 16, 32, 'M27', 578, 70.0);
    // Class 300
    await updateFlange(450, '/3', 300, 711, 61, 24, 35, 'M30', 629, 68.0);
    await updateFlange(450, '/2', 300, 711, 90, 24, 35, 'M30', 629, 120.0);
    await updateFlange(450, '/8', 300, 711, 76, 24, 35, 'M30', 629, 140.0);
    // Class 600
    await updateFlange(450, '/3', 600, 743, 83, 20, 44, 'M39', 654, 108.0);
    await updateFlange(450, '/2', 600, 743, 118, 20, 44, 'M39', 654, 188.0);
    await updateFlange(450, '/8', 600, 743, 102, 20, 44, 'M39', 654, 218.0);
    // Class 900
    await updateFlange(450, '/3', 900, 787, 102, 20, 51, 'M45', 686, 148.0);
    await updateFlange(450, '/2', 900, 787, 140, 20, 51, 'M45', 686, 260.0);
    await updateFlange(450, '/8', 900, 787, 124, 20, 51, 'M45', 686, 298.0);

    // ===== NPS 20 (DN500) CORRECTIONS (KEY FIXES) =====
    // Class 150 - Verified correct
    await updateFlange(500, '/3', 150, 699, 43, 20, 32, 'M27', 635, 45.0);
    await updateFlange(500, '/2', 150, 699, 65, 20, 32, 'M27', 635, 75.0);
    await updateFlange(500, '/8', 150, 699, 56, 20, 32, 'M27', 635, 92.0);
    // Class 300 - CORRECTED: PCD was 699, should be 686
    await updateFlange(500, '/3', 300, 775, 64, 24, 35, 'M33', 686, 88.0);
    await updateFlange(500, '/2', 300, 775, 96, 24, 35, 'M33', 686, 155.0);
    await updateFlange(500, '/8', 300, 775, 82, 24, 35, 'M33', 686, 182.0);
    // Class 600 - Verified correct
    await updateFlange(500, '/3', 600, 813, 89, 24, 44, 'M39', 724, 138.0);
    await updateFlange(500, '/2', 600, 813, 128, 24, 44, 'M39', 724, 245.0);
    await updateFlange(500, '/8', 600, 813, 110, 24, 44, 'M39', 724, 285.0);
    // Class 900 - CORRECTED: PCD was 762, should be 749
    await updateFlange(500, '/3', 900, 857, 108, 20, 54, 'M48', 749, 195.0);
    await updateFlange(500, '/2', 900, 857, 152, 20, 54, 'M48', 749, 345.0);
    await updateFlange(500, '/8', 900, 857, 132, 20, 54, 'M48', 749, 398.0);

    // ===== NPS 24 (DN600) CORRECTIONS =====
    // Class 150
    await updateFlange(600, '/3', 150, 813, 48, 20, 35, 'M30', 749, 65.0);
    await updateFlange(600, '/2', 150, 813, 72, 20, 35, 'M30', 749, 110.0);
    await updateFlange(600, '/8', 150, 813, 62, 20, 35, 'M30', 749, 132.0);
    // Class 300
    await updateFlange(600, '/3', 300, 914, 70, 24, 41, 'M36', 813, 135.0);
    await updateFlange(600, '/2', 300, 914, 104, 24, 41, 'M36', 813, 238.0);
    await updateFlange(600, '/8', 300, 914, 88, 24, 41, 'M36', 813, 278.0);
    // Class 600
    await updateFlange(600, '/3', 600, 940, 102, 24, 51, 'M45', 838, 208.0);
    await updateFlange(600, '/2', 600, 940, 146, 24, 51, 'M45', 838, 368.0);
    await updateFlange(600, '/8', 600, 940, 126, 24, 51, 'M45', 838, 425.0);
    // Class 900
    await updateFlange(600, '/3', 900, 1041, 140, 20, 67, 'M56', 902, 345.0);
    await updateFlange(600, '/2', 900, 1041, 195, 20, 67, 'M56', 902, 610.0);
    await updateFlange(600, '/8', 900, 1041, 170, 20, 67, 'M56', 902, 702.0);

    console.warn('ASME B16.5 flange data corrections complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('ASME B16.5 correction rollback not implemented - data would need manual restoration');
  }
}
