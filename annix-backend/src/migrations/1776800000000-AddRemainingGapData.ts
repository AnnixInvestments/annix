import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRemainingGapData1776800000000 implements MigrationInterface {
  name = 'AddRemainingGapData1776800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn('Adding remaining gap data from MPS manual...');

    await this.createAbrasionResistanceTable(queryRunner);
    await this.populateAbrasionResistanceData(queryRunner);
    await this.populateAnsiB169Caps(queryRunner);
    await this.populateAnsiB169Reducers(queryRunner);
    await this.populateRemainingForgedFittingPtRatings(queryRunner);

    console.warn('Remaining gap data migration complete.');
  }

  private async createAbrasionResistanceTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn('Creating abrasion resistance table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS abrasion_resistance (
        id SERIAL PRIMARY KEY,
        material VARCHAR(50) NOT NULL,
        test_condition VARCHAR(100) NOT NULL,
        sand_concentration_pct INT NOT NULL,
        velocity_m_s DECIMAL(5,2),
        pressure_mpa DECIMAL(6,2),
        temperature_c VARCHAR(20),
        time_to_rupture_hours INT,
        wall_thickness_mm DECIMAL(5,2),
        pipe_specification VARCHAR(100),
        notes VARCHAR(255),
        UNIQUE(material, test_condition, sand_concentration_pct)
      )
    `);
  }

  private async populateAbrasionResistanceData(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn(
      'Populating abrasion resistance data from MPS manual page 141...',
    );

    const abrasionData = [
      {
        material: 'Steel',
        condition: 'Sand/water mixture',
        sandPct: 7,
        velocity: 7,
        pressure: 140,
        temp: '30-35',
        rupture: 2000,
        wall: 6.0,
        spec: 'Steel pipe 6mm wall',
        notes: 'Reference: Hoechst',
      },
      {
        material: 'Steel',
        condition: 'Sand/water mixture',
        sandPct: 14,
        velocity: 7,
        pressure: 140,
        temp: '30-35',
        rupture: 1000,
        wall: 6.0,
        spec: 'Steel pipe 6mm wall',
        notes: 'Reference: Hoechst',
      },
      {
        material: 'HDPE',
        condition: 'Sand/water mixture',
        sandPct: 7,
        velocity: 7,
        pressure: 140,
        temp: '30-35',
        rupture: 14000,
        wall: null,
        spec: 'HDPE pipe 63 OD x 10 bar',
        notes: 'Reference: Hoechst',
      },
      {
        material: 'HDPE',
        condition: 'Sand/water mixture',
        sandPct: 14,
        velocity: 7,
        pressure: 140,
        temp: '30-35',
        rupture: 8000,
        wall: null,
        spec: 'HDPE pipe 63 OD x 10 bar',
        notes: 'Reference: Hoechst',
      },
    ];

    for (const d of abrasionData) {
      const wallVal = d.wall ? d.wall : 'NULL';
      await queryRunner.query(`
        INSERT INTO abrasion_resistance (material, test_condition, sand_concentration_pct, velocity_m_s, pressure_mpa, temperature_c, time_to_rupture_hours, wall_thickness_mm, pipe_specification, notes)
        VALUES ('${d.material}', '${d.condition}', ${d.sandPct}, ${d.velocity}, ${d.pressure}, '${d.temp}', ${d.rupture}, ${wallVal}, '${d.spec}', '${d.notes}')
        ON CONFLICT (material, test_condition, sand_concentration_pct) DO NOTHING
      `);
    }

    console.warn('Abrasion resistance data populated.');
  }

  private async populateAnsiB169Caps(queryRunner: QueryRunner): Promise<void> {
    console.warn('Populating ANSI B16.9 welding caps data...');

    const capTypeResult = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'CAP'`,
    );
    const capTypeId = capTypeResult[0]?.id;

    if (!capTypeId) {
      console.warn('CAP fitting type not found, skipping caps data');
      return;
    }

    const capsDataStd = [
      {
        nps: '1/2',
        nbMm: 15,
        odMm: 21.3,
        wallMm: 2.8,
        eMm: 31.75,
        weightLb: 0.032,
      },
      {
        nps: '3/4',
        nbMm: 20,
        odMm: 26.7,
        wallMm: 2.9,
        eMm: 31.75,
        weightLb: 0.059,
      },
      {
        nps: '1',
        nbMm: 25,
        odMm: 33.4,
        wallMm: 3.4,
        eMm: 38.1,
        weightLb: 0.0998,
      },
      {
        nps: '1-1/4',
        nbMm: 32,
        odMm: 42.2,
        wallMm: 3.6,
        eMm: 38.1,
        weightLb: 0.141,
      },
      {
        nps: '1-1/2',
        nbMm: 40,
        odMm: 48.3,
        wallMm: 3.7,
        eMm: 38.1,
        weightLb: 0.168,
      },
      {
        nps: '2',
        nbMm: 50,
        odMm: 60.3,
        wallMm: 3.9,
        eMm: 38.1,
        weightLb: 0.231,
      },
      {
        nps: '2-1/2',
        nbMm: 65,
        odMm: 73.0,
        wallMm: 5.2,
        eMm: 38.1,
        weightLb: 0.367,
      },
      {
        nps: '3',
        nbMm: 80,
        odMm: 88.9,
        wallMm: 5.5,
        eMm: 50.8,
        weightLb: 0.644,
      },
      {
        nps: '3-1/2',
        nbMm: 90,
        odMm: 101.6,
        wallMm: 5.7,
        eMm: 63.5,
        weightLb: 0.971,
      },
      {
        nps: '4',
        nbMm: 100,
        odMm: 114.3,
        wallMm: 6.0,
        eMm: 63.5,
        weightLb: 1.15,
      },
      {
        nps: '5',
        nbMm: 125,
        odMm: 141.3,
        wallMm: 6.6,
        eMm: 76.2,
        weightLb: 1.9,
      },
      {
        nps: '6',
        nbMm: 150,
        odMm: 168.3,
        wallMm: 7.1,
        eMm: 88.9,
        weightLb: 2.92,
      },
      {
        nps: '8',
        nbMm: 200,
        odMm: 219.1,
        wallMm: 8.2,
        eMm: 101.6,
        weightLb: 5.08,
      },
      {
        nps: '10',
        nbMm: 250,
        odMm: 273.0,
        wallMm: 9.3,
        eMm: 127.0,
        weightLb: 9.07,
      },
      {
        nps: '12',
        nbMm: 300,
        odMm: 323.9,
        wallMm: 9.5,
        eMm: 152.4,
        weightLb: 13.38,
      },
      {
        nps: '14',
        nbMm: 350,
        odMm: 355.6,
        wallMm: 9.5,
        eMm: 165.1,
        weightLb: 16.06,
      },
      {
        nps: '16',
        nbMm: 400,
        odMm: 406.4,
        wallMm: 9.5,
        eMm: 177.8,
        weightLb: 20.32,
      },
      {
        nps: '18',
        nbMm: 450,
        odMm: 457.2,
        wallMm: 9.5,
        eMm: 203.2,
        weightLb: 25.9,
      },
      {
        nps: '20',
        nbMm: 500,
        odMm: 508.0,
        wallMm: 9.5,
        eMm: 228.6,
        weightLb: 32.21,
      },
      {
        nps: '24',
        nbMm: 600,
        odMm: 609.6,
        wallMm: 9.5,
        eMm: 266.7,
        weightLb: 46.27,
      },
    ];

    const capsDataXs = [
      {
        nps: '1/2',
        nbMm: 15,
        odMm: 21.3,
        wallMm: 3.7,
        eMm: 31.75,
        weightLb: 0.045,
      },
      {
        nps: '3/4',
        nbMm: 20,
        odMm: 26.7,
        wallMm: 3.9,
        eMm: 31.75,
        weightLb: 0.086,
      },
      {
        nps: '1',
        nbMm: 25,
        odMm: 33.4,
        wallMm: 4.5,
        eMm: 38.1,
        weightLb: 0.127,
      },
      {
        nps: '1-1/4',
        nbMm: 32,
        odMm: 42.2,
        wallMm: 4.9,
        eMm: 38.1,
        weightLb: 0.181,
      },
      {
        nps: '1-1/2',
        nbMm: 40,
        odMm: 48.3,
        wallMm: 5.1,
        eMm: 38.1,
        weightLb: 0.222,
      },
      {
        nps: '2',
        nbMm: 50,
        odMm: 60.3,
        wallMm: 5.5,
        eMm: 38.1,
        weightLb: 0.313,
      },
      {
        nps: '2-1/2',
        nbMm: 65,
        odMm: 73.0,
        wallMm: 7.0,
        eMm: 38.1,
        weightLb: 0.467,
      },
      {
        nps: '3',
        nbMm: 80,
        odMm: 88.9,
        wallMm: 7.6,
        eMm: 50.8,
        weightLb: 0.853,
      },
      {
        nps: '3-1/2',
        nbMm: 90,
        odMm: 101.6,
        wallMm: 8.1,
        eMm: 63.5,
        weightLb: 1.31,
      },
      {
        nps: '4',
        nbMm: 100,
        odMm: 114.3,
        wallMm: 8.6,
        eMm: 63.5,
        weightLb: 1.57,
      },
      {
        nps: '5',
        nbMm: 125,
        odMm: 141.3,
        wallMm: 9.5,
        eMm: 76.2,
        weightLb: 2.65,
      },
      {
        nps: '6',
        nbMm: 150,
        odMm: 168.3,
        wallMm: 11.0,
        eMm: 88.9,
        weightLb: 4.28,
      },
      {
        nps: '8',
        nbMm: 200,
        odMm: 219.1,
        wallMm: 12.7,
        eMm: 101.6,
        weightLb: 7.58,
      },
      {
        nps: '10',
        nbMm: 250,
        odMm: 273.0,
        wallMm: 12.7,
        eMm: 127.0,
        weightLb: 12.0,
      },
      {
        nps: '12',
        nbMm: 300,
        odMm: 323.9,
        wallMm: 12.7,
        eMm: 152.4,
        weightLb: 17.2,
      },
      {
        nps: '14',
        nbMm: 350,
        odMm: 355.6,
        wallMm: 12.7,
        eMm: 165.1,
        weightLb: 20.5,
      },
      {
        nps: '16',
        nbMm: 400,
        odMm: 406.4,
        wallMm: 12.7,
        eMm: 177.8,
        weightLb: 26.2,
      },
      {
        nps: '18',
        nbMm: 450,
        odMm: 457.2,
        wallMm: 12.7,
        eMm: 203.2,
        weightLb: 33.6,
      },
      {
        nps: '20',
        nbMm: 500,
        odMm: 508.0,
        wallMm: 12.7,
        eMm: 228.6,
        weightLb: 42.6,
      },
      {
        nps: '24',
        nbMm: 600,
        odMm: 609.6,
        wallMm: 12.7,
        eMm: 266.7,
        weightLb: 59.4,
      },
    ];

    for (const row of capsDataStd) {
      const weightKg = (row.weightLb * 0.453592).toFixed(3);
      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_end_c_mm, weight_kg)
        VALUES
          (${capTypeId}, '${row.nps}', ${row.nbMm}, ${row.odMm}, 'STD', ${row.wallMm}, ${row.eMm}, ${weightKg})
        ON CONFLICT DO NOTHING
      `);
    }

    for (const row of capsDataXs) {
      const weightKg = (row.weightLb * 0.453592).toFixed(3);
      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, center_to_end_c_mm, weight_kg)
        VALUES
          (${capTypeId}, '${row.nps}', ${row.nbMm}, ${row.odMm}, 'XS', ${row.wallMm}, ${row.eMm}, ${weightKg})
        ON CONFLICT DO NOTHING
      `);
    }

    console.warn('ANSI B16.9 caps data populated.');
  }

  private async populateAnsiB169Reducers(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn('Populating ANSI B16.9 reducers data...');

    const conReducerResult = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'REDUCER_CON'`,
    );
    const conReducerId = conReducerResult[0]?.id;

    const eccReducerResult = await queryRunner.query(
      `SELECT id FROM ansi_b16_9_fitting_types WHERE code = 'REDUCER_ECC'`,
    );
    const eccReducerId = eccReducerResult[0]?.id;

    if (!conReducerId || !eccReducerId) {
      console.warn('Reducer fitting types not found, skipping reducers data');
      return;
    }

    const reducerData = [
      {
        largeNps: '3/4',
        largeNbMm: 20,
        largeOdMm: 26.67,
        smallNps: '1/2',
        smallOdMm: 21.34,
        hMm: 50.8,
        stdWeightLb: 0.09,
        xsWeightLb: 0.14,
      },
      {
        largeNps: '1',
        largeNbMm: 25,
        largeOdMm: 33.4,
        smallNps: '3/4',
        smallOdMm: 26.67,
        hMm: 50.8,
        stdWeightLb: 0.14,
        xsWeightLb: 0.2,
      },
      {
        largeNps: '1',
        largeNbMm: 25,
        largeOdMm: 33.4,
        smallNps: '1/2',
        smallOdMm: 21.34,
        hMm: 50.8,
        stdWeightLb: 0.14,
        xsWeightLb: 0.2,
      },
      {
        largeNps: '1-1/4',
        largeNbMm: 32,
        largeOdMm: 42.16,
        smallNps: '1',
        smallOdMm: 33.4,
        hMm: 50.8,
        stdWeightLb: 0.2,
        xsWeightLb: 0.27,
      },
      {
        largeNps: '1-1/4',
        largeNbMm: 32,
        largeOdMm: 42.16,
        smallNps: '3/4',
        smallOdMm: 26.67,
        hMm: 50.8,
        stdWeightLb: 0.2,
        xsWeightLb: 0.27,
      },
      {
        largeNps: '1-1/2',
        largeNbMm: 40,
        largeOdMm: 48.26,
        smallNps: '1-1/4',
        smallOdMm: 42.16,
        hMm: 63.5,
        stdWeightLb: 0.27,
        xsWeightLb: 0.36,
      },
      {
        largeNps: '1-1/2',
        largeNbMm: 40,
        largeOdMm: 48.26,
        smallNps: '1',
        smallOdMm: 33.4,
        hMm: 63.5,
        stdWeightLb: 0.27,
        xsWeightLb: 0.36,
      },
      {
        largeNps: '2',
        largeNbMm: 50,
        largeOdMm: 60.32,
        smallNps: '1-1/2',
        smallOdMm: 48.26,
        hMm: 76.2,
        stdWeightLb: 0.45,
        xsWeightLb: 0.64,
      },
      {
        largeNps: '2',
        largeNbMm: 50,
        largeOdMm: 60.32,
        smallNps: '1-1/4',
        smallOdMm: 42.16,
        hMm: 76.2,
        stdWeightLb: 0.45,
        xsWeightLb: 0.64,
      },
      {
        largeNps: '2',
        largeNbMm: 50,
        largeOdMm: 60.32,
        smallNps: '1',
        smallOdMm: 33.4,
        hMm: 76.2,
        stdWeightLb: 0.45,
        xsWeightLb: 0.64,
      },
      {
        largeNps: '2-1/2',
        largeNbMm: 65,
        largeOdMm: 73.02,
        smallNps: '2',
        smallOdMm: 60.32,
        hMm: 88.9,
        stdWeightLb: 0.68,
        xsWeightLb: 0.91,
      },
      {
        largeNps: '2-1/2',
        largeNbMm: 65,
        largeOdMm: 73.02,
        smallNps: '1-1/2',
        smallOdMm: 48.26,
        hMm: 88.9,
        stdWeightLb: 0.68,
        xsWeightLb: 0.91,
      },
      {
        largeNps: '3',
        largeNbMm: 80,
        largeOdMm: 88.9,
        smallNps: '2-1/2',
        smallOdMm: 73.02,
        hMm: 88.9,
        stdWeightLb: 0.91,
        xsWeightLb: 1.27,
      },
      {
        largeNps: '3',
        largeNbMm: 80,
        largeOdMm: 88.9,
        smallNps: '2',
        smallOdMm: 60.32,
        hMm: 88.9,
        stdWeightLb: 0.91,
        xsWeightLb: 1.27,
      },
      {
        largeNps: '3',
        largeNbMm: 80,
        largeOdMm: 88.9,
        smallNps: '1-1/2',
        smallOdMm: 48.26,
        hMm: 88.9,
        stdWeightLb: 0.91,
        xsWeightLb: 1.27,
      },
      {
        largeNps: '4',
        largeNbMm: 100,
        largeOdMm: 114.3,
        smallNps: '3',
        smallOdMm: 88.9,
        hMm: 101.6,
        stdWeightLb: 1.36,
        xsWeightLb: 1.89,
      },
      {
        largeNps: '4',
        largeNbMm: 100,
        largeOdMm: 114.3,
        smallNps: '2-1/2',
        smallOdMm: 73.02,
        hMm: 101.6,
        stdWeightLb: 1.36,
        xsWeightLb: 1.89,
      },
      {
        largeNps: '4',
        largeNbMm: 100,
        largeOdMm: 114.3,
        smallNps: '2',
        smallOdMm: 60.32,
        hMm: 101.6,
        stdWeightLb: 1.36,
        xsWeightLb: 1.89,
      },
      {
        largeNps: '5',
        largeNbMm: 125,
        largeOdMm: 141.3,
        smallNps: '4',
        smallOdMm: 114.3,
        hMm: 127.0,
        stdWeightLb: 2.77,
        xsWeightLb: 3.92,
      },
      {
        largeNps: '5',
        largeNbMm: 125,
        largeOdMm: 141.3,
        smallNps: '3',
        smallOdMm: 88.9,
        hMm: 127.0,
        stdWeightLb: 2.77,
        xsWeightLb: 3.92,
      },
      {
        largeNps: '6',
        largeNbMm: 150,
        largeOdMm: 168.3,
        smallNps: '5',
        smallOdMm: 141.3,
        hMm: 139.7,
        stdWeightLb: 3.95,
        xsWeightLb: 5.94,
      },
      {
        largeNps: '6',
        largeNbMm: 150,
        largeOdMm: 168.3,
        smallNps: '4',
        smallOdMm: 114.3,
        hMm: 139.7,
        stdWeightLb: 3.95,
        xsWeightLb: 5.94,
      },
      {
        largeNps: '6',
        largeNbMm: 150,
        largeOdMm: 168.3,
        smallNps: '3',
        smallOdMm: 88.9,
        hMm: 139.7,
        stdWeightLb: 3.95,
        xsWeightLb: 5.94,
      },
      {
        largeNps: '8',
        largeNbMm: 200,
        largeOdMm: 219.1,
        smallNps: '6',
        smallOdMm: 168.3,
        hMm: 152.4,
        stdWeightLb: 7.26,
        xsWeightLb: 11.3,
      },
      {
        largeNps: '8',
        largeNbMm: 200,
        largeOdMm: 219.1,
        smallNps: '5',
        smallOdMm: 141.3,
        hMm: 152.4,
        stdWeightLb: 7.26,
        xsWeightLb: 11.3,
      },
      {
        largeNps: '8',
        largeNbMm: 200,
        largeOdMm: 219.1,
        smallNps: '4',
        smallOdMm: 114.3,
        hMm: 152.4,
        stdWeightLb: 7.26,
        xsWeightLb: 11.3,
      },
      {
        largeNps: '10',
        largeNbMm: 250,
        largeOdMm: 273.0,
        smallNps: '8',
        smallOdMm: 219.1,
        hMm: 177.8,
        stdWeightLb: 12.2,
        xsWeightLb: 18.1,
      },
      {
        largeNps: '10',
        largeNbMm: 250,
        largeOdMm: 273.0,
        smallNps: '6',
        smallOdMm: 168.3,
        hMm: 177.8,
        stdWeightLb: 12.2,
        xsWeightLb: 18.1,
      },
      {
        largeNps: '12',
        largeNbMm: 300,
        largeOdMm: 323.85,
        smallNps: '10',
        smallOdMm: 273.0,
        hMm: 203.2,
        stdWeightLb: 19.1,
        xsWeightLb: 27.2,
      },
      {
        largeNps: '12',
        largeNbMm: 300,
        largeOdMm: 323.85,
        smallNps: '8',
        smallOdMm: 219.1,
        hMm: 203.2,
        stdWeightLb: 19.1,
        xsWeightLb: 27.2,
      },
      {
        largeNps: '14',
        largeNbMm: 350,
        largeOdMm: 355.6,
        smallNps: '12',
        smallOdMm: 323.85,
        hMm: 330.2,
        stdWeightLb: 27.2,
        xsWeightLb: 36.3,
      },
      {
        largeNps: '14',
        largeNbMm: 350,
        largeOdMm: 355.6,
        smallNps: '10',
        smallOdMm: 273.0,
        hMm: 330.2,
        stdWeightLb: 27.2,
        xsWeightLb: 36.3,
      },
      {
        largeNps: '16',
        largeNbMm: 400,
        largeOdMm: 406.4,
        smallNps: '14',
        smallOdMm: 355.6,
        hMm: 355.6,
        stdWeightLb: 36.3,
        xsWeightLb: 47.6,
      },
      {
        largeNps: '16',
        largeNbMm: 400,
        largeOdMm: 406.4,
        smallNps: '12',
        smallOdMm: 323.85,
        hMm: 355.6,
        stdWeightLb: 36.3,
        xsWeightLb: 47.6,
      },
      {
        largeNps: '18',
        largeNbMm: 450,
        largeOdMm: 457.2,
        smallNps: '16',
        smallOdMm: 406.4,
        hMm: 381.0,
        stdWeightLb: 47.6,
        xsWeightLb: 68.0,
      },
      {
        largeNps: '18',
        largeNbMm: 450,
        largeOdMm: 457.2,
        smallNps: '14',
        smallOdMm: 355.6,
        hMm: 381.0,
        stdWeightLb: 47.6,
        xsWeightLb: 68.0,
      },
      {
        largeNps: '20',
        largeNbMm: 500,
        largeOdMm: 508.0,
        smallNps: '18',
        smallOdMm: 457.2,
        hMm: 508.0,
        stdWeightLb: 68.0,
        xsWeightLb: 90.7,
      },
      {
        largeNps: '20',
        largeNbMm: 500,
        largeOdMm: 508.0,
        smallNps: '16',
        smallOdMm: 406.4,
        hMm: 508.0,
        stdWeightLb: 68.0,
        xsWeightLb: 90.7,
      },
      {
        largeNps: '24',
        largeNbMm: 600,
        largeOdMm: 609.6,
        smallNps: '20',
        smallOdMm: 508.0,
        hMm: 609.6,
        stdWeightLb: 90.7,
        xsWeightLb: 127,
      },
      {
        largeNps: '24',
        largeNbMm: 600,
        largeOdMm: 609.6,
        smallNps: '18',
        smallOdMm: 457.2,
        hMm: 609.6,
        stdWeightLb: 90.7,
        xsWeightLb: 127,
      },
    ];

    for (const row of reducerData) {
      const stdWeightKg = (row.stdWeightLb * 0.453592).toFixed(3);
      const xsWeightKg = (row.xsWeightLb * 0.453592).toFixed(3);

      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, branch_nps, branch_od_mm, center_to_end_c_mm, weight_kg)
        VALUES
          (${conReducerId}, '${row.largeNps}', ${row.largeNbMm}, ${row.largeOdMm}, 'STD', 0, '${row.smallNps}', ${row.smallOdMm}, ${row.hMm}, ${stdWeightKg})
        ON CONFLICT DO NOTHING
      `);

      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, branch_nps, branch_od_mm, center_to_end_c_mm, weight_kg)
        VALUES
          (${conReducerId}, '${row.largeNps}', ${row.largeNbMm}, ${row.largeOdMm}, 'XS', 0, '${row.smallNps}', ${row.smallOdMm}, ${row.hMm}, ${xsWeightKg})
        ON CONFLICT DO NOTHING
      `);

      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, branch_nps, branch_od_mm, center_to_end_c_mm, weight_kg)
        VALUES
          (${eccReducerId}, '${row.largeNps}', ${row.largeNbMm}, ${row.largeOdMm}, 'STD', 0, '${row.smallNps}', ${row.smallOdMm}, ${row.hMm}, ${stdWeightKg})
        ON CONFLICT DO NOTHING
      `);

      await queryRunner.query(`
        INSERT INTO ansi_b16_9_fitting_dimensions
          (fitting_type_id, nps, nb_mm, outside_diameter_mm, schedule, wall_thickness_mm, branch_nps, branch_od_mm, center_to_end_c_mm, weight_kg)
        VALUES
          (${eccReducerId}, '${row.largeNps}', ${row.largeNbMm}, ${row.largeOdMm}, 'XS', 0, '${row.smallNps}', ${row.smallOdMm}, ${row.hMm}, ${xsWeightKg})
        ON CONFLICT DO NOTHING
      `);
    }

    console.warn('ANSI B16.9 reducers data populated.');
  }

  private async populateRemainingForgedFittingPtRatings(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn(
      'Populating remaining forged fitting P-T ratings for 2000 and 4000 series...',
    );

    let series2000SwId: number | null = null;
    let series4000SwId: number | null = null;

    const series2000Result = await queryRunner.query(
      `SELECT id FROM forged_fitting_series WHERE pressure_class = 2000 AND connection_type = 'SW'`,
    );
    if (series2000Result.length > 0) {
      series2000SwId = series2000Result[0].id;
    } else {
      const insertResult = await queryRunner.query(`
        INSERT INTO forged_fitting_series (pressure_class, connection_type, description)
        VALUES (2000, 'SW', '2000 lb Socket Weld')
        ON CONFLICT DO NOTHING
        RETURNING id
      `);
      if (insertResult.length > 0) {
        series2000SwId = insertResult[0].id;
      }
    }

    const series4000Result = await queryRunner.query(
      `SELECT id FROM forged_fitting_series WHERE pressure_class = 4000 AND connection_type = 'SW'`,
    );
    if (series4000Result.length > 0) {
      series4000SwId = series4000Result[0].id;
    } else {
      const insertResult = await queryRunner.query(`
        INSERT INTO forged_fitting_series (pressure_class, connection_type, description)
        VALUES (4000, 'SW', '4000 lb Socket Weld')
        ON CONFLICT DO NOTHING
        RETURNING id
      `);
      if (insertResult.length > 0) {
        series4000SwId = insertResult[0].id;
      }
    }

    const ptRatings = [
      { tempC: -29, p2000: 14.0, p4000: 28.0 },
      { tempC: 38, p2000: 14.0, p4000: 28.0 },
      { tempC: 66, p2000: 13.8, p4000: 27.5 },
      { tempC: 93, p2000: 13.6, p4000: 27.2 },
      { tempC: 121, p2000: 13.4, p4000: 26.9 },
      { tempC: 149, p2000: 13.3, p4000: 26.5 },
      { tempC: 177, p2000: 13.1, p4000: 26.2 },
      { tempC: 204, p2000: 13.0, p4000: 25.9 },
      { tempC: 232, p2000: 12.7, p4000: 25.3 },
      { tempC: 260, p2000: 12.2, p4000: 24.3 },
      { tempC: 288, p2000: 11.5, p4000: 23.0 },
      { tempC: 316, p2000: 10.8, p4000: 21.5 },
      { tempC: 343, p2000: 10.0, p4000: 20.5 },
      { tempC: 371, p2000: 9.15, p4000: 18.3 },
      { tempC: 399, p2000: 8.25, p4000: 16.55 },
      { tempC: 427, p2000: 7.1, p4000: 14.2 },
      { tempC: 454, p2000: 5.8, p4000: 11.65 },
      { tempC: 482, p2000: 4.3, p4000: 8.65 },
      { tempC: 510, p2000: 3.0, p4000: 6.0 },
      { tempC: 538, p2000: 1.65, p4000: 3.35 },
    ];

    for (const row of ptRatings) {
      if (series2000SwId) {
        await queryRunner.query(`
          INSERT INTO forged_fitting_pt_ratings (series_id, temperature_celsius, pressure_mpa, material_group)
          VALUES (${series2000SwId}, ${row.tempC}, ${row.p2000}, 'Carbon Steel')
          ON CONFLICT DO NOTHING
        `);
      }

      if (series4000SwId) {
        await queryRunner.query(`
          INSERT INTO forged_fitting_pt_ratings (series_id, temperature_celsius, pressure_mpa, material_group)
          VALUES (${series4000SwId}, ${row.tempC}, ${row.p4000}, 'Carbon Steel')
          ON CONFLICT DO NOTHING
        `);
      }
    }

    console.warn(
      'Forged fitting P-T ratings for 2000 and 4000 series populated.',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS abrasion_resistance`);
  }
}
