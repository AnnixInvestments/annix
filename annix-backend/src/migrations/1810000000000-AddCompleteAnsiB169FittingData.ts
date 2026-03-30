import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompleteAnsiB169FittingData1810000000000 implements MigrationInterface {
  name = "AddCompleteAnsiB169FittingData1810000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addElbow90SrType(queryRunner);
    await this.addMissing12InchElbowData(queryRunner);
    await this.addSrElbowData(queryRunner);
    await this.addExtendedTeeData(queryRunner);
    await this.addConcentricReducerData(queryRunner);
    await this.addEccentricReducerData(queryRunner);
    await this.addCapData(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM ansi_b16_9_fitting_dimensions
      WHERE fitting_type_id IN (
        SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'ELBOW_90_SR'
      )
    `);

    await queryRunner.query(`
      DELETE FROM ansi_b16_9_fitting_types WHERE code = 'ELBOW_90_SR'
    `);

    await queryRunner.query(`
      DELETE FROM ansi_b16_9_fitting_dimensions
      WHERE nps = '1/2' AND fitting_type_id IN (
        SELECT id FROM ansi_b16_9_fitting_types WHERE code IN ('ELBOW_90_LR', 'ELBOW_45_LR')
      )
    `);

    await queryRunner.query(`
      DELETE FROM ansi_b16_9_fitting_dimensions
      WHERE fitting_type_id IN (
        SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'TEE_STRAIGHT'
      )
      AND nps IN ('5', '6', '8', '10', '12', '14', '16', '18', '20', '24')
    `);

    await queryRunner.query(`
      DELETE FROM ansi_b16_9_fitting_dimensions
      WHERE fitting_type_id IN (
        SELECT id FROM ansi_b16_9_fitting_types WHERE code IN ('REDUCER_CON', 'REDUCER_ECC')
      )
    `);

    await queryRunner.query(`
      DELETE FROM ansi_b16_9_fitting_dimensions
      WHERE fitting_type_id IN (
        SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'CAP'
      )
    `);
  }

  private async addElbow90SrType(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO ansi_b16_9_fitting_types (code, name, description)
      VALUES ('ELBOW_90_SR', 'Short Radius 90° Elbow', 'Short radius 90° elbow per ANSI B16.9')
      ON CONFLICT DO NOTHING
    `);
  }

  private async addMissing12InchElbowData(queryRunner: QueryRunner): Promise<void> {
    const elbow90Result = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'ELBOW_90_LR'`,
    );
    const elbow90Id = elbow90Result[0]?.id;

    const elbow45Result = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'ELBOW_45_LR'`,
    );
    const elbow45Id = elbow45Result[0]?.id;

    if (elbow90Id) {
      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_face_a_mm, weight_kg)
        VALUES
          (${elbow90Id}, '1/2', 15, 21.3, 'STD', 2.77, 38.1, 0.18)
        ON CONFLICT DO NOTHING
      `);

      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_face_a_mm, weight_kg)
        VALUES
          (${elbow90Id}, '1/2', 15, 21.3, 'XS', 3.73, 38.1, 0.24)
        ON CONFLICT DO NOTHING
      `);
    }

    if (elbow45Id) {
      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_face_a_mm, weight_kg)
        VALUES
          (${elbow45Id}, '1/2', 15, 21.3, 'STD', 2.77, 15.9, 0.09)
        ON CONFLICT DO NOTHING
      `);

      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_face_a_mm, weight_kg)
        VALUES
          (${elbow45Id}, '1/2', 15, 21.3, 'XS', 3.73, 15.9, 0.12)
        ON CONFLICT DO NOTHING
      `);
    }
  }

  private async addSrElbowData(queryRunner: QueryRunner): Promise<void> {
    const srResult = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'ELBOW_90_SR'`,
    );
    const srId = srResult[0]?.id;

    if (!srId) {
      return;
    }

    const stdData = [
      { nps: "1/2", nbMm: 15, odMm: 21.3, wallMm: 2.77, aMm: 25.4, weightKg: 0.12 },
      { nps: "3/4", nbMm: 20, odMm: 26.67, wallMm: 2.87, aMm: 25.4, weightKg: 0.16 },
      { nps: "1", nbMm: 25, odMm: 33.4, wallMm: 3.38, aMm: 25.4, weightKg: 0.24 },
      { nps: "1-1/4", nbMm: 32, odMm: 42.16, wallMm: 3.56, aMm: 38.1, weightKg: 0.42 },
      { nps: "1-1/2", nbMm: 40, odMm: 48.26, wallMm: 3.68, aMm: 38.1, weightKg: 0.57 },
      { nps: "2", nbMm: 50, odMm: 60.32, wallMm: 3.91, aMm: 50.8, weightKg: 0.91 },
      { nps: "2-1/2", nbMm: 65, odMm: 73.02, wallMm: 5.16, aMm: 63.5, weightKg: 1.59 },
      { nps: "3", nbMm: 80, odMm: 88.9, wallMm: 5.49, aMm: 76.2, weightKg: 2.39 },
      { nps: "3-1/2", nbMm: 90, odMm: 101.6, wallMm: 5.74, aMm: 88.9, weightKg: 3.4 },
      { nps: "4", nbMm: 100, odMm: 114.3, wallMm: 6.02, aMm: 101.6, weightKg: 4.6 },
      { nps: "5", nbMm: 125, odMm: 141.3, wallMm: 6.55, aMm: 127.0, weightKg: 7.94 },
      { nps: "6", nbMm: 150, odMm: 168.3, wallMm: 7.11, aMm: 152.4, weightKg: 13.15 },
      { nps: "8", nbMm: 200, odMm: 219.1, wallMm: 8.18, aMm: 203.2, weightKg: 26.31 },
      { nps: "10", nbMm: 250, odMm: 273.0, wallMm: 9.27, aMm: 254.0, weightKg: 41.5 },
      { nps: "12", nbMm: 300, odMm: 323.8, wallMm: 9.52, aMm: 304.8, weightKg: 60.33 },
      { nps: "14", nbMm: 350, odMm: 355.6, wallMm: 9.52, aMm: 355.6, weightKg: 77.11 },
      { nps: "16", nbMm: 400, odMm: 406.4, wallMm: 9.52, aMm: 406.4, weightKg: 101.6 },
      { nps: "18", nbMm: 450, odMm: 457.2, wallMm: 9.52, aMm: 457.2, weightKg: 128.37 },
      { nps: "20", nbMm: 500, odMm: 508.0, wallMm: 9.52, aMm: 508.0, weightKg: 158.76 },
      { nps: "24", nbMm: 600, odMm: 609.6, wallMm: 9.52, aMm: 609.6, weightKg: 230.87 },
    ];

    const xsWallAndWeight = [
      { nps: "1/2", wallMm: 3.73, weightKg: 0.16 },
      { nps: "3/4", wallMm: 3.91, weightKg: 0.22 },
      { nps: "1", wallMm: 4.55, weightKg: 0.34 },
      { nps: "1-1/4", wallMm: 4.85, weightKg: 0.57 },
      { nps: "1-1/2", wallMm: 5.08, weightKg: 0.77 },
      { nps: "2", wallMm: 5.54, weightKg: 1.27 },
      { nps: "2-1/2", wallMm: 7.01, weightKg: 2.22 },
      { nps: "3", wallMm: 7.62, weightKg: 3.4 },
      { nps: "3-1/2", wallMm: 8.08, weightKg: 4.76 },
      { nps: "4", wallMm: 8.56, weightKg: 6.44 },
      { nps: "5", wallMm: 9.52, weightKg: 11.11 },
      { nps: "6", wallMm: 10.97, weightKg: 18.37 },
      { nps: "8", wallMm: 12.7, weightKg: 36.74 },
      { nps: "10", wallMm: 12.7, weightKg: 57.61 },
      { nps: "12", wallMm: 12.7, weightKg: 83.46 },
      { nps: "14", wallMm: 12.7, weightKg: 107.05 },
      { nps: "16", wallMm: 12.7, weightKg: 141.06 },
      { nps: "18", wallMm: 12.7, weightKg: 178.4 },
      { nps: "20", wallMm: 12.7, weightKg: 220.45 },
      { nps: "24", wallMm: 12.7, weightKg: 320.44 },
    ];

    const stdValues = stdData
      .map(
        (r) =>
          `(${srId}, '${r.nps}', ${r.nbMm}, ${r.odMm}, 'STD', ${r.wallMm}, ${r.aMm}, ${r.weightKg})`,
      )
      .join(",\n      ");

    await queryRunner.query(`
      INSERT INTO ansi_b16_9_fitting_dimensions
        (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_face_a_mm, weight_kg)
      VALUES
        ${stdValues}
      ON CONFLICT DO NOTHING
    `);

    const xsValues = stdData
      .map((std) => {
        const xs = xsWallAndWeight.find((x) => x.nps === std.nps);
        return `(${srId}, '${std.nps}', ${std.nbMm}, ${std.odMm}, 'XS', ${xs?.wallMm}, ${std.aMm}, ${xs?.weightKg})`;
      })
      .join(",\n      ");

    await queryRunner.query(`
      INSERT INTO ansi_b16_9_fitting_dimensions
        (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_face_a_mm, weight_kg)
      VALUES
        ${xsValues}
      ON CONFLICT DO NOTHING
    `);
  }

  private async addExtendedTeeData(queryRunner: QueryRunner): Promise<void> {
    const straightTeeResult = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'TEE_STRAIGHT'`,
    );
    const straightTeeId = straightTeeResult[0]?.id;

    if (!straightTeeId) {
      return;
    }

    const stdData = [
      { nps: "5", nbMm: 125, odMm: 141.3, wallMm: 6.55, cmMm: 133, weightKg: 5.44 },
      { nps: "6", nbMm: 150, odMm: 168.3, wallMm: 7.11, cmMm: 143, weightKg: 8.16 },
      { nps: "8", nbMm: 200, odMm: 219.1, wallMm: 8.18, cmMm: 178, weightKg: 17.24 },
      { nps: "10", nbMm: 250, odMm: 273.0, wallMm: 9.27, cmMm: 216, weightKg: 31.75 },
      { nps: "12", nbMm: 300, odMm: 323.8, wallMm: 9.52, cmMm: 254, weightKg: 45.36 },
      { nps: "14", nbMm: 350, odMm: 355.6, wallMm: 9.52, cmMm: 279, weightKg: 56.7 },
      { nps: "16", nbMm: 400, odMm: 406.4, wallMm: 9.52, cmMm: 305, weightKg: 72.58 },
      { nps: "18", nbMm: 450, odMm: 457.2, wallMm: 9.52, cmMm: 343, weightKg: 99.79 },
      { nps: "20", nbMm: 500, odMm: 508.0, wallMm: 9.52, cmMm: 381, weightKg: 124.74 },
      { nps: "24", nbMm: 600, odMm: 609.6, wallMm: 9.52, cmMm: 432, weightKg: 181.44 },
    ];

    const xsWallAndWeight = [
      { nps: "5", wallMm: 9.52, weightKg: 7.71 },
      { nps: "6", wallMm: 10.97, weightKg: 12.7 },
      { nps: "8", wallMm: 12.7, weightKg: 25.4 },
      { nps: "10", wallMm: 12.7, weightKg: 42.18 },
      { nps: "12", wallMm: 12.7, weightKg: 58.97 },
      { nps: "14", wallMm: 12.7, weightKg: 72.12 },
      { nps: "16", wallMm: 12.7, weightKg: 90.72 },
      { nps: "18", wallMm: 12.7, weightKg: 117.93 },
      { nps: "20", wallMm: 12.7, weightKg: 149.69 },
      { nps: "24", wallMm: 12.7, weightKg: 217.72 },
    ];

    const stdValues = stdData
      .map(
        (r) =>
          `(${straightTeeId}, '${r.nps}', ${r.nbMm}, ${r.odMm}, 'STD', ${r.wallMm}, '${r.nps}', ${r.odMm}, ${r.cmMm}, ${r.cmMm}, ${r.weightKg})`,
      )
      .join(",\n      ");

    await queryRunner.query(`
      INSERT INTO ansi_b16_9_fitting_dimensions
        (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, branch_nps, branch_od_mm, center_to_end_c_mm, center_to_end_m_mm, weight_kg)
      VALUES
        ${stdValues}
      ON CONFLICT DO NOTHING
    `);

    const xsValues = stdData
      .map((std) => {
        const xs = xsWallAndWeight.find((x) => x.nps === std.nps);
        return `(${straightTeeId}, '${std.nps}', ${std.nbMm}, ${std.odMm}, 'XS', ${xs?.wallMm}, '${std.nps}', ${std.odMm}, ${std.cmMm}, ${std.cmMm}, ${xs?.weightKg})`;
      })
      .join(",\n      ");

    await queryRunner.query(`
      INSERT INTO ansi_b16_9_fitting_dimensions
        (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, branch_nps, branch_od_mm, center_to_end_c_mm, center_to_end_m_mm, weight_kg)
      VALUES
        ${xsValues}
      ON CONFLICT DO NOTHING
    `);
  }

  private async insertReducerData(queryRunner: QueryRunner, fittingTypeId: number): Promise<void> {
    const stdData = [
      {
        nps: "1",
        branchNps: "1/2",
        odMm: 33.4,
        branchOdMm: 21.3,
        wallMm: 3.38,
        hMm: 51,
        weightKg: 0.11,
      },
      {
        nps: "1",
        branchNps: "3/4",
        odMm: 33.4,
        branchOdMm: 26.7,
        wallMm: 3.38,
        hMm: 51,
        weightKg: 0.13,
      },
      {
        nps: "1-1/2",
        branchNps: "1",
        odMm: 48.26,
        branchOdMm: 33.4,
        wallMm: 3.68,
        hMm: 64,
        weightKg: 0.26,
      },
      {
        nps: "1-1/2",
        branchNps: "1/2",
        odMm: 48.26,
        branchOdMm: 21.3,
        wallMm: 3.68,
        hMm: 64,
        weightKg: 0.22,
      },
      {
        nps: "2",
        branchNps: "1",
        odMm: 60.32,
        branchOdMm: 33.4,
        wallMm: 3.91,
        hMm: 76,
        weightKg: 0.37,
      },
      {
        nps: "2",
        branchNps: "1-1/2",
        odMm: 60.32,
        branchOdMm: 48.26,
        wallMm: 3.91,
        hMm: 76,
        weightKg: 0.45,
      },
      {
        nps: "3",
        branchNps: "2",
        odMm: 88.9,
        branchOdMm: 60.32,
        wallMm: 5.49,
        hMm: 89,
        weightKg: 0.95,
      },
      {
        nps: "3",
        branchNps: "1-1/2",
        odMm: 88.9,
        branchOdMm: 48.26,
        wallMm: 5.49,
        hMm: 89,
        weightKg: 0.82,
      },
      {
        nps: "4",
        branchNps: "2",
        odMm: 114.3,
        branchOdMm: 60.32,
        wallMm: 6.02,
        hMm: 102,
        weightKg: 1.5,
      },
      {
        nps: "4",
        branchNps: "3",
        odMm: 114.3,
        branchOdMm: 88.9,
        wallMm: 6.02,
        hMm: 102,
        weightKg: 1.81,
      },
      {
        nps: "6",
        branchNps: "4",
        odMm: 168.3,
        branchOdMm: 114.3,
        wallMm: 7.11,
        hMm: 140,
        weightKg: 4.31,
      },
      {
        nps: "6",
        branchNps: "3",
        odMm: 168.3,
        branchOdMm: 88.9,
        wallMm: 7.11,
        hMm: 140,
        weightKg: 3.63,
      },
      {
        nps: "8",
        branchNps: "6",
        odMm: 219.1,
        branchOdMm: 168.3,
        wallMm: 8.18,
        hMm: 152,
        weightKg: 8.16,
      },
      {
        nps: "8",
        branchNps: "4",
        odMm: 219.1,
        branchOdMm: 114.3,
        wallMm: 8.18,
        hMm: 152,
        weightKg: 6.35,
      },
      {
        nps: "10",
        branchNps: "8",
        odMm: 273.0,
        branchOdMm: 219.1,
        wallMm: 9.27,
        hMm: 178,
        weightKg: 14.51,
      },
      {
        nps: "10",
        branchNps: "6",
        odMm: 273.0,
        branchOdMm: 168.3,
        wallMm: 9.27,
        hMm: 178,
        weightKg: 11.79,
      },
      {
        nps: "12",
        branchNps: "10",
        odMm: 323.8,
        branchOdMm: 273.0,
        wallMm: 9.52,
        hMm: 203,
        weightKg: 20.41,
      },
      {
        nps: "12",
        branchNps: "8",
        odMm: 323.8,
        branchOdMm: 219.1,
        wallMm: 9.52,
        hMm: 203,
        weightKg: 17.24,
      },
      {
        nps: "14",
        branchNps: "12",
        odMm: 355.6,
        branchOdMm: 323.8,
        wallMm: 9.52,
        hMm: 330,
        weightKg: 31.3,
      },
      {
        nps: "14",
        branchNps: "10",
        odMm: 355.6,
        branchOdMm: 273.0,
        wallMm: 9.52,
        hMm: 330,
        weightKg: 27.22,
      },
      {
        nps: "16",
        branchNps: "14",
        odMm: 406.4,
        branchOdMm: 355.6,
        wallMm: 9.52,
        hMm: 356,
        weightKg: 38.1,
      },
      {
        nps: "16",
        branchNps: "12",
        odMm: 406.4,
        branchOdMm: 323.8,
        wallMm: 9.52,
        hMm: 356,
        weightKg: 35.38,
      },
      {
        nps: "18",
        branchNps: "16",
        odMm: 457.2,
        branchOdMm: 406.4,
        wallMm: 9.52,
        hMm: 381,
        weightKg: 46.27,
      },
      {
        nps: "18",
        branchNps: "14",
        odMm: 457.2,
        branchOdMm: 355.6,
        wallMm: 9.52,
        hMm: 381,
        weightKg: 42.18,
      },
      {
        nps: "20",
        branchNps: "18",
        odMm: 508.0,
        branchOdMm: 457.2,
        wallMm: 9.52,
        hMm: 508,
        weightKg: 68.04,
      },
      {
        nps: "20",
        branchNps: "16",
        odMm: 508.0,
        branchOdMm: 406.4,
        wallMm: 9.52,
        hMm: 508,
        weightKg: 63.5,
      },
      {
        nps: "24",
        branchNps: "20",
        odMm: 609.6,
        branchOdMm: 508.0,
        wallMm: 9.52,
        hMm: 610,
        weightKg: 108.86,
      },
      {
        nps: "24",
        branchNps: "18",
        odMm: 609.6,
        branchOdMm: 457.2,
        wallMm: 9.52,
        hMm: 610,
        weightKg: 99.79,
      },
    ];

    const npsToNbMm: Record<string, number> = {
      "1/2": 15,
      "3/4": 20,
      "1": 25,
      "1-1/4": 32,
      "1-1/2": 40,
      "2": 50,
      "2-1/2": 65,
      "3": 80,
      "3-1/2": 90,
      "4": 100,
      "5": 125,
      "6": 150,
      "8": 200,
      "10": 250,
      "12": 300,
      "14": 350,
      "16": 400,
      "18": 450,
      "20": 500,
      "24": 600,
    };

    const stdValues = stdData
      .map(
        (r) =>
          `(${fittingTypeId}, '${r.nps}', ${npsToNbMm[r.nps]}, ${r.odMm}, 'STD', ${r.wallMm}, '${r.branchNps}', ${r.branchOdMm}, ${r.hMm}, ${r.weightKg})`,
      )
      .join(",\n      ");

    await queryRunner.query(`
      INSERT INTO ansi_b16_9_fitting_dimensions
        (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, branch_nps, branch_od_mm, center_to_face_a_mm, weight_kg)
      VALUES
        ${stdValues}
      ON CONFLICT DO NOTHING
    `);
  }

  private async addConcentricReducerData(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'REDUCER_CON'`,
    );
    const fittingTypeId = result[0]?.id;

    if (!fittingTypeId) {
      return;
    }

    await this.insertReducerData(queryRunner, fittingTypeId);
  }

  private async addEccentricReducerData(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'REDUCER_ECC'`,
    );
    const fittingTypeId = result[0]?.id;

    if (!fittingTypeId) {
      return;
    }

    await this.insertReducerData(queryRunner, fittingTypeId);
  }

  private async addCapData(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'CAP'`,
    );
    const capId = result[0]?.id;

    if (!capId) {
      return;
    }

    const stdData = [
      { nps: "1/2", nbMm: 15, odMm: 21.3, wallMm: 2.77, eMm: 25.4, weightKg: 0.05 },
      { nps: "3/4", nbMm: 20, odMm: 26.67, wallMm: 2.87, eMm: 25.4, weightKg: 0.07 },
      { nps: "1", nbMm: 25, odMm: 33.4, wallMm: 3.38, eMm: 25.4, weightKg: 0.09 },
      { nps: "1-1/4", nbMm: 32, odMm: 42.16, wallMm: 3.56, eMm: 25.4, weightKg: 0.14 },
      { nps: "1-1/2", nbMm: 40, odMm: 48.26, wallMm: 3.68, eMm: 25.4, weightKg: 0.18 },
      { nps: "2", nbMm: 50, odMm: 60.32, wallMm: 3.91, eMm: 50.8, weightKg: 0.32 },
      { nps: "2-1/2", nbMm: 65, odMm: 73.02, wallMm: 5.16, eMm: 50.8, weightKg: 0.5 },
      { nps: "3", nbMm: 80, odMm: 88.9, wallMm: 5.49, eMm: 50.8, weightKg: 0.73 },
      { nps: "3-1/2", nbMm: 90, odMm: 101.6, wallMm: 5.74, eMm: 63.5, weightKg: 1.0 },
      { nps: "4", nbMm: 100, odMm: 114.3, wallMm: 6.02, eMm: 63.5, weightKg: 1.27 },
      { nps: "5", nbMm: 125, odMm: 141.3, wallMm: 6.55, eMm: 76.2, weightKg: 1.95 },
      { nps: "6", nbMm: 150, odMm: 168.3, wallMm: 7.11, eMm: 76.2, weightKg: 2.72 },
      { nps: "8", nbMm: 200, odMm: 219.1, wallMm: 8.18, eMm: 101.6, weightKg: 5.44 },
      { nps: "10", nbMm: 250, odMm: 273.0, wallMm: 9.27, eMm: 127.0, weightKg: 9.98 },
      { nps: "12", nbMm: 300, odMm: 323.8, wallMm: 9.52, eMm: 152.4, weightKg: 14.97 },
      { nps: "14", nbMm: 350, odMm: 355.6, wallMm: 9.52, eMm: 152.4, weightKg: 17.69 },
      { nps: "16", nbMm: 400, odMm: 406.4, wallMm: 9.52, eMm: 152.4, weightKg: 20.41 },
      { nps: "18", nbMm: 450, odMm: 457.2, wallMm: 9.52, eMm: 152.4, weightKg: 22.68 },
      { nps: "20", nbMm: 500, odMm: 508.0, wallMm: 9.52, eMm: 152.4, weightKg: 25.4 },
      { nps: "24", nbMm: 600, odMm: 609.6, wallMm: 9.52, eMm: 152.4, weightKg: 31.75 },
    ];

    const xsWallAndWeight = [
      { nps: "1/2", wallMm: 3.73, weightKg: 0.07 },
      { nps: "3/4", wallMm: 3.91, weightKg: 0.09 },
      { nps: "1", wallMm: 4.55, weightKg: 0.14 },
      { nps: "1-1/4", wallMm: 4.85, weightKg: 0.2 },
      { nps: "1-1/2", wallMm: 5.08, weightKg: 0.27 },
      { nps: "2", wallMm: 5.54, weightKg: 0.45 },
      { nps: "2-1/2", wallMm: 7.01, weightKg: 0.73 },
      { nps: "3", wallMm: 7.62, weightKg: 1.09 },
      { nps: "3-1/2", wallMm: 8.08, weightKg: 1.5 },
      { nps: "4", wallMm: 8.56, weightKg: 1.86 },
      { nps: "5", wallMm: 9.52, weightKg: 2.95 },
      { nps: "6", wallMm: 10.97, weightKg: 4.31 },
      { nps: "8", wallMm: 12.7, weightKg: 8.16 },
      { nps: "10", wallMm: 12.7, weightKg: 13.61 },
      { nps: "12", wallMm: 12.7, weightKg: 19.5 },
      { nps: "14", wallMm: 12.7, weightKg: 22.68 },
      { nps: "16", wallMm: 12.7, weightKg: 26.31 },
      { nps: "18", wallMm: 12.7, weightKg: 29.48 },
      { nps: "20", wallMm: 12.7, weightKg: 33.11 },
      { nps: "24", wallMm: 12.7, weightKg: 40.82 },
    ];

    const stdValues = stdData
      .map(
        (r) =>
          `(${capId}, '${r.nps}', ${r.nbMm}, ${r.odMm}, 'STD', ${r.wallMm}, ${r.eMm}, ${r.weightKg})`,
      )
      .join(",\n      ");

    await queryRunner.query(`
      INSERT INTO ansi_b16_9_fitting_dimensions
        (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_face_a_mm, weight_kg)
      VALUES
        ${stdValues}
      ON CONFLICT DO NOTHING
    `);

    const xsValues = stdData
      .map((std) => {
        const xs = xsWallAndWeight.find((x) => x.nps === std.nps);
        return `(${capId}, '${std.nps}', ${std.nbMm}, ${std.odMm}, 'XS', ${xs?.wallMm}, ${std.eMm}, ${xs?.weightKg})`;
      })
      .join(",\n      ");

    await queryRunner.query(`
      INSERT INTO ansi_b16_9_fitting_dimensions
        (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_face_a_mm, weight_kg)
      VALUES
        ${xsValues}
      ON CONFLICT DO NOTHING
    `);
  }
}
