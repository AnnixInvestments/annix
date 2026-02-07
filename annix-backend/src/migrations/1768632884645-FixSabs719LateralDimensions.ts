import { MigrationInterface, QueryRunner } from "typeorm";

export class FixSabs719LateralDimensions1768632884645 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sabs719_fitting_dimension"
      ADD COLUMN IF NOT EXISTS "angle_range" VARCHAR(20)
    `);

    await queryRunner.query(`
      DELETE FROM "sabs719_fitting_dimension" WHERE "fitting_type" = 'LATERAL'
    `);

    const lateralData = [
      {
        nb: 200,
        od: 219.1,
        a60: 430,
        b60: 610,
        a45: 610,
        b45: 710,
        a30: 815,
        b30: 915,
      },
      {
        nb: 250,
        od: 273.1,
        a60: 485,
        b60: 685,
        a45: 685,
        b45: 815,
        a30: 940,
        b30: 1065,
      },
      {
        nb: 300,
        od: 323.9,
        a60: 535,
        b60: 760,
        a45: 760,
        b45: 915,
        a30: 1005,
        b30: 1220,
      },
      {
        nb: 350,
        od: 355.6,
        a60: 585,
        b60: 840,
        a45: 840,
        b45: 1020,
        a30: 1195,
        b30: 1370,
      },
      {
        nb: 400,
        od: 406.4,
        a60: 635,
        b60: 915,
        a45: 915,
        b45: 1120,
        a30: 1320,
        b30: 1520,
      },
      {
        nb: 450,
        od: 457.0,
        a60: 685,
        b60: 990,
        a45: 990,
        b45: 1220,
        a30: 1450,
        b30: 1670,
      },
      {
        nb: 500,
        od: 508.0,
        a60: 740,
        b60: 1065,
        a45: 1065,
        b45: 1320,
        a30: 1575,
        b30: 1830,
      },
      {
        nb: 550,
        od: 559.0,
        a60: 790,
        b60: 1140,
        a45: 1140,
        b45: 1420,
        a30: 1700,
        b30: 1980,
      },
      {
        nb: 600,
        od: 610.0,
        a60: 840,
        b60: 1220,
        a45: 1220,
        b45: 1520,
        a30: 1830,
        b30: 2130,
      },
      {
        nb: 650,
        od: 660.0,
        a60: 890,
        b60: 1295,
        a45: 1295,
        b45: 1630,
        a30: 1955,
        b30: 2280,
      },
      {
        nb: 700,
        od: 711.0,
        a60: 940,
        b60: 1370,
        a45: 1370,
        b45: 1730,
        a30: 2080,
        b30: 2430,
      },
      {
        nb: 750,
        od: 762.0,
        a60: 990,
        b60: 1445,
        a45: 1445,
        b45: 1830,
        a30: 2210,
        b30: 2595,
      },
      {
        nb: 800,
        od: 813.0,
        a60: 1045,
        b60: 1520,
        a45: 1520,
        b45: 1930,
        a30: 2335,
        b30: 2745,
      },
      {
        nb: 850,
        od: 864.0,
        a60: 1095,
        b60: 1595,
        a45: 1595,
        b45: 2030,
        a30: 2465,
        b30: 2895,
      },
      {
        nb: 900,
        od: 914.0,
        a60: 1145,
        b60: 1670,
        a45: 1670,
        b45: 2130,
        a30: 2595,
        b30: 3040,
      },
    ];

    for (const data of lateralData) {
      await queryRunner.query(`
        INSERT INTO "sabs719_fitting_dimension" (
          fitting_type, nominal_diameter_mm, outside_diameter_mm, angle_range, dimension_a_mm, dimension_b_mm
        ) VALUES ('LATERAL', ${data.nb}, ${data.od}, '60-90', ${data.a60}, ${data.b60})
      `);
      await queryRunner.query(`
        INSERT INTO "sabs719_fitting_dimension" (
          fitting_type, nominal_diameter_mm, outside_diameter_mm, angle_range, dimension_a_mm, dimension_b_mm
        ) VALUES ('LATERAL', ${data.nb}, ${data.od}, '45-59', ${data.a45}, ${data.b45})
      `);
      await queryRunner.query(`
        INSERT INTO "sabs719_fitting_dimension" (
          fitting_type, nominal_diameter_mm, outside_diameter_mm, angle_range, dimension_a_mm, dimension_b_mm
        ) VALUES ('LATERAL', ${data.nb}, ${data.od}, '30-44', ${data.a30}, ${data.b30})
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "sabs719_fitting_dimension" WHERE "fitting_type" = 'LATERAL'
    `);
    await queryRunner.query(`
      ALTER TABLE "sabs719_fitting_dimension"
      DROP COLUMN IF EXISTS "angle_range"
    `);
  }
}
