import { MigrationInterface, QueryRunner } from "typeorm";

export class AddM38BoltAndBs4504SpecialFlanges1776200000000 implements MigrationInterface {
  name = "AddM38BoltAndBs4504SpecialFlanges1776200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding M38 bolt and BS4504 special flanges for large NB sizes...");

    const existingM38 = await queryRunner.query(`SELECT id FROM bolts WHERE designation = 'M38'`);
    if (existingM38.length === 0) {
      await queryRunner.query(`
        INSERT INTO bolts (designation, grade, material, head_style, thread_type, thread_pitch_mm)
        VALUES ('M38', '8.8', 'Carbon Steel', 'hex', 'coarse', 4.0)
      `);
      console.warn("Added M38 bolt");
    }

    const bs4504Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 4504'`,
    );
    if (bs4504Result.length === 0) {
      console.warn("BS 4504 standard not found, skipping flange data...");
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

    const getPressureClassId = async (designation: string) => {
      const result = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes
        WHERE designation = '${designation}' AND "standardId" = ${bs4504Id}
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

    const insertFlange = async (
      nb: number,
      typeCode: string,
      pressureClass: number,
      D: number,
      b: number,
      d4: number,
      f: number,
      holes: number,
      d1: number,
      bolt: string,
      pcd: number,
      mass: number,
      boltLength: number,
    ) => {
      const nominalId = await getNominalId(nb);
      const typeId = await getTypeId(typeCode);
      const pressureDesignation = `${pressureClass}${typeCode}`;
      const pressureClassId = await getPressureClassId(pressureDesignation);
      const boltId = bolt ? await getBoltId(bolt) : null;

      if (!nominalId || !typeId || !pressureClassId) {
        console.warn(
          `Skipping ${nb}NB PN${pressureClass}${typeCode} - missing IDs (nominal: ${nominalId}, type: ${typeId}, pressure: ${pressureClassId})`,
        );
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
        console.warn(`${nb}NB BS4504 PN${pressureClass}${typeCode} already exists, skipping...`);
        return;
      }

      await queryRunner.query(`
        INSERT INTO flange_dimensions (
          "nominalOutsideDiameterId", "standardId", "pressureClassId", "flangeTypeId",
          "D", "b", "d4", "f", "num_holes", "d1", "boltId", "pcd", "mass_kg", "bolt_length_mm"
        ) VALUES (
          ${nominalId}, ${bs4504Id}, ${pressureClassId}, ${typeId},
          ${D}, ${b}, ${d4}, ${f}, ${holes}, ${d1}, ${boltId || "NULL"}, ${pcd}, ${mass}, ${boltLength}
        )
      `);
      console.warn(`Inserted ${nb}NB BS4504 PN${pressureClass}${typeCode}`);
    };

    const ensurePressureClass = async (pressureClass: number, typeCode: string) => {
      const designation = `${pressureClass}${typeCode}`;
      const existing = await queryRunner.query(`
        SELECT id FROM flange_pressure_classes
        WHERE designation = '${designation}' AND "standardId" = ${bs4504Id}
      `);
      if (existing.length === 0) {
        await queryRunner.query(`
          INSERT INTO flange_pressure_classes (designation, "standardId")
          VALUES ('${designation}', ${bs4504Id})
        `);
      }
    };

    const flangeTypes = ["/3", "/8"];
    const pressureClasses = [10, 16, 25, 40];

    for (const pc of pressureClasses) {
      for (const ft of flangeTypes) {
        await ensurePressureClass(pc, ft);
      }
    }

    // BS4504 Special Flanges data from MPS Technical Manual
    // These are large diameter flanges consistent with but not covered by BS4504
    // Data extracted from MPS Technical Manual pages 115-120
    // Note: Mass values are estimates based on flange dimensions
    // Note: Bolt lengths are estimates based on flange thickness

    // ===== 700NB (OD 711.2mm) =====
    // PN10 /3: D=895, b=70, d4=770, f=5, 24 holes, d1=39, M39, PCD=935
    await insertFlange(700, "/3", 10, 895, 70, 770, 5, 24, 39, "M36", 935, 180, 150);
    await insertFlange(700, "/8", 10, 895, 85, 0, 5, 24, 39, "M36", 935, 220, 160);
    // PN16 /3: D=930, b=80, d4=790, f=5, 24 holes, d1=39, M36, PCD=965
    await insertFlange(700, "/3", 16, 930, 80, 790, 5, 24, 39, "M36", 965, 210, 160);
    await insertFlange(700, "/8", 16, 930, 95, 0, 5, 24, 39, "M36", 965, 260, 170);
    // PN25 /3: D=945, b=90, d4=790, f=5, 24 holes, d1=48, M45, PCD=970
    await insertFlange(700, "/3", 25, 945, 90, 790, 5, 24, 48, "M45", 970, 250, 170);
    await insertFlange(700, "/8", 25, 945, 110, 0, 5, 24, 48, "M45", 970, 310, 190);
    // PN40 /3: D=995, b=96, d4=840, f=5, 24 holes, d1=48, M45, PCD=1030
    await insertFlange(700, "/3", 40, 995, 96, 840, 5, 24, 48, "M45", 1030, 290, 180);
    await insertFlange(700, "/8", 40, 995, 115, 0, 5, 24, 48, "M45", 1030, 360, 200);

    // ===== 800NB (OD 812.8mm) =====
    // PN10 /3: D=1015, b=74, d4=875, f=5, 24 holes, d1=39, M36, PCD=1050
    await insertFlange(800, "/3", 10, 1015, 74, 875, 5, 24, 39, "M36", 1050, 220, 155);
    await insertFlange(800, "/8", 10, 1015, 90, 0, 5, 24, 39, "M36", 1050, 280, 165);
    // PN16 /3: D=1050, b=86, d4=895, f=5, 24 holes, d1=42, M39, PCD=1080
    await insertFlange(800, "/3", 16, 1050, 86, 895, 5, 24, 42, "M39", 1080, 280, 170);
    await insertFlange(800, "/8", 16, 1050, 105, 0, 5, 24, 42, "M39", 1080, 350, 185);
    // PN25 /3: D=1080, b=102, d4=900, f=5, 24 holes, d1=56, M52, PCD=1125
    await insertFlange(800, "/3", 25, 1080, 102, 900, 5, 24, 56, "M52", 1125, 350, 185);
    await insertFlange(800, "/8", 25, 1080, 125, 0, 5, 24, 56, "M52", 1125, 440, 210);
    // PN40 /3: D=1140, b=108, d4=960, f=5, 24 holes, d1=56, M52, PCD=1185
    await insertFlange(800, "/3", 40, 1140, 108, 960, 5, 24, 56, "M52", 1185, 400, 195);
    await insertFlange(800, "/8", 40, 1140, 130, 0, 5, 24, 56, "M52", 1185, 500, 220);

    // ===== 900NB (OD 914.4mm) =====
    // PN10 /3: D=1115, b=78, d4=975, f=5, 24 holes, d1=42, M39, PCD=1150
    await insertFlange(900, "/3", 10, 1115, 78, 975, 5, 24, 42, "M39", 1150, 280, 160);
    await insertFlange(900, "/8", 10, 1115, 95, 0, 5, 24, 42, "M39", 1150, 360, 175);
    // PN16 /3: D=1160, b=92, d4=1000, f=5, 24 holes, d1=42, M39, PCD=1190
    await insertFlange(900, "/3", 16, 1160, 92, 1000, 5, 24, 42, "M39", 1190, 360, 175);
    await insertFlange(900, "/8", 16, 1160, 112, 0, 5, 24, 42, "M39", 1190, 450, 195);
    // PN25 /3: D=1185, b=108, d4=1010, f=5, 28 holes, d1=48, M45, PCD=1225
    await insertFlange(900, "/3", 25, 1185, 108, 1010, 5, 28, 48, "M45", 1225, 440, 195);
    await insertFlange(900, "/8", 25, 1185, 130, 0, 5, 28, 48, "M45", 1225, 550, 220);
    // PN40 /3: D=1250, b=118, d4=1070, f=5, 28 holes, d1=56, M52, PCD=1295
    await insertFlange(900, "/3", 40, 1250, 118, 1070, 5, 28, 56, "M52", 1295, 520, 210);
    await insertFlange(900, "/8", 40, 1250, 140, 0, 5, 28, 56, "M52", 1295, 650, 235);

    // ===== 1000NB (OD 1016mm) =====
    // PN10 /3: D=1230, b=82, d4=1080, f=5, 28 holes, d1=42, M39, PCD=1265
    await insertFlange(1000, "/3", 10, 1230, 82, 1080, 5, 28, 42, "M39", 1265, 360, 165);
    await insertFlange(1000, "/8", 10, 1230, 100, 0, 5, 28, 42, "M39", 1265, 460, 180);
    // PN16 /3: D=1280, b=98, d4=1110, f=5, 28 holes, d1=48, M45, PCD=1315
    await insertFlange(1000, "/3", 16, 1280, 98, 1110, 5, 28, 48, "M45", 1315, 470, 185);
    await insertFlange(1000, "/8", 16, 1280, 120, 0, 5, 28, 48, "M45", 1315, 590, 210);
    // PN25 /3: D=1320, b=116, d4=1130, f=5, 28 holes, d1=56, M52, PCD=1365
    await insertFlange(1000, "/3", 25, 1320, 116, 1130, 5, 28, 56, "M52", 1365, 580, 210);
    await insertFlange(1000, "/8", 25, 1320, 140, 0, 5, 28, 56, "M52", 1365, 730, 235);
    // PN40 /3: D=1380, b=130, d4=1180, f=5, 28 holes, d1=62, M56, PCD=1425
    await insertFlange(1000, "/3", 40, 1380, 130, 1180, 5, 28, 62, "M56", 1425, 700, 230);
    await insertFlange(1000, "/8", 40, 1380, 155, 0, 5, 28, 62, "M56", 1425, 880, 260);

    // ===== 1200NB (OD 1219.2mm) =====
    // PN10 /3: D=1455, b=90, d4=1290, f=5, 32 holes, d1=42, M39, PCD=1495
    await insertFlange(1200, "/3", 10, 1455, 90, 1290, 5, 32, 42, "M39", 1495, 520, 175);
    await insertFlange(1200, "/8", 10, 1455, 110, 0, 5, 32, 42, "M39", 1495, 670, 195);
    // PN16 /3: D=1510, b=108, d4=1330, f=5, 32 holes, d1=48, M45, PCD=1555
    await insertFlange(1200, "/3", 16, 1510, 108, 1330, 5, 32, 48, "M45", 1555, 680, 200);
    await insertFlange(1200, "/8", 16, 1510, 130, 0, 5, 32, 48, "M45", 1555, 860, 225);
    // PN25 /3: D=1560, b=128, d4=1360, f=5, 32 holes, d1=56, M52, PCD=1615
    await insertFlange(1200, "/3", 25, 1560, 128, 1360, 5, 32, 56, "M52", 1615, 860, 225);
    await insertFlange(1200, "/8", 25, 1560, 155, 0, 5, 32, 56, "M52", 1615, 1080, 255);
    // PN40 /3: D=1630, b=148, d4=1420, f=5, 32 holes, d1=62, M56, PCD=1685
    await insertFlange(1200, "/3", 40, 1630, 148, 1420, 5, 32, 62, "M56", 1685, 1050, 255);
    await insertFlange(1200, "/8", 40, 1630, 175, 0, 5, 32, 62, "M56", 1685, 1320, 285);

    console.warn("BS4504 special flange data insertion complete");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn("Removing BS4504 special flanges and M38 bolt...");

    const bs4504Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'BS 4504'`,
    );
    if (bs4504Result.length > 0) {
      const bs4504Id = bs4504Result[0].id;
      const largeNbSizes = [700, 800, 900, 1000, 1200];

      for (const nb of largeNbSizes) {
        const nominalResult = await queryRunner.query(`
          SELECT id FROM nominal_outside_diameters
          WHERE nominal_diameter_mm = ${nb}
          LIMIT 1
        `);
        if (nominalResult.length > 0) {
          const nominalId = nominalResult[0].id;
          await queryRunner.query(`
            DELETE FROM flange_dimensions
            WHERE "nominalOutsideDiameterId" = ${nominalId}
              AND "standardId" = ${bs4504Id}
          `);
        }
      }
    }

    await queryRunner.query(`DELETE FROM bolts WHERE designation = 'M38'`);
    console.warn("Reverted BS4504 special flanges and M38 bolt");
  }
}
