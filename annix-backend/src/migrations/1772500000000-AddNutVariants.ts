import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNutVariants1772500000000 implements MigrationInterface {
  name = "AddNutVariants1772500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding nut variants (lock nuts, flange nuts, SS nuts)...");

    const hexNutMassData: Record<string, Record<string, number>> = {
      M10: { "Grade 8": 0.012, "Grade 2H": 0.012, "8M SS": 0.011 },
      M12: { "Grade 8": 0.017, "Grade 2H": 0.017, "8M SS": 0.016 },
      M14: { "Grade 8": 0.027, "Grade 2H": 0.027, "8M SS": 0.025 },
      M16: { "Grade 8": 0.037, "Grade 2H": 0.037, "8M SS": 0.034 },
      M18: { "Grade 8": 0.051, "Grade 2H": 0.051, "8M SS": 0.047 },
      M20: { "Grade 8": 0.065, "Grade 2H": 0.065, "8M SS": 0.06 },
      M22: { "Grade 8": 0.086, "Grade 2H": 0.086, "8M SS": 0.08 },
      M24: { "Grade 8": 0.098, "Grade 2H": 0.098, "8M SS": 0.091 },
      M27: { "Grade 8": 0.145, "Grade 2H": 0.145, "8M SS": 0.134 },
      M30: { "Grade 8": 0.194, "Grade 2H": 0.194, "8M SS": 0.179 },
      M33: { "Grade 8": 0.26, "Grade 2H": 0.26, "8M SS": 0.24 },
      M36: { "Grade 8": 0.335, "Grade 2H": 0.335, "8M SS": 0.309 },
      M39: { "Grade 8": 0.435, "Grade 2H": 0.435, "8M SS": 0.401 },
      M42: { "Grade 8": 0.54, "Grade 2H": 0.54, "8M SS": 0.498 },
      M45: { "Grade 8": 0.665, "Grade 2H": 0.665, "8M SS": 0.614 },
      M48: { "Grade 8": 0.806, "Grade 2H": 0.806, "8M SS": 0.744 },
      M52: { "Grade 8": 1.03, "Grade 2H": 1.03, "8M SS": 0.95 },
      M56: { "Grade 8": 1.27, "Grade 2H": 1.27, "8M SS": 1.172 },
      M60: { "Grade 8": 1.57, "Grade 2H": 1.57, "8M SS": 1.449 },
      M64: { "Grade 8": 1.87, "Grade 2H": 1.87, "8M SS": 1.725 },
    };

    const lockNutMassData: Record<string, number> = {
      M10: 0.015,
      M12: 0.022,
      M14: 0.034,
      M16: 0.047,
      M18: 0.065,
      M20: 0.083,
      M22: 0.11,
      M24: 0.125,
      M27: 0.184,
      M30: 0.246,
      M33: 0.33,
      M36: 0.425,
      M39: 0.55,
      M42: 0.685,
      M48: 1.02,
    };

    const flangeNutMassData: Record<string, number> = {
      M10: 0.018,
      M12: 0.026,
      M14: 0.041,
      M16: 0.056,
      M18: 0.078,
      M20: 0.1,
      M22: 0.132,
      M24: 0.15,
      M27: 0.221,
      M30: 0.295,
      M33: 0.396,
      M36: 0.51,
    };

    const imperialHexNutData: Record<string, Record<string, number>> = {
      '1/2" UNC': { "Grade 2H": 0.025, "Grade 8": 0.025 },
      '5/8" UNC': { "Grade 2H": 0.045, "Grade 8": 0.045 },
      '3/4" UNC': { "Grade 2H": 0.075, "Grade 8": 0.075 },
      '7/8" UNC': { "Grade 2H": 0.115, "Grade 8": 0.115 },
      '1" UNC': { "Grade 2H": 0.17, "Grade 8": 0.17 },
      '1-1/8" UNC': { "Grade 2H": 0.24, "Grade 8": 0.24 },
      '1-1/4" UNC': { "Grade 2H": 0.325, "Grade 8": 0.325 },
      '1-3/8" UNC': { "Grade 2H": 0.43, "Grade 8": 0.43 },
      '1-1/2" UNC': { "Grade 2H": 0.56, "Grade 8": 0.56 },
      '1-5/8" UNC': { "Grade 2H": 0.705, "Grade 8": 0.705 },
      '1-3/4" UNC': { "Grade 2H": 0.87, "Grade 8": 0.87 },
      '2" UNC': { "Grade 2H": 1.185, "Grade 8": 1.185 },
    };

    for (const [designation, grades] of Object.entries(hexNutMassData)) {
      const boltResult = await queryRunner.query("SELECT id FROM bolts WHERE designation = $1", [
        designation,
      ]);
      if (boltResult.length === 0) continue;
      const boltId = boltResult[0].id;

      for (const [grade, massKg] of Object.entries(grades)) {
        await queryRunner.query(
          `
          INSERT INTO nut_masses (bolt_id, mass_kg, grade, type)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `,
          [boltId, massKg, grade, "hex"],
        );
      }
    }

    for (const [designation, massKg] of Object.entries(lockNutMassData)) {
      const boltResult = await queryRunner.query("SELECT id FROM bolts WHERE designation = $1", [
        designation,
      ]);
      if (boltResult.length === 0) continue;
      const boltId = boltResult[0].id;

      await queryRunner.query(
        `
        INSERT INTO nut_masses (bolt_id, mass_kg, grade, type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `,
        [boltId, massKg, "Grade 8", "lock"],
      );
    }

    for (const [designation, massKg] of Object.entries(flangeNutMassData)) {
      const boltResult = await queryRunner.query("SELECT id FROM bolts WHERE designation = $1", [
        designation,
      ]);
      if (boltResult.length === 0) continue;
      const boltId = boltResult[0].id;

      await queryRunner.query(
        `
        INSERT INTO nut_masses (bolt_id, mass_kg, grade, type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `,
        [boltId, massKg, "Grade 8", "flange"],
      );
    }

    for (const [designation, grades] of Object.entries(imperialHexNutData)) {
      const boltResult = await queryRunner.query("SELECT id FROM bolts WHERE designation = $1", [
        designation,
      ]);
      if (boltResult.length === 0) continue;
      const boltId = boltResult[0].id;

      for (const [grade, massKg] of Object.entries(grades)) {
        await queryRunner.query(
          `
          INSERT INTO nut_masses (bolt_id, mass_kg, grade, type)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `,
          [boltId, massKg, grade, "hex"],
        );
      }
    }

    console.warn("Nut variants added successfully.");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM nut_masses
      WHERE grade IN ('Grade 8', 'Grade 2H', '8M SS')
      OR type IN ('lock', 'flange')
    `);
  }
}
