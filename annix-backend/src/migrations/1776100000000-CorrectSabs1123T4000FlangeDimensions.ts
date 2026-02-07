import { MigrationInterface, QueryRunner } from "typeorm";

export class CorrectSabs1123T4000FlangeDimensions1776100000000 implements MigrationInterface {
  name = "CorrectSabs1123T4000FlangeDimensions1776100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      "Correcting SABS 1123 T4000 flange dimensions for 350, 400, 450, 600NB per MPS Technical Manual...",
    );

    const sabs1123Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'SABS 1123'`,
    );
    if (sabs1123Result.length === 0) {
      console.warn("SABS 1123 standard not found, skipping...");
      return;
    }
    const sabs1123Id = sabs1123Result[0].id;

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
        WHERE designation = '${designation}' AND "standardId" = ${sabs1123Id}
      `);
      return result[0]?.id;
    };

    const getTypeId = async (code: string) => {
      const result = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '${code}'`);
      return result[0]?.id;
    };

    const getBoltId = async (designation: string) => {
      if (!designation) return null;
      const result = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = '${designation}'`,
      );
      return result[0]?.id;
    };

    const updateFlange = async (
      nb: number,
      typeCode: string,
      D: number,
      b: number,
      d4: number,
      f: number,
      holes: number,
      d1: number,
      bolt: string,
      pcd: number,
      mass: number,
    ) => {
      const nominalId = await getNominalId(nb);
      const typeId = await getTypeId(typeCode);
      const pressureClassDesignation = `4000${typeCode}`;
      const pressureClassId = await getPressureClassId(pressureClassDesignation);
      const boltId = bolt ? await getBoltId(bolt) : null;

      if (!nominalId || !typeId || !pressureClassId) {
        console.warn(
          `Skipping ${nb}NB 4000${typeCode} - missing IDs (nominal: ${nominalId}, type: ${typeId}, pressure: ${pressureClassId})`,
        );
        return;
      }

      const existing = await queryRunner.query(`
        SELECT id FROM flange_dimensions
        WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "standardId" = ${sabs1123Id}
          AND "pressureClassId" = ${pressureClassId}
          AND "flangeTypeId" = ${typeId}
      `);

      if (existing.length > 0) {
        await queryRunner.query(`
          UPDATE flange_dimensions SET
            "D" = ${D}, "b" = ${b}, "d4" = ${d4}, "f" = ${f},
            "num_holes" = ${holes}, "d1" = ${d1},
            "boltId" = ${boltId || "NULL"}, "pcd" = ${pcd}, "mass_kg" = ${mass}
          WHERE id = ${existing[0].id}
        `);
        console.warn(`Updated ${nb}NB T4000${typeCode}`);
      } else {
        await queryRunner.query(`
          INSERT INTO flange_dimensions (
            "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
            "D", "b", "d4", "f", "num_holes", "d1", "boltId", "pcd", "mass_kg"
          ) VALUES (
            ${nominalId}, ${sabs1123Id}, ${pressureClassId}, ${typeId},
            ${D}, ${b}, ${d4}, ${f}, ${holes}, ${d1}, ${boltId || "NULL"}, ${pcd}, ${mass}
          )
        `);
        console.warn(`Inserted ${nb}NB T4000${typeCode}`);
      }
    };

    // ===== 350NB T4000 CORRECTIONS =====
    // MPS Manual: D=580, b=45, d4=465, f=4, holes=16, d1=33, M30, PCD=510
    // Thickness values vary by type - using /3 as base, adjusting for other types
    await updateFlange(350, "/1", 580, 41, 465, 4, 16, 33, "M30", 510, 95.0);
    await updateFlange(350, "/2", 580, 65, 465, 4, 16, 33, "M30", 510, 130.0);
    await updateFlange(350, "/3", 580, 45, 465, 4, 16, 33, "M30", 510, 105.0);
    await updateFlange(350, "/7", 580, 52, 465, 4, 16, 33, "M30", 510, 115.0);
    await updateFlange(350, "/8", 580, 65, 0, 4, 16, 33, "M30", 510, 120.0);

    // ===== 400NB T4000 CORRECTIONS =====
    // MPS Manual: D=660, b=50, d4=535, f=4, holes=16, d1=39, M36, PCD=580
    await updateFlange(400, "/1", 660, 46, 535, 4, 16, 39, "M36", 580, 120.0);
    await updateFlange(400, "/2", 660, 72, 535, 4, 16, 39, "M36", 580, 165.0);
    await updateFlange(400, "/3", 660, 50, 535, 4, 16, 39, "M36", 580, 135.0);
    await updateFlange(400, "/7", 660, 58, 535, 4, 16, 39, "M36", 580, 150.0);
    await updateFlange(400, "/8", 660, 72, 0, 4, 16, 39, "M36", 580, 155.0);

    // ===== 450NB T4000 CORRECTIONS =====
    // MPS Manual: D=685, b=60, d4=575, f=4, holes=20, d1=39, M36, PCD=610
    await updateFlange(450, "/1", 685, 54, 575, 4, 20, 39, "M36", 610, 145.0);
    await updateFlange(450, "/2", 685, 85, 575, 4, 20, 39, "M36", 610, 200.0);
    await updateFlange(450, "/3", 685, 60, 575, 4, 20, 39, "M36", 610, 165.0);
    await updateFlange(450, "/7", 685, 68, 575, 4, 20, 39, "M36", 610, 180.0);
    await updateFlange(450, "/8", 685, 85, 0, 4, 20, 39, "M36", 610, 190.0);

    // ===== 600NB T4000 CORRECTIONS =====
    // MPS Manual: D=890, b=80, d4=735, f=5, holes=20, d1=48, M45, PCD=795
    await updateFlange(600, "/1", 890, 72, 735, 5, 20, 48, "M45", 795, 270.0);
    await updateFlange(600, "/2", 890, 110, 735, 5, 20, 48, "M45", 795, 380.0);
    await updateFlange(600, "/3", 890, 80, 735, 5, 20, 48, "M45", 795, 310.0);
    await updateFlange(600, "/8", 890, 110, 0, 5, 20, 48, "M45", 795, 350.0);

    console.warn("SABS 1123 T4000 flange dimension corrections complete per MPS Technical Manual");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn("Reverting SABS 1123 T4000 corrections - restoring previous (incorrect) values");

    const sabs1123Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'SABS 1123'`,
    );
    if (sabs1123Result.length === 0) return;
    const sabs1123Id = sabs1123Result[0].id;

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
        WHERE designation = '${designation}' AND "standardId" = ${sabs1123Id}
      `);
      return result[0]?.id;
    };

    const getTypeId = async (code: string) => {
      const result = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '${code}'`);
      return result[0]?.id;
    };

    const getBoltId = async (designation: string) => {
      if (!designation) return null;
      const result = await queryRunner.query(
        `SELECT id FROM bolts WHERE designation = '${designation}'`,
      );
      return result[0]?.id;
    };

    const revertFlange = async (
      nb: number,
      typeCode: string,
      D: number,
      b: number,
      d4: number,
      f: number,
      holes: number,
      d1: number,
      bolt: string,
      pcd: number,
      mass: number,
    ) => {
      const nominalId = await getNominalId(nb);
      const typeId = await getTypeId(typeCode);
      const pressureClassDesignation = `4000${typeCode}`;
      const pressureClassId = await getPressureClassId(pressureClassDesignation);
      const boltId = bolt ? await getBoltId(bolt) : null;

      if (!nominalId || !typeId || !pressureClassId) return;

      await queryRunner.query(`
        UPDATE flange_dimensions SET
          "D" = ${D}, "b" = ${b}, "d4" = ${d4}, "f" = ${f},
          "num_holes" = ${holes}, "d1" = ${d1},
          "boltId" = ${boltId || "NULL"}, "pcd" = ${pcd}, "mass_kg" = ${mass}
        WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "standardId" = ${sabs1123Id}
          AND "pressureClassId" = ${pressureClassId}
          AND "flangeTypeId" = ${typeId}
      `);
    };

    // Revert to previous (incorrect) values from AddMissingSabs1123T4000Data migration
    // 350NB
    await revertFlange(350, "/2", 650, 90, 363, 4, 16, 45, "M42", 580, 160.0);
    await revertFlange(350, "/3", 650, 62, 363, 4, 16, 45, "M42", 580, 105.0);
    await revertFlange(350, "/1", 650, 58, 363, 4, 16, 45, "M42", 580, 95.0);
    await revertFlange(350, "/7", 650, 68, 363, 4, 16, 45, "M42", 580, 115.0);
    await revertFlange(350, "/8", 650, 90, 0, 4, 16, 45, "M42", 580, 140.0);

    // 400NB
    await revertFlange(400, "/2", 710, 96, 413, 4, 16, 48, "M45", 635, 195.0);
    await revertFlange(400, "/3", 710, 68, 413, 4, 16, 48, "M45", 635, 135.0);
    await revertFlange(400, "/1", 710, 64, 413, 4, 16, 48, "M45", 635, 125.0);
    await revertFlange(400, "/7", 710, 74, 413, 4, 16, 48, "M45", 635, 150.0);
    await revertFlange(400, "/8", 710, 96, 0, 4, 16, 48, "M45", 635, 175.0);

    // 450NB
    await revertFlange(450, "/2", 770, 102, 463, 4, 20, 48, "M45", 690, 245.0);
    await revertFlange(450, "/3", 770, 72, 463, 4, 20, 48, "M45", 690, 165.0);
    await revertFlange(450, "/1", 770, 68, 463, 4, 20, 48, "M45", 690, 155.0);
    await revertFlange(450, "/7", 770, 78, 463, 4, 20, 48, "M45", 690, 180.0);
    await revertFlange(450, "/8", 770, 102, 0, 4, 20, 48, "M45", 690, 215.0);

    // 600NB
    await revertFlange(600, "/2", 990, 130, 630, 5, 20, 62, "M56", 890, 455.0);
    await revertFlange(600, "/3", 990, 92, 630, 5, 20, 62, "M56", 890, 310.0);
    await revertFlange(600, "/1", 990, 88, 630, 5, 20, 62, "M56", 890, 290.0);
    await revertFlange(600, "/8", 990, 130, 0, 5, 20, 62, "M56", 890, 405.0);
  }
}
