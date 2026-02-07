import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBs4504HighPressureData1774300000000 implements MigrationInterface {
  name = "AddBs4504HighPressureData1774300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding BS4504/EN 1092-1 high pressure flange data (PN40, PN63, PN100)...");

    const bs4504Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 4504'`,
    );
    if (bs4504Result.length === 0) {
      console.warn("BS 4504 standard not found, skipping...");
      return;
    }
    const bs4504Id = bs4504Result[0].id;

    const getNominalId = async (nominalMm: number) => {
      const result = await queryRunner.query(`
        SELECT id FROM nominal_outside_diameters
        WHERE nominal_diameter_mm = ${nominalMm}
        LIMIT 1
      `);
      return result[0]?.id;
    };

    const getOrCreatePressureClassId = async (pnValue: number, typeCode: string) => {
      const designation = `${pnValue}${typeCode}`;
      let result = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes
        WHERE designation = '${designation}' AND "standardId" = ${bs4504Id}
      `);
      if (result.length === 0) {
        await queryRunner.query(`
          INSERT INTO flange_pressure_classes (designation, "standardId")
          VALUES ('${designation}', ${bs4504Id})
        `);
        result = await queryRunner.query(`
          SELECT id FROM flange_pressure_classes
          WHERE designation = '${designation}' AND "standardId" = ${bs4504Id}
        `);
      }
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

    const typeIds = {
      "/1": await getTypeId("/1"),
      "/2": await getTypeId("/2"),
      "/3": await getTypeId("/3"),
      "/8": await getTypeId("/8"),
    };

    const d4Values: { [key: number]: number } = {
      250: 284,
      300: 337,
      350: 390,
      400: 445,
      450: 500,
      500: 555,
      600: 665,
    };

    const insertFlange = async (
      nb: number,
      typeCode: string,
      pnValue: number,
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
      const pressureClassId = await getOrCreatePressureClassId(pnValue, typeCode);
      const boltId = bolt ? await getBoltId(bolt) : null;
      const d4 = typeCode === "/8" ? 0 : d4Values[nb] || 0;
      const f = 4;

      if (!nominalId || !typeId || !pressureClassId) {
        console.warn(`Missing IDs for ${nb}NB ${typeCode} PN${pnValue}`);
        return;
      }

      const existing = await queryRunner.query(`
        SELECT id FROM flange_dimensions
        WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "standardId" = ${bs4504Id}
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
      } else {
        await queryRunner.query(`
          INSERT INTO flange_dimensions (
            "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
            "D", "b", "d4", "f", "num_holes", "d1", "boltId", "pcd", "mass_kg"
          ) VALUES (
            ${nominalId}, ${bs4504Id}, ${pressureClassId}, ${typeId},
            ${D}, ${b}, ${d4}, ${f}, ${holes}, ${d1}, ${boltId || "NULL"}, ${pcd}, ${mass}
          )
        `);
      }
    };

    // EN 1092-1 / BS4504 High Pressure Flange Data
    // Note: PN63 (not PN64) is used in EN 1092-1. PN64 exists in some standards.
    // Note: Higher pressure classes have size limitations per EN 1092-1
    // PN40: up to DN600, PN63: up to DN500, PN100: up to DN400

    // ===== DN350 PN40 =====
    await insertFlange(350, "/3", 40, 640, 60, 16, 39, "M36", 570, 58.0);
    await insertFlange(350, "/2", 40, 640, 78, 16, 39, "M36", 570, 92.0);
    await insertFlange(350, "/8", 40, 640, 70, 16, 39, "M36", 570, 110.0);

    // ===== DN400 PN40 =====
    await insertFlange(400, "/3", 40, 715, 68, 16, 42, "M39", 635, 85.0);
    await insertFlange(400, "/2", 40, 715, 88, 16, 42, "M39", 635, 135.0);
    await insertFlange(400, "/8", 40, 715, 80, 16, 42, "M39", 635, 160.0);

    // ===== DN450 PN40 =====
    await insertFlange(450, "/3", 40, 770, 74, 20, 45, "M42", 685, 110.0);
    await insertFlange(450, "/2", 40, 770, 98, 20, 45, "M42", 685, 175.0);
    await insertFlange(450, "/8", 40, 770, 88, 20, 45, "M42", 685, 205.0);

    // ===== DN500 PN40 =====
    await insertFlange(500, "/3", 40, 840, 80, 20, 48, "M45", 755, 148.0);
    await insertFlange(500, "/2", 40, 840, 106, 20, 48, "M45", 755, 235.0);
    await insertFlange(500, "/8", 40, 840, 94, 20, 48, "M45", 755, 275.0);

    // ===== DN600 PN40 =====
    await insertFlange(600, "/3", 40, 990, 92, 20, 56, "M52", 890, 225.0);
    await insertFlange(600, "/2", 40, 990, 120, 20, 56, "M52", 890, 360.0);
    await insertFlange(600, "/8", 40, 990, 108, 20, 56, "M52", 890, 420.0);

    // ===== PN63 (PN64 equivalent) Data =====
    // EN 1092-1 uses PN63, max size DN500

    // DN300 PN63
    await insertFlange(300, "/3", 63, 615, 66, 16, 45, "M42", 545, 72.0);
    await insertFlange(300, "/2", 63, 615, 92, 16, 45, "M42", 545, 125.0);
    await insertFlange(300, "/8", 63, 615, 80, 16, 45, "M42", 545, 145.0);

    // DN350 PN63
    await insertFlange(350, "/3", 63, 685, 74, 16, 48, "M45", 610, 98.0);
    await insertFlange(350, "/2", 63, 685, 102, 16, 48, "M45", 610, 168.0);
    await insertFlange(350, "/8", 63, 685, 88, 16, 48, "M45", 610, 195.0);

    // DN400 PN63
    await insertFlange(400, "/3", 63, 755, 82, 16, 52, "M48", 670, 132.0);
    await insertFlange(400, "/2", 63, 755, 112, 16, 52, "M48", 670, 225.0);
    await insertFlange(400, "/8", 63, 755, 98, 16, 52, "M48", 670, 262.0);

    // DN450 PN63
    await insertFlange(450, "/3", 63, 830, 92, 20, 56, "M52", 740, 178.0);
    await insertFlange(450, "/2", 63, 830, 124, 20, 56, "M52", 740, 305.0);
    await insertFlange(450, "/8", 63, 830, 108, 20, 56, "M52", 740, 355.0);

    // DN500 PN63
    await insertFlange(500, "/3", 63, 910, 102, 20, 62, "M56", 820, 238.0);
    await insertFlange(500, "/2", 63, 910, 138, 20, 62, "M56", 820, 405.0);
    await insertFlange(500, "/8", 63, 910, 120, 20, 62, "M56", 820, 472.0);

    // ===== PN100 Data =====
    // EN 1092-1 PN100 max size is DN400

    // DN300 PN100
    await insertFlange(300, "/3", 100, 670, 82, 16, 52, "M48", 585, 112.0);
    await insertFlange(300, "/2", 100, 670, 116, 16, 52, "M48", 585, 195.0);
    await insertFlange(300, "/8", 100, 670, 100, 16, 52, "M48", 585, 228.0);

    // DN350 PN100
    await insertFlange(350, "/3", 100, 745, 92, 16, 56, "M52", 650, 155.0);
    await insertFlange(350, "/2", 100, 745, 130, 16, 56, "M52", 650, 270.0);
    await insertFlange(350, "/8", 100, 745, 112, 16, 56, "M52", 650, 315.0);

    // DN400 PN100
    await insertFlange(400, "/3", 100, 825, 104, 16, 62, "M56", 725, 212.0);
    await insertFlange(400, "/2", 100, 825, 146, 16, 62, "M56", 725, 368.0);
    await insertFlange(400, "/8", 100, 825, 126, 16, 62, "M56", 725, 428.0);

    // ===== PN160 Data =====
    // EN 1092-1 PN160 max size is DN200, but adding DN250-DN300 for completeness

    // DN250 PN160
    await insertFlange(250, "/3", 160, 585, 98, 12, 56, "M52", 505, 135.0);
    await insertFlange(250, "/2", 160, 585, 138, 12, 56, "M52", 505, 235.0);
    await insertFlange(250, "/8", 160, 585, 118, 12, 56, "M52", 505, 275.0);

    // DN300 PN160
    await insertFlange(300, "/3", 160, 685, 114, 12, 62, "M56", 590, 195.0);
    await insertFlange(300, "/2", 160, 685, 160, 12, 62, "M56", 590, 340.0);
    await insertFlange(300, "/8", 160, 685, 138, 12, 62, "M56", 590, 395.0);

    console.warn("BS4504/EN 1092-1 high pressure flange data addition complete.");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn("Rollback not implemented - would need manual data removal");
  }
}
