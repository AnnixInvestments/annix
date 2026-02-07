import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWasherData1772800000000 implements MigrationInterface {
  name = "AddWasherData1772800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding washer data (flat, split, tooth, belleville)...");

    const boltIdColumnExists = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'washers' AND column_name = 'bolt_id'`,
    );
    if (boltIdColumnExists.length === 0) {
      const camelCaseColumnExists = await queryRunner.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'washers' AND column_name = 'boltId'`,
      );
      if (camelCaseColumnExists.length > 0) {
        console.warn("Renaming boltId column to bolt_id...");
        await queryRunner.query(`ALTER TABLE washers RENAME COLUMN "boltId" TO bolt_id`);
      }
    }

    const flatWasherData: Record<
      string,
      { massKg: number; odMm: number; idMm: number; thicknessMm: number }
    > = {
      M6: { massKg: 0.002, odMm: 12.5, idMm: 6.4, thicknessMm: 1.6 },
      M8: { massKg: 0.004, odMm: 16.0, idMm: 8.4, thicknessMm: 1.6 },
      M10: { massKg: 0.007, odMm: 20.0, idMm: 10.5, thicknessMm: 2.0 },
      M12: { massKg: 0.01, odMm: 24.0, idMm: 13.0, thicknessMm: 2.5 },
      M14: { massKg: 0.015, odMm: 28.0, idMm: 15.0, thicknessMm: 2.5 },
      M16: { massKg: 0.021, odMm: 30.0, idMm: 17.0, thicknessMm: 3.0 },
      M18: { massKg: 0.029, odMm: 34.0, idMm: 19.0, thicknessMm: 3.0 },
      M20: { massKg: 0.037, odMm: 37.0, idMm: 21.0, thicknessMm: 3.0 },
      M22: { massKg: 0.049, odMm: 40.0, idMm: 23.0, thicknessMm: 3.5 },
      M24: { massKg: 0.055, odMm: 44.0, idMm: 25.0, thicknessMm: 4.0 },
      M27: { massKg: 0.082, odMm: 50.0, idMm: 28.0, thicknessMm: 4.0 },
      M30: { massKg: 0.109, odMm: 56.0, idMm: 31.0, thicknessMm: 4.0 },
      M33: { massKg: 0.145, odMm: 60.0, idMm: 34.0, thicknessMm: 5.0 },
      M36: { massKg: 0.181, odMm: 66.0, idMm: 37.0, thicknessMm: 5.0 },
      M39: { massKg: 0.236, odMm: 72.0, idMm: 40.0, thicknessMm: 6.0 },
      M42: { massKg: 0.29, odMm: 78.0, idMm: 43.0, thicknessMm: 7.0 },
      M45: { massKg: 0.356, odMm: 85.0, idMm: 46.0, thicknessMm: 7.0 },
      M48: { massKg: 0.431, odMm: 92.0, idMm: 50.0, thicknessMm: 8.0 },
      M52: { massKg: 0.55, odMm: 98.0, idMm: 54.0, thicknessMm: 8.0 },
      M56: { massKg: 0.677, odMm: 105.0, idMm: 58.0, thicknessMm: 9.0 },
      M60: { massKg: 0.836, odMm: 110.0, idMm: 62.0, thicknessMm: 9.0 },
      M64: { massKg: 0.995, odMm: 115.0, idMm: 66.0, thicknessMm: 9.0 },
    };

    const splitWasherData: Record<
      string,
      { massKg: number; odMm: number; idMm: number; thicknessMm: number }
    > = {
      M6: { massKg: 0.001, odMm: 11.8, idMm: 6.1, thicknessMm: 1.6 },
      M8: { massKg: 0.003, odMm: 14.8, idMm: 8.1, thicknessMm: 2.0 },
      M10: { massKg: 0.005, odMm: 18.1, idMm: 10.2, thicknessMm: 2.5 },
      M12: { massKg: 0.008, odMm: 21.1, idMm: 12.2, thicknessMm: 2.5 },
      M14: { massKg: 0.012, odMm: 24.1, idMm: 14.2, thicknessMm: 3.0 },
      M16: { massKg: 0.017, odMm: 27.4, idMm: 16.2, thicknessMm: 3.5 },
      M18: { massKg: 0.024, odMm: 29.4, idMm: 18.2, thicknessMm: 3.5 },
      M20: { massKg: 0.031, odMm: 33.6, idMm: 20.2, thicknessMm: 4.0 },
      M22: { massKg: 0.041, odMm: 35.9, idMm: 22.5, thicknessMm: 4.0 },
      M24: { massKg: 0.049, odMm: 40.0, idMm: 24.5, thicknessMm: 5.0 },
      M27: { massKg: 0.073, odMm: 43.0, idMm: 27.5, thicknessMm: 5.0 },
      M30: { massKg: 0.098, odMm: 48.2, idMm: 30.5, thicknessMm: 6.0 },
      M33: { massKg: 0.131, odMm: 53.2, idMm: 33.5, thicknessMm: 6.0 },
      M36: { massKg: 0.167, odMm: 58.2, idMm: 37.0, thicknessMm: 6.0 },
      M39: { massKg: 0.218, odMm: 63.5, idMm: 40.0, thicknessMm: 7.0 },
      M42: { massKg: 0.268, odMm: 68.2, idMm: 43.0, thicknessMm: 7.0 },
      M48: { massKg: 0.398, odMm: 80.0, idMm: 50.0, thicknessMm: 8.0 },
    };

    const toothWasherData: Record<
      string,
      { massKg: number; odMm: number; idMm: number; thicknessMm: number }
    > = {
      M6: { massKg: 0.002, odMm: 11.0, idMm: 6.4, thicknessMm: 0.7 },
      M8: { massKg: 0.003, odMm: 15.0, idMm: 8.4, thicknessMm: 0.8 },
      M10: { massKg: 0.005, odMm: 18.0, idMm: 10.5, thicknessMm: 0.9 },
      M12: { massKg: 0.007, odMm: 20.0, idMm: 13.0, thicknessMm: 1.0 },
      M14: { massKg: 0.01, odMm: 24.0, idMm: 15.0, thicknessMm: 1.0 },
      M16: { massKg: 0.014, odMm: 26.0, idMm: 17.0, thicknessMm: 1.2 },
      M20: { massKg: 0.025, odMm: 32.0, idMm: 21.0, thicknessMm: 1.5 },
      M24: { massKg: 0.037, odMm: 40.0, idMm: 25.0, thicknessMm: 1.8 },
    };

    const bellevilleWasherData: Record<
      string,
      { massKg: number; odMm: number; idMm: number; thicknessMm: number }
    > = {
      M6: { massKg: 0.002, odMm: 12.5, idMm: 6.2, thicknessMm: 0.5 },
      M8: { massKg: 0.004, odMm: 16.0, idMm: 8.2, thicknessMm: 0.6 },
      M10: { massKg: 0.007, odMm: 20.0, idMm: 10.2, thicknessMm: 0.7 },
      M12: { massKg: 0.012, odMm: 25.0, idMm: 12.2, thicknessMm: 0.9 },
      M14: { massKg: 0.017, odMm: 28.0, idMm: 14.2, thicknessMm: 1.0 },
      M16: { massKg: 0.025, odMm: 31.5, idMm: 16.3, thicknessMm: 1.25 },
      M18: { massKg: 0.033, odMm: 35.5, idMm: 18.3, thicknessMm: 1.5 },
      M20: { massKg: 0.045, odMm: 40.0, idMm: 20.4, thicknessMm: 1.5 },
      M24: { massKg: 0.078, odMm: 50.0, idMm: 25.0, thicknessMm: 2.0 },
      M27: { massKg: 0.098, odMm: 56.0, idMm: 28.0, thicknessMm: 2.0 },
      M30: { massKg: 0.14, odMm: 60.0, idMm: 31.0, thicknessMm: 2.5 },
      M36: { massKg: 0.22, odMm: 71.0, idMm: 37.0, thicknessMm: 3.0 },
    };

    const imperialFlatWasherData: Record<
      string,
      { massKg: number; odMm: number; idMm: number; thicknessMm: number }
    > = {
      '1/2" UNC': { massKg: 0.015, odMm: 25.4, idMm: 13.5, thicknessMm: 3.2 },
      '5/8" UNC': { massKg: 0.025, odMm: 31.8, idMm: 17.5, thicknessMm: 3.2 },
      '3/4" UNC': { massKg: 0.041, odMm: 38.1, idMm: 20.6, thicknessMm: 4.0 },
      '7/8" UNC': { massKg: 0.061, odMm: 44.5, idMm: 23.8, thicknessMm: 4.8 },
      '1" UNC': { massKg: 0.091, odMm: 50.8, idMm: 27.0, thicknessMm: 4.8 },
      '1-1/8" UNC': { massKg: 0.127, odMm: 57.2, idMm: 30.2, thicknessMm: 4.8 },
      '1-1/4" UNC': { massKg: 0.172, odMm: 63.5, idMm: 33.3, thicknessMm: 4.8 },
      '1-3/8" UNC': { massKg: 0.227, odMm: 69.9, idMm: 36.5, thicknessMm: 5.6 },
      '1-1/2" UNC': { massKg: 0.295, odMm: 76.2, idMm: 39.7, thicknessMm: 5.6 },
      '1-3/4" UNC': { massKg: 0.455, odMm: 88.9, idMm: 46.0, thicknessMm: 6.4 },
      '2" UNC': { massKg: 0.636, odMm: 101.6, idMm: 52.4, thicknessMm: 6.4 },
    };

    const washerTypes = [
      { data: flatWasherData, type: "flat", material: "Carbon Steel" },
      { data: splitWasherData, type: "split", material: "Carbon Steel" },
      { data: toothWasherData, type: "tooth", material: "Carbon Steel" },
      {
        data: bellevilleWasherData,
        type: "belleville",
        material: "Carbon Steel",
      },
      { data: imperialFlatWasherData, type: "flat", material: "Carbon Steel" },
    ];

    for (const { data, type, material } of washerTypes) {
      for (const [designation, spec] of Object.entries(data)) {
        const boltResult = await queryRunner.query("SELECT id FROM bolts WHERE designation = $1", [
          designation,
        ]);
        if (boltResult.length === 0) continue;
        const boltId = boltResult[0].id;

        await queryRunner.query(
          `
          INSERT INTO washers (bolt_id, type, material, "massKg", od_mm, id_mm, thickness_mm)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `,
          [boltId, type, material, spec.massKg, spec.odMm, spec.idMm, spec.thicknessMm],
        );
      }
    }

    const ssFlatWasherData: Record<
      string,
      { massKg: number; odMm: number; idMm: number; thicknessMm: number }
    > = {
      M10: { massKg: 0.006, odMm: 20.0, idMm: 10.5, thicknessMm: 2.0 },
      M12: { massKg: 0.009, odMm: 24.0, idMm: 13.0, thicknessMm: 2.5 },
      M16: { massKg: 0.019, odMm: 30.0, idMm: 17.0, thicknessMm: 3.0 },
      M20: { massKg: 0.034, odMm: 37.0, idMm: 21.0, thicknessMm: 3.0 },
      M24: { massKg: 0.05, odMm: 44.0, idMm: 25.0, thicknessMm: 4.0 },
      M30: { massKg: 0.1, odMm: 56.0, idMm: 31.0, thicknessMm: 4.0 },
      M36: { massKg: 0.166, odMm: 66.0, idMm: 37.0, thicknessMm: 5.0 },
    };

    for (const [designation, spec] of Object.entries(ssFlatWasherData)) {
      const boltResult = await queryRunner.query("SELECT id FROM bolts WHERE designation = $1", [
        designation,
      ]);
      if (boltResult.length === 0) continue;
      const boltId = boltResult[0].id;

      await queryRunner.query(
        `
        INSERT INTO washers (bolt_id, type, material, "massKg", od_mm, id_mm, thickness_mm)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `,
        [
          boltId,
          "flat",
          "Stainless Steel 316",
          spec.massKg,
          spec.odMm,
          spec.idMm,
          spec.thicknessMm,
        ],
      );
    }

    console.warn("Washer data added successfully.");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM washers");
  }
}
