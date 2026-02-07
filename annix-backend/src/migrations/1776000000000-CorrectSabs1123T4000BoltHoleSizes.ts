import { MigrationInterface, QueryRunner } from "typeorm";

export class CorrectSabs1123T4000BoltHoleSizes1776000000000 implements MigrationInterface {
  name = "CorrectSabs1123T4000BoltHoleSizes1776000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Correcting SABS 1123 T4000 bolt hole sizes...");

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

    const typeIds: Record<string, number | undefined> = {
      "/1": await getTypeId("/1"),
      "/2": await getTypeId("/2"),
      "/3": await getTypeId("/3"),
      "/7": await getTypeId("/7"),
      "/8": await getTypeId("/8"),
    };

    const updateFlange = async (
      nb: number,
      typeCode: string,
      pressureClass: number,
      d1: number,
      bolt: string,
    ) => {
      const nominalId = await getNominalId(nb);
      const typeId = typeIds[typeCode];
      const pressureClassDesignation = `${pressureClass}${typeCode}`;
      const pressureClassId = await getPressureClassId(pressureClassDesignation);
      const boltId = bolt ? await getBoltId(bolt) : null;

      if (!nominalId || !typeId || !pressureClassId) {
        console.warn(`Skipping ${nb}NB ${pressureClass}${typeCode} - missing IDs`);
        return;
      }

      if (!boltId) {
        console.warn(`Bolt ${bolt} not found, skipping ${nb}NB ${pressureClass}${typeCode}`);
        return;
      }

      await queryRunner.query(`
        UPDATE flange_dimensions SET
          "d1" = ${d1},
          "boltId" = ${boltId}
        WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "standardId" = ${sabs1123Id}
          AND "pressureClassId" = ${pressureClassId}
          AND "flangeTypeId" = ${typeId}
      `);

      console.warn(`Updated ${nb}NB T${pressureClass}${typeCode}: d1=${d1}, bolt=${bolt}`);
    };

    // CORRECTED SABS 1123 T4000 BOLT HOLE SIZES
    // Per ISO 273 / BS EN ISO 273 bolt hole clearances:
    // M36 -> 39mm hole (medium fit)
    // M39 -> 42mm hole (medium fit)
    //
    // 500NB T4000 should use M36 bolts with 39mm holes, not M39 with 42mm holes
    // This is consistent with the SABS 1123 / SANS 1123 standard

    // ===== 500NB T4000 CORRECTIONS =====
    // Correct bolt hole diameter from 42mm to 39mm, bolt from M39 to M36
    await updateFlange(500, "/1", 4000, 39, "M36");
    await updateFlange(500, "/2", 4000, 39, "M36");
    await updateFlange(500, "/3", 4000, 39, "M36");
    await updateFlange(500, "/7", 4000, 39, "M36");
    await updateFlange(500, "/8", 4000, 39, "M36");

    console.warn("SABS 1123 T4000 bolt hole size corrections complete");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn("Reverting SABS 1123 T4000 bolt hole size corrections...");

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

    const typeIds: Record<string, number | undefined> = {
      "/1": await getTypeId("/1"),
      "/2": await getTypeId("/2"),
      "/3": await getTypeId("/3"),
      "/7": await getTypeId("/7"),
      "/8": await getTypeId("/8"),
    };

    const revertFlange = async (
      nb: number,
      typeCode: string,
      pressureClass: number,
      d1: number,
      bolt: string,
    ) => {
      const nominalId = await getNominalId(nb);
      const typeId = typeIds[typeCode];
      const pressureClassDesignation = `${pressureClass}${typeCode}`;
      const pressureClassId = await getPressureClassId(pressureClassDesignation);
      const boltId = bolt ? await getBoltId(bolt) : null;

      if (!nominalId || !typeId || !pressureClassId || !boltId) return;

      await queryRunner.query(`
        UPDATE flange_dimensions SET
          "d1" = ${d1},
          "boltId" = ${boltId}
        WHERE "nominalOutsideDiameterId" = ${nominalId}
          AND "standardId" = ${sabs1123Id}
          AND "pressureClassId" = ${pressureClassId}
          AND "flangeTypeId" = ${typeId}
      `);
    };

    // Revert to previous (incorrect) values
    await revertFlange(500, "/1", 4000, 42, "M39");
    await revertFlange(500, "/2", 4000, 42, "M39");
    await revertFlange(500, "/3", 4000, 42, "M39");
    await revertFlange(500, "/7", 4000, 42, "M39");
    await revertFlange(500, "/8", 4000, 42, "M39");
  }
}
