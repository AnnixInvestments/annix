import { MigrationInterface, QueryRunner } from "typeorm";

export class CorrectAsmeB165RaisedFaceDiameters1776300000000 implements MigrationInterface {
  name = "CorrectAsmeB165RaisedFaceDiameters1776300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      "Correcting ASME B16.5 raised face diameter (d4) values per MPS Technical Manual...",
    );

    const asmeB165Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.5'`,
    );
    if (asmeB165Result.length === 0) {
      console.warn("ASME B16.5 standard not found, skipping...");
      return;
    }
    const asmeB165Id = asmeB165Result[0].id;

    // Correct raised face diameter (G) values from MPS Technical Manual
    // The d4 values were incorrectly set to pipe OD values instead of raised face diameters
    // Raised face diameter is the same across all pressure classes for a given pipe size
    // Note: /8 (Blind) flanges keep d4=0 as they don't have a raised face opening
    const correctD4Values: Record<number, number> = {
      15: 35, // 1/2" NPS: G = 1.38" = 35mm
      20: 43, // 3/4" NPS: G = 1.69" = 43mm
      25: 51, // 1" NPS: G = 2.00" = 51mm
      32: 64, // 1-1/4" NPS: G = 2.50" = 64mm
      40: 73, // 1-1/2" NPS: G = 2.88" = 73mm
      50: 92, // 2" NPS: G = 3.62" = 92mm
      65: 105, // 2-1/2" NPS: G = 4.12" = 105mm
      80: 127, // 3" NPS: G = 5.00" = 127mm
      90: 140, // 3-1/2" NPS: G = 5.50" = 140mm
      100: 157, // 4" NPS: G = 6.19" = 157mm
      125: 186, // 5" NPS: G = 7.31" = 186mm
      150: 216, // 6" NPS: G = 8.50" = 216mm
      200: 270, // 8" NPS: G = 10.62" = 270mm
      250: 324, // 10" NPS: G = 12.75" = 324mm
      300: 381, // 12" NPS: G = 15.00" = 381mm
      350: 413, // 14" NPS: G = 16.25" = 413mm
      400: 470, // 16" NPS: G = 18.50" = 470mm
      450: 533, // 18" NPS: G = 21.00" = 533mm
      500: 584, // 20" NPS: G = 23.00" = 584mm
      600: 692, // 24" NPS: G = 27.25" = 692mm
    };

    const getTypeId = async (code: string) => {
      const result = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '${code}'`);
      return result[0]?.id;
    };

    const blindTypeId = await getTypeId("/8");

    let updatedCount = 0;

    for (const [nbStr, correctD4] of Object.entries(correctD4Values)) {
      const nb = parseInt(nbStr, 10);

      const nominalResult = await queryRunner.query(`
        SELECT id FROM nominal_outside_diameters
        WHERE nominal_diameter_mm = ${nb}
        LIMIT 1
      `);

      if (nominalResult.length === 0) {
        console.warn(`Nominal size ${nb}NB not found, skipping...`);
        continue;
      }
      const nominalId = nominalResult[0].id;

      // Update d4 for all non-blind flange types (blind flanges keep d4=0)
      const result = await queryRunner.query(`
        UPDATE flange_dimensions
        SET d4 = ${correctD4}
        WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "standardId" = ${asmeB165Id}
          AND ("flangeTypeId" IS NULL OR "flangeTypeId" != ${blindTypeId})
          AND d4 != ${correctD4}
      `);

      const rowCount = result[1] || 0;
      if (rowCount > 0) {
        console.warn(`Updated ${rowCount} records for ${nb}NB to d4=${correctD4}`);
        updatedCount += rowCount;
      }
    }

    console.warn(
      `ASME B16.5 raised face diameter corrections complete. Updated ${updatedCount} total records.`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      "Reverting ASME B16.5 raised face diameters to previous (incorrect) pipe OD values",
    );

    const asmeB165Result = await queryRunner.query(
      `SELECT id FROM flange_standards WHERE code = 'ASME B16.5'`,
    );
    if (asmeB165Result.length === 0) return;
    const asmeB165Id = asmeB165Result[0].id;

    // Previous incorrect d4 values (were using pipe OD instead of raised face diameter)
    const previousD4Values: Record<number, number> = {
      15: 22,
      20: 27,
      25: 34,
      32: 43,
      40: 49,
      50: 62,
      65: 78,
      80: 90,
      90: 100,
      100: 115,
      125: 144,
      150: 170,
      200: 222,
      250: 276,
      300: 327,
      350: 359,
      400: 410,
      450: 462,
      500: 513,
      600: 616,
    };

    const getTypeId = async (code: string) => {
      const result = await queryRunner.query(`SELECT id FROM flange_types WHERE code = '${code}'`);
      return result[0]?.id;
    };

    const blindTypeId = await getTypeId("/8");

    for (const [nbStr, previousD4] of Object.entries(previousD4Values)) {
      const nb = parseInt(nbStr, 10);

      const nominalResult = await queryRunner.query(`
        SELECT id FROM nominal_outside_diameters
        WHERE nominal_diameter_mm = ${nb}
        LIMIT 1
      `);

      if (nominalResult.length === 0) continue;
      const nominalId = nominalResult[0].id;

      await queryRunner.query(`
        UPDATE flange_dimensions
        SET d4 = ${previousD4}
        WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "standardId" = ${asmeB165Id}
          AND ("flangeTypeId" IS NULL OR "flangeTypeId" != ${blindTypeId})
      `);
    }

    console.warn("Reverted ASME B16.5 raised face diameters");
  }
}
