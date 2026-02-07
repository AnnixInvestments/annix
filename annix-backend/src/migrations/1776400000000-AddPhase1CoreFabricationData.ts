import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhase1CoreFabricationData1776400000000 implements MigrationInterface {
  name = "AddPhase1CoreFabricationData1776400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn("Phase 1: Creating ANSI B16.9 and forged fitting tables with data...");

    await this.createAnsiB169Tables(queryRunner);
    await this.createForgedFittingTables(queryRunner);
    await this.addAstmA312StainlessSchedules(queryRunner);
    await this.populateAnsiB169Data(queryRunner);
    await this.populateForgedFittingData(queryRunner);

    console.warn("Phase 1 migration complete.");
  }

  private async createAnsiB169Tables(queryRunner: QueryRunner): Promise<void> {
    console.warn("Creating ANSI B16.9 fitting tables...");

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ansi_b16_9_fitting_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(255)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ansi_b16_9_fitting_dimensions (
        id SERIAL PRIMARY KEY,
        fitting_type_id INT NOT NULL REFERENCES ansi_b16_9_fitting_types(id),
        nps VARCHAR(20) NOT NULL,
        nb_mm DECIMAL(10,2) NOT NULL,
        outside_diameter_mm DECIMAL(10,2) NOT NULL,
        schedule VARCHAR(20) NOT NULL,
        wall_thickness_mm DECIMAL(8,2) NOT NULL,
        branch_nps VARCHAR(20),
        branch_od_mm DECIMAL(10,2),
        center_to_face_a_mm DECIMAL(10,2),
        center_to_face_b_mm DECIMAL(10,2),
        center_to_center_o_mm DECIMAL(10,2),
        back_to_face_k_mm DECIMAL(10,2),
        center_to_end_c_mm DECIMAL(10,2),
        center_to_end_m_mm DECIMAL(10,2),
        weight_kg DECIMAL(10,3),
        UNIQUE(fitting_type_id, nps, schedule, branch_nps)
      )
    `);
  }

  private async createForgedFittingTables(queryRunner: QueryRunner): Promise<void> {
    console.warn("Creating forged fitting tables...");

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forged_fitting_series (
        id SERIAL PRIMARY KEY,
        pressure_class INT NOT NULL,
        connection_type VARCHAR(20) NOT NULL,
        standard_code VARCHAR(50) DEFAULT 'ASME B16.11',
        description VARCHAR(255),
        UNIQUE(pressure_class, connection_type)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forged_fitting_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(255)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forged_fitting_dimensions (
        id SERIAL PRIMARY KEY,
        series_id INT NOT NULL REFERENCES forged_fitting_series(id),
        fitting_type_id INT NOT NULL REFERENCES forged_fitting_types(id),
        nominal_bore_mm DECIMAL(10,2) NOT NULL,
        dimension_a_mm DECIMAL(10,2),
        dimension_b_mm DECIMAL(10,2),
        dimension_c_mm DECIMAL(10,2),
        dimension_d_mm DECIMAL(10,2),
        dimension_e_mm DECIMAL(10,2),
        mass_kg DECIMAL(10,3),
        UNIQUE(series_id, fitting_type_id, nominal_bore_mm)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forged_fitting_pt_ratings (
        id SERIAL PRIMARY KEY,
        series_id INT NOT NULL REFERENCES forged_fitting_series(id),
        temperature_celsius INT NOT NULL,
        pressure_mpa DECIMAL(10,2) NOT NULL,
        material_group VARCHAR(50) DEFAULT 'Carbon Steel',
        UNIQUE(series_id, temperature_celsius)
      )
    `);
  }

  private async addAstmA312StainlessSchedules(queryRunner: QueryRunner): Promise<void> {
    console.warn("Adding ASTM A312 stainless steel pipe schedules...");

    const stainlessData = [
      { nps: "1/8", nbMm: 6, odMm: 10.3, schedule: "10S", wallMm: 1.24 },
      { nps: "1/4", nbMm: 8, odMm: 13.71, schedule: "10S", wallMm: 1.65 },
      { nps: "1/4", nbMm: 8, odMm: 13.71, schedule: "40S", wallMm: 2.24 },
      { nps: "3/8", nbMm: 10, odMm: 17.14, schedule: "5S", wallMm: 1.65 },
      { nps: "3/8", nbMm: 10, odMm: 17.14, schedule: "10S", wallMm: 2.11 },
      { nps: "3/8", nbMm: 10, odMm: 17.14, schedule: "40S", wallMm: 2.31 },
      { nps: "1/2", nbMm: 15, odMm: 21.34, schedule: "5S", wallMm: 1.65 },
      { nps: "1/2", nbMm: 15, odMm: 21.34, schedule: "10S", wallMm: 2.77 },
      { nps: "1/2", nbMm: 15, odMm: 21.34, schedule: "40S", wallMm: 2.77 },
      { nps: "1/2", nbMm: 15, odMm: 21.34, schedule: "XS", wallMm: 3.73 },
      { nps: "3/4", nbMm: 20, odMm: 26.67, schedule: "5S", wallMm: 1.65 },
      { nps: "3/4", nbMm: 20, odMm: 26.67, schedule: "10S", wallMm: 2.11 },
      { nps: "3/4", nbMm: 20, odMm: 26.67, schedule: "40S", wallMm: 2.87 },
      { nps: "3/4", nbMm: 20, odMm: 26.67, schedule: "XS", wallMm: 3.91 },
      { nps: "1", nbMm: 25, odMm: 33.4, schedule: "5S", wallMm: 1.65 },
      { nps: "1", nbMm: 25, odMm: 33.4, schedule: "10S", wallMm: 2.77 },
      { nps: "1", nbMm: 25, odMm: 33.4, schedule: "40S", wallMm: 3.38 },
      { nps: "1", nbMm: 25, odMm: 33.4, schedule: "XS", wallMm: 4.55 },
      { nps: "1-1/4", nbMm: 32, odMm: 42.16, schedule: "5S", wallMm: 1.65 },
      { nps: "1-1/4", nbMm: 32, odMm: 42.16, schedule: "10S", wallMm: 2.77 },
      { nps: "1-1/4", nbMm: 32, odMm: 42.16, schedule: "40S", wallMm: 3.56 },
      { nps: "1-1/4", nbMm: 32, odMm: 42.16, schedule: "XS", wallMm: 4.85 },
      { nps: "1-1/2", nbMm: 40, odMm: 48.26, schedule: "5S", wallMm: 1.65 },
      { nps: "1-1/2", nbMm: 40, odMm: 48.26, schedule: "10S", wallMm: 2.77 },
      { nps: "1-1/2", nbMm: 40, odMm: 48.26, schedule: "40S", wallMm: 3.68 },
      { nps: "1-1/2", nbMm: 40, odMm: 48.26, schedule: "XS", wallMm: 5.08 },
      { nps: "2", nbMm: 50, odMm: 60.32, schedule: "5S", wallMm: 1.65 },
      { nps: "2", nbMm: 50, odMm: 60.32, schedule: "10S", wallMm: 2.77 },
      { nps: "2", nbMm: 50, odMm: 60.32, schedule: "40S", wallMm: 3.91 },
      { nps: "2", nbMm: 50, odMm: 60.32, schedule: "XS", wallMm: 5.54 },
      { nps: "2-1/2", nbMm: 65, odMm: 73.02, schedule: "5S", wallMm: 2.11 },
      { nps: "2-1/2", nbMm: 65, odMm: 73.02, schedule: "10S", wallMm: 3.05 },
      { nps: "2-1/2", nbMm: 65, odMm: 73.02, schedule: "40S", wallMm: 5.16 },
      { nps: "2-1/2", nbMm: 65, odMm: 73.02, schedule: "XS", wallMm: 7.01 },
      { nps: "3", nbMm: 80, odMm: 88.9, schedule: "5S", wallMm: 2.11 },
      { nps: "3", nbMm: 80, odMm: 88.9, schedule: "10S", wallMm: 3.05 },
      { nps: "3", nbMm: 80, odMm: 88.9, schedule: "40S", wallMm: 5.49 },
      { nps: "3", nbMm: 80, odMm: 88.9, schedule: "XS", wallMm: 7.62 },
      { nps: "3-1/2", nbMm: 90, odMm: 101.6, schedule: "5S", wallMm: 2.11 },
      { nps: "3-1/2", nbMm: 90, odMm: 101.6, schedule: "10S", wallMm: 3.05 },
      { nps: "3-1/2", nbMm: 90, odMm: 101.6, schedule: "40S", wallMm: 5.74 },
      { nps: "3-1/2", nbMm: 90, odMm: 101.6, schedule: "XS", wallMm: 8.08 },
      { nps: "4", nbMm: 100, odMm: 114.3, schedule: "5S", wallMm: 2.11 },
      { nps: "4", nbMm: 100, odMm: 114.3, schedule: "10S", wallMm: 3.05 },
      { nps: "4", nbMm: 100, odMm: 114.3, schedule: "40S", wallMm: 6.02 },
      { nps: "4", nbMm: 100, odMm: 114.3, schedule: "XS", wallMm: 8.56 },
      { nps: "5", nbMm: 125, odMm: 141.3, schedule: "5S", wallMm: 2.77 },
      { nps: "5", nbMm: 125, odMm: 141.3, schedule: "10S", wallMm: 3.4 },
      { nps: "5", nbMm: 125, odMm: 141.3, schedule: "40S", wallMm: 6.55 },
      { nps: "5", nbMm: 125, odMm: 141.3, schedule: "XS", wallMm: 9.52 },
      { nps: "6", nbMm: 150, odMm: 168.3, schedule: "5S", wallMm: 2.77 },
      { nps: "6", nbMm: 150, odMm: 168.3, schedule: "10S", wallMm: 3.4 },
      { nps: "6", nbMm: 150, odMm: 168.3, schedule: "40S", wallMm: 7.11 },
      { nps: "6", nbMm: 150, odMm: 168.3, schedule: "XS", wallMm: 10.97 },
      { nps: "8", nbMm: 200, odMm: 219.1, schedule: "5S", wallMm: 2.77 },
      { nps: "8", nbMm: 200, odMm: 219.1, schedule: "10S", wallMm: 3.76 },
      { nps: "8", nbMm: 200, odMm: 219.1, schedule: "30", wallMm: 7.04 },
      { nps: "8", nbMm: 200, odMm: 219.1, schedule: "40S", wallMm: 8.18 },
      { nps: "8", nbMm: 200, odMm: 219.1, schedule: "XS", wallMm: 12.7 },
      { nps: "10", nbMm: 250, odMm: 273.0, schedule: "5S", wallMm: 3.4 },
      { nps: "10", nbMm: 250, odMm: 273.0, schedule: "10S", wallMm: 4.19 },
      { nps: "10", nbMm: 250, odMm: 273.0, schedule: "30", wallMm: 7.8 },
      { nps: "10", nbMm: 250, odMm: 273.0, schedule: "40S", wallMm: 9.27 },
      { nps: "10", nbMm: 250, odMm: 273.0, schedule: "XS", wallMm: 12.7 },
      { nps: "12", nbMm: 300, odMm: 323.85, schedule: "5S", wallMm: 3.96 },
      { nps: "12", nbMm: 300, odMm: 323.85, schedule: "10S", wallMm: 4.57 },
      { nps: "12", nbMm: 300, odMm: 323.85, schedule: "30", wallMm: 8.38 },
      { nps: "12", nbMm: 300, odMm: 323.85, schedule: "40S", wallMm: 9.52 },
      { nps: "12", nbMm: 300, odMm: 323.85, schedule: "XS", wallMm: 12.7 },
      { nps: "14", nbMm: 350, odMm: 355.6, schedule: "5S", wallMm: 3.96 },
      { nps: "14", nbMm: 350, odMm: 355.6, schedule: "10S", wallMm: 4.78 },
      { nps: "14", nbMm: 350, odMm: 355.6, schedule: "30", wallMm: 9.52 },
      { nps: "14", nbMm: 350, odMm: 355.6, schedule: "XS", wallMm: 12.7 },
      { nps: "16", nbMm: 400, odMm: 406.4, schedule: "5S", wallMm: 4.19 },
      { nps: "16", nbMm: 400, odMm: 406.4, schedule: "10S", wallMm: 4.78 },
      { nps: "16", nbMm: 400, odMm: 406.4, schedule: "30", wallMm: 9.52 },
      { nps: "16", nbMm: 400, odMm: 406.4, schedule: "XS", wallMm: 12.7 },
      { nps: "18", nbMm: 450, odMm: 457.2, schedule: "5S", wallMm: 4.19 },
      { nps: "18", nbMm: 450, odMm: 457.2, schedule: "10S", wallMm: 4.78 },
      { nps: "18", nbMm: 450, odMm: 457.2, schedule: "30", wallMm: 11.13 },
      { nps: "18", nbMm: 450, odMm: 457.2, schedule: "XS", wallMm: 12.7 },
      { nps: "20", nbMm: 500, odMm: 508.0, schedule: "5S", wallMm: 4.78 },
      { nps: "20", nbMm: 500, odMm: 508.0, schedule: "10S", wallMm: 5.54 },
      { nps: "20", nbMm: 500, odMm: 508.0, schedule: "30", wallMm: 12.7 },
      { nps: "20", nbMm: 500, odMm: 508.0, schedule: "XS", wallMm: 12.7 },
      { nps: "24", nbMm: 600, odMm: 609.6, schedule: "5S", wallMm: 5.54 },
      { nps: "24", nbMm: 600, odMm: 609.6, schedule: "10S", wallMm: 6.35 },
      { nps: "24", nbMm: 600, odMm: 609.6, schedule: "30", wallMm: 14.27 },
      { nps: "24", nbMm: 600, odMm: 609.6, schedule: "XS", wallMm: 12.7 },
    ];

    let insertedCount = 0;
    let skippedCount = 0;

    for (const row of stainlessData) {
      const existing = await queryRunner.query(`
        SELECT id, standard_code FROM pipe_schedules
        WHERE nps = '${row.nps}' AND schedule = '${row.schedule}'
      `);

      const wallInch = (row.wallMm / 25.4).toFixed(4);
      const odInch = (row.odMm / 25.4).toFixed(4);

      if (existing.length === 0) {
        await queryRunner.query(`
          INSERT INTO pipe_schedules (nps, nb_mm, schedule, wall_thickness_inch, wall_thickness_mm, outside_diameter_inch, outside_diameter_mm, standard_code)
          VALUES ('${row.nps}', ${row.nbMm}, '${row.schedule}', ${wallInch}, ${row.wallMm}, ${odInch}, ${row.odMm}, 'ASME B36.19')
        `);
        insertedCount++;
      } else if (existing[0].standard_code !== "ASME B36.19") {
        await queryRunner.query(`
          UPDATE pipe_schedules
          SET standard_code = 'ASME B36.19',
              wall_thickness_inch = ${wallInch},
              wall_thickness_mm = ${row.wallMm},
              outside_diameter_inch = ${odInch},
              outside_diameter_mm = ${row.odMm}
          WHERE nps = '${row.nps}' AND schedule = '${row.schedule}'
        `);
        insertedCount++;
      } else {
        skippedCount++;
      }
    }

    console.warn(
      `ASTM A312 stainless schedules: ${insertedCount} added/updated, ${skippedCount} already exist`,
    );
  }

  private async populateAnsiB169Data(queryRunner: QueryRunner): Promise<void> {
    console.warn("Populating ANSI B16.9 fitting data...");

    const fittingTypes = [
      {
        code: "ELBOW_90_LR",
        name: "90° Long Radius Elbow",
        description: "Long radius 90° elbow per ANSI B16.9",
      },
      {
        code: "ELBOW_45_LR",
        name: "45° Long Radius Elbow",
        description: "Long radius 45° elbow per ANSI B16.9",
      },
      {
        code: "RETURN_180_LR",
        name: "180° Long Radius Return",
        description: "Long radius 180° return bend per ANSI B16.9",
      },
      {
        code: "TEE_STRAIGHT",
        name: "Straight Tee",
        description: "Equal tee per ANSI B16.9",
      },
      {
        code: "TEE_REDUCING",
        name: "Reducing Tee",
        description: "Reducing tee per ANSI B16.9",
      },
      {
        code: "REDUCER_CON",
        name: "Concentric Reducer",
        description: "Concentric reducer per ANSI B16.9",
      },
      {
        code: "REDUCER_ECC",
        name: "Eccentric Reducer",
        description: "Eccentric reducer per ANSI B16.9",
      },
      { code: "CAP", name: "Cap", description: "Pipe cap per ANSI B16.9" },
    ];

    for (const ft of fittingTypes) {
      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_types (code, name, description)
        VALUES ('${ft.code}', '${ft.name}', '${ft.description}')
        ON CONFLICT (code) DO NOTHING
      `);
    }

    const elbowTypeResult = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'ELBOW_90_LR'`,
    );
    const elbow90Id = elbowTypeResult[0]?.id;

    const elbow45TypeResult = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'ELBOW_45_LR'`,
    );
    const elbow45Id = elbow45TypeResult[0]?.id;

    const return180TypeResult = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'RETURN_180_LR'`,
    );
    const return180Id = return180TypeResult[0]?.id;

    const elbowData90Schedule40 = [
      {
        nps: "3/4",
        nbMm: 20,
        odMm: 26.67,
        wallMm: 2.87,
        aMm: 28.6,
        bMm: 14.3,
        weightLb: 0.1,
      },
      {
        nps: "1",
        nbMm: 25,
        odMm: 33.4,
        wallMm: 3.38,
        aMm: 38.1,
        bMm: 22.2,
        weightLb: 0.2,
      },
      {
        nps: "1-1/4",
        nbMm: 32,
        odMm: 42.16,
        wallMm: 3.56,
        aMm: 47.6,
        bMm: 25.4,
        weightLb: 0.35,
      },
      {
        nps: "1-1/2",
        nbMm: 40,
        odMm: 48.26,
        wallMm: 3.68,
        aMm: 57.3,
        bMm: 28.6,
        weightLb: 0.51,
      },
      {
        nps: "2",
        nbMm: 50,
        odMm: 60.32,
        wallMm: 3.91,
        aMm: 76.2,
        bMm: 34.9,
        weightLb: 0.94,
      },
      {
        nps: "2-1/2",
        nbMm: 65,
        odMm: 73.02,
        wallMm: 5.16,
        aMm: 95.2,
        bMm: 44.4,
        weightLb: 1.79,
      },
      {
        nps: "3",
        nbMm: 80,
        odMm: 88.9,
        wallMm: 5.49,
        aMm: 114.3,
        bMm: 50.8,
        weightLb: 2.87,
      },
      {
        nps: "3-1/2",
        nbMm: 90,
        odMm: 101.6,
        wallMm: 5.74,
        aMm: 133.4,
        bMm: 57.2,
        weightLb: 4.1,
      },
      {
        nps: "4",
        nbMm: 100,
        odMm: 114.3,
        wallMm: 6.02,
        aMm: 152.4,
        bMm: 63.5,
        weightLb: 5.62,
      },
      {
        nps: "5",
        nbMm: 125,
        odMm: 141.3,
        wallMm: 6.55,
        aMm: 190.5,
        bMm: 79.4,
        weightLb: 9.71,
      },
      {
        nps: "6",
        nbMm: 150,
        odMm: 168.3,
        wallMm: 7.11,
        aMm: 228.6,
        bMm: 95.2,
        weightLb: 16.0,
      },
      {
        nps: "8",
        nbMm: 200,
        odMm: 219.1,
        wallMm: 8.18,
        aMm: 304.8,
        bMm: 127,
        weightLb: 32.2,
      },
      {
        nps: "10",
        nbMm: 250,
        odMm: 273.0,
        wallMm: 9.27,
        aMm: 381.0,
        bMm: 158.8,
        weightLb: 50.8,
      },
      {
        nps: "12",
        nbMm: 300,
        odMm: 323.8,
        wallMm: 9.52,
        aMm: 457.2,
        bMm: 190.5,
        weightLb: 73.5,
      },
      {
        nps: "14",
        nbMm: 350,
        odMm: 355.6,
        wallMm: 9.52,
        aMm: 533.4,
        bMm: 222.2,
        weightLb: 94.3,
      },
      {
        nps: "16",
        nbMm: 400,
        odMm: 406.4,
        wallMm: 9.52,
        aMm: 609.6,
        bMm: 254,
        weightLb: 124,
      },
      {
        nps: "18",
        nbMm: 450,
        odMm: 457.2,
        wallMm: 9.52,
        aMm: 685.8,
        bMm: 285.8,
        weightLb: 157,
      },
      {
        nps: "20",
        nbMm: 500,
        odMm: 508.0,
        wallMm: 9.52,
        aMm: 762.0,
        bMm: 317.5,
        weightLb: 194,
      },
      {
        nps: "24",
        nbMm: 600,
        odMm: 609.6,
        wallMm: 9.52,
        aMm: 914.4,
        bMm: 381,
        weightLb: 282,
      },
    ];

    for (const row of elbowData90Schedule40) {
      const weightKg = (row.weightLb * 0.453592).toFixed(3);
      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_face_a_mm, center_to_face_b_mm, weight_kg)
        VALUES
          (${elbow90Id}, '${row.nps}', ${row.nbMm}, ${row.odMm}, 'STD', ${row.wallMm}, ${row.aMm}, NULL, ${weightKg})
        ON CONFLICT DO NOTHING
      `);

      if (elbow45Id) {
        await queryRunner.query(`
          INSERT INTO ansi_b16_9_fitting_dimensions
            (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_face_a_mm, weight_kg)
          VALUES
            (${elbow45Id}, '${row.nps}', ${row.nbMm}, ${row.odMm}, 'STD', ${row.wallMm}, ${row.bMm}, ${(row.weightLb * 0.5 * 0.453592).toFixed(3)})
          ON CONFLICT DO NOTHING
        `);
      }
    }

    const return180Data = [
      {
        nps: "3/4",
        nbMm: 20,
        odMm: 26.67,
        wallMm: 2.87,
        oMm: 57.2,
        kMm: null,
        weightLb: 0.16,
      },
      {
        nps: "1",
        nbMm: 25,
        odMm: 33.4,
        wallMm: 3.38,
        oMm: 76.2,
        kMm: 42.9,
        weightLb: 0.31,
      },
      {
        nps: "1-1/4",
        nbMm: 32,
        odMm: 42.16,
        wallMm: 3.56,
        oMm: 95.2,
        kMm: 55.6,
        weightLb: 0.53,
      },
      {
        nps: "1-1/2",
        nbMm: 40,
        odMm: 48.26,
        wallMm: 3.68,
        oMm: 114.3,
        kMm: 69.8,
        weightLb: 0.76,
      },
      {
        nps: "2",
        nbMm: 50,
        odMm: 60.32,
        wallMm: 3.91,
        oMm: 152.4,
        kMm: 82.6,
        weightLb: 1.36,
      },
      {
        nps: "2-1/2",
        nbMm: 65,
        odMm: 73.02,
        wallMm: 5.16,
        oMm: 190.5,
        kMm: 106.4,
        weightLb: 2.7,
      },
      {
        nps: "3",
        nbMm: 80,
        odMm: 88.9,
        wallMm: 5.49,
        oMm: 228.6,
        kMm: 131.8,
        weightLb: 4.25,
      },
      {
        nps: "3-1/2",
        nbMm: 90,
        odMm: 101.6,
        wallMm: 5.74,
        oMm: 266.7,
        kMm: 158.8,
        weightLb: 5.94,
      },
      {
        nps: "4",
        nbMm: 100,
        odMm: 114.3,
        wallMm: 6.02,
        oMm: 304.8,
        kMm: 184.2,
        weightLb: 8.07,
      },
      {
        nps: "5",
        nbMm: 125,
        odMm: 141.3,
        wallMm: 6.55,
        oMm: 381.0,
        kMm: 209.6,
        weightLb: 13.7,
      },
      {
        nps: "6",
        nbMm: 150,
        odMm: 168.3,
        wallMm: 7.11,
        oMm: 457.2,
        kMm: 261.9,
        weightLb: 21.3,
      },
      {
        nps: "8",
        nbMm: 200,
        odMm: 219.1,
        wallMm: 8.18,
        oMm: 609.6,
        kMm: 312.7,
        weightLb: 42.6,
      },
      {
        nps: "10",
        nbMm: 250,
        odMm: 273.0,
        wallMm: 9.27,
        oMm: 762.0,
        kMm: 414.3,
        weightLb: 75.8,
      },
      {
        nps: "12",
        nbMm: 300,
        odMm: 323.8,
        wallMm: 9.52,
        oMm: 914.4,
        kMm: 517.5,
        weightLb: 112,
      },
      {
        nps: "14",
        nbMm: 350,
        odMm: 355.6,
        wallMm: 9.52,
        oMm: 1067,
        kMm: 619.1,
        weightLb: 143,
      },
      {
        nps: "16",
        nbMm: 400,
        odMm: 406.4,
        wallMm: 9.52,
        oMm: 1219,
        kMm: 711.2,
        weightLb: 188,
      },
      {
        nps: "18",
        nbMm: 450,
        odMm: 457.2,
        wallMm: 9.52,
        oMm: 1372,
        kMm: 812.8,
        weightLb: 239,
      },
      {
        nps: "20",
        nbMm: 500,
        odMm: 508.0,
        wallMm: 9.52,
        oMm: 1524,
        kMm: 914.4,
        weightLb: 293,
      },
      {
        nps: "24",
        nbMm: 600,
        odMm: 609.6,
        wallMm: 9.52,
        oMm: 1829,
        kMm: 1016,
        weightLb: 425,
      },
    ];

    for (const row of return180Data) {
      const weightKg = (row.weightLb * 0.453592).toFixed(3);
      const kVal = row.kMm ? row.kMm : "NULL";
      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_center_o_mm, back_to_face_k_mm, weight_kg)
        VALUES
          (${return180Id}, '${row.nps}', ${row.nbMm}, ${row.odMm}, 'STD', ${row.wallMm}, ${row.oMm}, ${kVal}, ${weightKg})
        ON CONFLICT DO NOTHING
      `);
    }

    console.warn("ANSI B16.9 fitting data populated");
  }

  private async populateForgedFittingData(queryRunner: QueryRunner): Promise<void> {
    console.warn("Populating forged fitting data...");

    const seriesData = [
      {
        pressureClass: 2000,
        connectionType: "SW",
        description: "2000 lb Socket Weld",
      },
      {
        pressureClass: 3000,
        connectionType: "SW",
        description: "3000 lb Socket Weld",
      },
      {
        pressureClass: 3000,
        connectionType: "THD",
        description: "3000 lb Threaded (NPT)",
      },
      {
        pressureClass: 6000,
        connectionType: "SW",
        description: "6000 lb Socket Weld",
      },
      {
        pressureClass: 6000,
        connectionType: "THD",
        description: "6000 lb Threaded (NPT)",
      },
    ];

    for (const s of seriesData) {
      await queryRunner.query(`
        INSERT INTO forged_fitting_series (pressure_class, connection_type, description)
        VALUES (${s.pressureClass}, '${s.connectionType}', '${s.description}')
        ON CONFLICT DO NOTHING
      `);
    }

    const fittingTypes = [
      { code: "TEE", name: "Tee", description: "Forged steel tee" },
      {
        code: "ELBOW_90",
        name: "90° Elbow",
        description: "Forged steel 90° elbow",
      },
      {
        code: "ELBOW_45",
        name: "45° Elbow",
        description: "Forged steel 45° elbow",
      },
      {
        code: "COUPLING",
        name: "Coupling",
        description: "Forged steel full coupling",
      },
      {
        code: "HALF_COUPLING",
        name: "Half Coupling",
        description: "Forged steel half coupling",
      },
      { code: "UNION", name: "Union", description: "Forged steel union" },
      { code: "CAP", name: "Cap", description: "Forged steel cap" },
      {
        code: "PLUG",
        name: "Plug",
        description: "Forged steel hexagonal head plug",
      },
      { code: "CROSS", name: "Cross", description: "Forged steel cross" },
    ];

    for (const ft of fittingTypes) {
      await queryRunner.query(`
        INSERT INTO forged_fitting_types (code, name, description)
        VALUES ('${ft.code}', '${ft.name}', '${ft.description}')
        ON CONFLICT (code) DO NOTHING
      `);
    }

    const series3000SwResult = await queryRunner.query(
      `SELECT id FROM forged_fitting_series WHERE pressure_class = 3000 AND connection_type = 'SW'`,
    );
    const series3000SwId = series3000SwResult[0]?.id;

    const series6000SwResult = await queryRunner.query(
      `SELECT id FROM forged_fitting_series WHERE pressure_class = 6000 AND connection_type = 'SW'`,
    );
    const series6000SwId = series6000SwResult[0]?.id;

    const teeTypeResult = await queryRunner.query(
      `SELECT id FROM forged_fitting_types WHERE code = 'TEE'`,
    );
    const teeTypeId = teeTypeResult[0]?.id;

    const couplingTypeResult = await queryRunner.query(
      `SELECT id FROM forged_fitting_types WHERE code = 'COUPLING'`,
    );
    const couplingTypeId = couplingTypeResult[0]?.id;

    const elbow90TypeResult = await queryRunner.query(
      `SELECT id FROM forged_fitting_types WHERE code = 'ELBOW_90'`,
    );
    const elbow90TypeId = elbow90TypeResult[0]?.id;

    const tee3000Data = [
      { nbMm: 8, aMm: 24.5, bMm: 25.5, massKg: 0.195 },
      { nbMm: 10, aMm: 28.5, bMm: 33.5, massKg: 0.38 },
      { nbMm: 15, aMm: 33.5, bMm: 38.0, massKg: 0.56 },
      { nbMm: 20, aMm: 38.0, bMm: 46.0, massKg: 0.84 },
      { nbMm: 25, aMm: 44.5, bMm: 55.5, massKg: 1.36 },
      { nbMm: 32, aMm: 51.0, bMm: 62.0, massKg: 1.645 },
      { nbMm: 40, aMm: 60.5, bMm: 75.5, massKg: 3.1 },
      { nbMm: 50, aMm: 63.5, bMm: 84.0, massKg: 3.175 },
    ];

    for (const row of tee3000Data) {
      await queryRunner.query(`
        INSERT INTO forged_fitting_dimensions
          (series_id, fitting_type_id, nominal_bore_mm, dimension_a_mm, dimension_b_mm, mass_kg)
        VALUES
          (${series3000SwId}, ${teeTypeId}, ${row.nbMm}, ${row.aMm}, ${row.bMm}, ${row.massKg})
        ON CONFLICT DO NOTHING
      `);
    }

    const coupling3000Data = [
      { nbMm: 8, aMm: 35.0, bMm: 19.0, massKg: 0.045 },
      { nbMm: 10, aMm: 38.0, bMm: 22.0, massKg: 0.059 },
      { nbMm: 15, aMm: 47.5, bMm: 29.0, massKg: 0.127 },
      { nbMm: 20, aMm: 51.0, bMm: 35.0, massKg: 0.191 },
      { nbMm: 25, aMm: 60.5, bMm: 44.5, massKg: 0.386 },
      { nbMm: 32, aMm: 66.5, bMm: 57.0, massKg: 0.68 },
      { nbMm: 40, aMm: 79.5, bMm: 63.5, massKg: 0.993 },
      { nbMm: 50, aMm: 85.5, bMm: 76.0, massKg: 1.37 },
    ];

    for (const row of coupling3000Data) {
      await queryRunner.query(`
        INSERT INTO forged_fitting_dimensions
          (series_id, fitting_type_id, nominal_bore_mm, dimension_a_mm, dimension_b_mm, mass_kg)
        VALUES
          (${series3000SwId}, ${couplingTypeId}, ${row.nbMm}, ${row.aMm}, ${row.bMm}, ${row.massKg})
        ON CONFLICT DO NOTHING
      `);
    }

    const elbow903000Data = [
      { nbMm: 8, aMm: 24.5, bMm: 25.5, dMm: 14.0, eMm: 9.5, massKg: 0.155 },
      { nbMm: 10, aMm: 24.5, bMm: 25.5, dMm: 17.5, eMm: 11.0, massKg: 0.14 },
      { nbMm: 15, aMm: 28.5, bMm: 33.5, dMm: 21.7, eMm: 12.5, massKg: 0.308 },
      { nbMm: 20, aMm: 33.5, bMm: 38.0, dMm: 27.1, eMm: 14.5, massKg: 0.386 },
      { nbMm: 25, aMm: 38.0, bMm: 46.0, dMm: 33.8, eMm: 16.0, massKg: 0.608 },
      { nbMm: 32, aMm: 44.5, bMm: 55.5, dMm: 42.6, eMm: 17.5, massKg: 0.931 },
      { nbMm: 40, aMm: 51.0, bMm: 62.0, dMm: 48.7, eMm: 19.0, massKg: 1.238 },
      { nbMm: 50, aMm: 60.5, bMm: 75.5, dMm: 61.1, eMm: 22.0, massKg: 1.911 },
    ];

    for (const row of elbow903000Data) {
      await queryRunner.query(`
        INSERT INTO forged_fitting_dimensions
          (series_id, fitting_type_id, nominal_bore_mm, dimension_a_mm, dimension_b_mm, dimension_d_mm, dimension_e_mm, mass_kg)
        VALUES
          (${series3000SwId}, ${elbow90TypeId}, ${row.nbMm}, ${row.aMm}, ${row.bMm}, ${row.dMm}, ${row.eMm}, ${row.massKg})
        ON CONFLICT DO NOTHING
      `);
    }

    const ptRatings = [
      { tempC: -29, p2000: 14.0, p3000: 21.0, p4000: 28.0, p6000: 42.0 },
      { tempC: 38, p2000: 14.0, p3000: 21.0, p4000: 28.0, p6000: 42.0 },
      { tempC: 66, p2000: 13.8, p3000: 20.7, p4000: 27.5, p6000: 41.5 },
      { tempC: 93, p2000: 13.6, p3000: 21.0, p4000: 27.2, p6000: 40.7 },
      { tempC: 121, p2000: 13.4, p3000: 20.35, p4000: 26.9, p6000: 40.5 },
      { tempC: 149, p2000: 13.3, p3000: 20.4, p4000: 26.5, p6000: 39.9 },
      { tempC: 177, p2000: 13.1, p3000: 20.05, p4000: 26.2, p6000: 39.4 },
      { tempC: 204, p2000: 13.0, p3000: 19.9, p4000: 25.9, p6000: 38.8 },
      { tempC: 232, p2000: 12.7, p3000: 19.7, p4000: 25.3, p6000: 38.0 },
      { tempC: 260, p2000: 12.2, p3000: 19.4, p4000: 24.3, p6000: 36.5 },
      { tempC: 288, p2000: 11.5, p3000: 19.05, p4000: 23.0, p6000: 34.5 },
      { tempC: 316, p2000: 10.8, p3000: 18.25, p4000: 21.5, p6000: 32.3 },
      { tempC: 343, p2000: 10.0, p3000: 17.2, p4000: 20.5, p6000: 30.5 },
      { tempC: 371, p2000: 9.15, p3000: 16.2, p4000: 18.3, p6000: 27.5 },
      { tempC: 399, p2000: 8.25, p3000: 15.05, p4000: 16.55, p6000: 24.9 },
      { tempC: 427, p2000: 7.1, p3000: 13.7, p4000: 14.2, p6000: 21.3 },
      { tempC: 454, p2000: 5.8, p3000: 10.7, p4000: 11.65, p6000: 17.5 },
      { tempC: 482, p2000: 4.3, p3000: 8.75, p4000: 8.65, p6000: 13.0 },
      { tempC: 510, p2000: 3.0, p3000: 6.5, p4000: 6.0, p6000: 9.0 },
      { tempC: 538, p2000: 1.65, p3000: 4.5, p4000: 3.35, p6000: 5.0 },
    ];

    const seriesIds: Record<number, number> = {};
    for (const pc of [2000, 3000, 4000, 6000]) {
      const result = await queryRunner.query(
        `SELECT id FROM forged_fitting_series WHERE pressure_class = ${pc} AND connection_type = 'SW'`,
      );
      if (result.length > 0) {
        seriesIds[pc] = result[0].id;
      }
    }

    for (const row of ptRatings) {
      if (seriesIds[3000]) {
        await queryRunner.query(`
          INSERT INTO forged_fitting_pt_ratings (series_id, temperature_celsius, pressure_mpa, material_group)
          VALUES (${seriesIds[3000]}, ${row.tempC}, ${row.p3000}, 'Carbon Steel')
          ON CONFLICT DO NOTHING
        `);
      }
      if (seriesIds[6000]) {
        await queryRunner.query(`
          INSERT INTO forged_fitting_pt_ratings (series_id, temperature_celsius, pressure_mpa, material_group)
          VALUES (${seriesIds[6000]}, ${row.tempC}, ${row.p6000}, 'Carbon Steel')
          ON CONFLICT DO NOTHING
        `);
      }
    }

    console.warn("Forged fitting data populated");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn("Reverting Phase 1 migration...");

    await queryRunner.query(`DELETE FROM pipe_schedules WHERE standard_code = 'ASME B36.19'`);

    await queryRunner.query("DROP TABLE IF EXISTS forged_fitting_pt_ratings");
    await queryRunner.query("DROP TABLE IF EXISTS forged_fitting_dimensions");
    await queryRunner.query("DROP TABLE IF EXISTS forged_fitting_types");
    await queryRunner.query("DROP TABLE IF EXISTS forged_fitting_series");

    await queryRunner.query("DROP TABLE IF EXISTS ansi_b16_9_fitting_dimensions");
    await queryRunner.query("DROP TABLE IF EXISTS ansi_b16_9_fitting_types");

    console.warn("Phase 1 migration reverted");
  }
}
