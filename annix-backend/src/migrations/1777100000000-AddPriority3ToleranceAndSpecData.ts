import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriority3ToleranceAndSpecData1777100000000 implements MigrationInterface {
  name = 'AddPriority3ToleranceAndSpecData1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      'Adding Priority 3 tolerance and specification data from MPS manual...',
    );

    await this.createApiPipeToleranceTable(queryRunner);
    await this.populateApiPipeTolerances(queryRunner);
    await this.createPipeEndPreparationTable(queryRunner);
    await this.populatePipeEndPreparations(queryRunner);
    await this.createPipeSpecificationCrossRefTable(queryRunner);
    await this.populatePipeSpecificationCrossRef(queryRunner);

    console.warn(
      'Priority 3 tolerance and specification data migration complete.',
    );
  }

  private async createApiPipeToleranceTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn('Creating API pipe tolerance table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS api_pipe_tolerances (
        id SERIAL PRIMARY KEY,
        specification VARCHAR(20) NOT NULL,
        nominal_bore_min_mm INT,
        nominal_bore_max_mm INT,
        od_tolerance VARCHAR(30) NOT NULL,
        wall_thickness_tolerance_plus VARCHAR(20) NOT NULL,
        wall_thickness_tolerance_minus VARCHAR(20) NOT NULL,
        mass_tolerance_std VARCHAR(20),
        mass_tolerance_special VARCHAR(20),
        single_random_min_length_m DECIMAL(6,2),
        double_random_min_length_m DECIMAL(6,2),
        notes VARCHAR(255),
        UNIQUE(specification, nominal_bore_min_mm, nominal_bore_max_mm)
      )
    `);
  }

  private async populateApiPipeTolerances(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn(
      'Populating API 5L/5LX pipe tolerances from MPS manual page 18...',
    );

    const toleranceData = [
      {
        spec: 'API 5L/5LX',
        nbMin: 0,
        nbMax: 40,
        odTol: '+0.40mm',
        wtPlus: '+20%',
        wtMinus: '-12.5%',
        massStd: '+10% / -3.5%',
        massSpec: '+10% / -5%',
        singleMin: 5.4,
        doubleMin: 11.55,
        notes: 'Seamless and welded',
      },
      {
        spec: 'API 5L/5LX',
        nbMin: 41,
        nbMax: 65,
        odTol: '±0.79mm',
        wtPlus: '+20%',
        wtMinus: '-12.5%',
        massStd: '+10% / -3.5%',
        massSpec: '+10% / -5%',
        singleMin: 5.4,
        doubleMin: 11.55,
        notes: 'Seamless and welded',
      },
      {
        spec: 'API 5L/5LX',
        nbMin: 80,
        nbMax: 80,
        odTol: '±1%',
        wtPlus: '+18%',
        wtMinus: '-12.5%',
        massStd: '+10% / -3.5%',
        massSpec: '+10% / -5%',
        singleMin: 5.4,
        doubleMin: 11.55,
        notes: 'Seamless',
      },
      {
        spec: 'API 5L/5LX',
        nbMin: 100,
        nbMax: 999,
        odTol: '±1%',
        wtPlus: '+15%',
        wtMinus: '-12.5%',
        massStd: '+10% / -3.5%',
        massSpec: '+10% / -5%',
        singleMin: 5.4,
        doubleMin: 11.55,
        notes: 'Seamless, 100mm and larger',
      },
      {
        spec: 'API 5L/5LX',
        nbMin: 100,
        nbMax: 450,
        odTol: '±1%',
        wtPlus: '+15%',
        wtMinus: '-12.5%',
        massStd: '+10% / -3.5%',
        massSpec: '+10% / -5%',
        singleMin: 5.4,
        doubleMin: 11.55,
        notes: 'Welded',
      },
      {
        spec: 'API 5L/5LX',
        nbMin: 451,
        nbMax: 999,
        odTol: '±1%',
        wtPlus: '+15%',
        wtMinus: '-10.0%',
        massStd: '+10% / -3.5%',
        massSpec: '+10% / -5%',
        singleMin: 5.4,
        doubleMin: 11.55,
        notes: 'Welded, over 450mm',
      },
    ];

    for (const t of toleranceData) {
      const notesVal = t.notes ? `'${t.notes}'` : 'NULL';
      await queryRunner.query(`
        INSERT INTO api_pipe_tolerances
          (specification, nominal_bore_min_mm, nominal_bore_max_mm, od_tolerance,
           wall_thickness_tolerance_plus, wall_thickness_tolerance_minus,
           mass_tolerance_std, mass_tolerance_special, single_random_min_length_m,
           double_random_min_length_m, notes)
        VALUES
          ('${t.spec}', ${t.nbMin}, ${t.nbMax}, '${t.odTol}', '${t.wtPlus}', '${t.wtMinus}',
           '${t.massStd}', '${t.massSpec}', ${t.singleMin}, ${t.doubleMin}, ${notesVal})
        ON CONFLICT (specification, nominal_bore_min_mm, nominal_bore_max_mm) DO NOTHING
      `);
    }

    console.warn('API pipe tolerances populated.');
  }

  private async createPipeEndPreparationTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn('Creating pipe end preparation table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pipe_end_preparations (
        id SERIAL PRIMARY KEY,
        standard VARCHAR(30) NOT NULL,
        wall_thickness_min_mm DECIMAL(6,2),
        wall_thickness_max_mm DECIMAL(6,2),
        bevel_angle_deg VARCHAR(20) NOT NULL,
        bevel_tolerance_deg VARCHAR(20),
        root_face_mm VARCHAR(20),
        root_face_tolerance_mm VARCHAR(20),
        land_thickness_mm DECIMAL(6,2),
        radius_min_mm DECIMAL(6,2),
        notes VARCHAR(255),
        UNIQUE(standard, wall_thickness_min_mm, wall_thickness_max_mm)
      )
    `);
  }

  private async populatePipeEndPreparations(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn(
      'Populating pipe end preparation standards from MPS manual page 18...',
    );

    const bevelData = [
      {
        std: 'ASA B37.5',
        wtMin: 4.8,
        wtMax: 22.2,
        angle: '37.5°',
        angleTol: '±2.5°',
        rootFace: '1.6mm',
        rootFaceTol: '±0.8mm',
        land: null,
        radius: null,
        notes: 'Standard bevel for wall thickness 4.8-22.2mm',
      },
      {
        std: 'ASA B37.5',
        wtMin: 22.2,
        wtMax: 999,
        angle: '10°',
        angleTol: '±1°',
        rootFace: '1.6mm',
        rootFaceTol: '±0.8mm',
        land: null,
        radius: 3.2,
        notes: 'Compound bevel with 37.5° secondary angle for wall >22.2mm',
      },
      {
        std: 'API 5L',
        wtMin: 0,
        wtMax: 999,
        angle: '30°',
        angleTol: '±5°',
        rootFace: '1.6mm',
        rootFaceTol: '±0.8mm',
        land: null,
        radius: null,
        notes:
          'Standard API bevel for all wall thicknesses unless otherwise specified',
      },
    ];

    for (const b of bevelData) {
      const landVal = b.land ? b.land : 'NULL';
      const radiusVal = b.radius ? b.radius : 'NULL';
      const notesVal = b.notes ? `'${b.notes}'` : 'NULL';
      await queryRunner.query(`
        INSERT INTO pipe_end_preparations
          (standard, wall_thickness_min_mm, wall_thickness_max_mm, bevel_angle_deg,
           bevel_tolerance_deg, root_face_mm, root_face_tolerance_mm, land_thickness_mm,
           radius_min_mm, notes)
        VALUES
          ('${b.std}', ${b.wtMin}, ${b.wtMax}, '${b.angle}', '${b.angleTol}', '${b.rootFace}',
           '${b.rootFaceTol}', ${landVal}, ${radiusVal}, ${notesVal})
        ON CONFLICT (standard, wall_thickness_min_mm, wall_thickness_max_mm) DO NOTHING
      `);
    }

    console.warn('Pipe end preparations populated.');
  }

  private async createPipeSpecificationCrossRefTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn('Creating pipe specification cross-reference table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pipe_specification_cross_refs (
        id SERIAL PRIMARY KEY,
        astm_standard VARCHAR(30) NOT NULL,
        bs_standard VARCHAR(30),
        din_standard VARCHAR(30),
        werkstoff_number VARCHAR(20),
        description VARCHAR(100),
        UNIQUE(astm_standard)
      )
    `);
  }

  private async populatePipeSpecificationCrossRef(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn(
      'Populating pipe specification cross-references from MPS manual page 18...',
    );

    const crossRefData = [
      {
        astm: 'A120',
        bs: '1387',
        din: '1629 St 00',
        werk: null,
        desc: 'Black and galvanized welded pipe',
      },
      {
        astm: 'A53 Gr A',
        bs: '3601/23',
        din: '1629 M St35',
        werk: '1.0350',
        desc: 'Seamless and welded carbon steel pipe',
      },
      {
        astm: 'A53 Gr B',
        bs: '3601/27',
        din: '1629 M St45',
        werk: '1.0350',
        desc: 'Seamless and welded carbon steel pipe',
      },
      {
        astm: 'A106 Gr A',
        bs: '3602/23',
        din: '17175 M St35.8',
        werk: null,
        desc: 'Seamless carbon steel pipe for high-temp service',
      },
      {
        astm: 'A106 Gr B',
        bs: '3602/27',
        din: '17175 M St45.8',
        werk: '1.5639',
        desc: 'Seamless carbon steel pipe for high-temp service',
      },
      {
        astm: 'A106 Gr C',
        bs: '3602/35',
        din: '17175 17 Mn4',
        werk: '1.5423',
        desc: 'Seamless carbon steel pipe for high-temp service',
      },
      {
        astm: 'A333 Gr 1',
        bs: '3603/L T50',
        din: 'TT St35N',
        werk: '1.7335',
        desc: 'Seamless and welded for low-temp service',
      },
      {
        astm: 'A333 Gr 3',
        bs: '3603/503L T 100',
        din: '17175 16 Ni 14',
        werk: '1.7350',
        desc: '3.5% Nickel steel for low-temp service',
      },
      {
        astm: 'A335 Gr P1',
        bs: '3604/240',
        din: '17175 16 Mo5',
        werk: '1.7380',
        desc: '0.5% Mo alloy pipe',
      },
      {
        astm: 'A335 Gr P12',
        bs: '3604/620',
        din: '17175 13 CrMo44',
        werk: '1.7362',
        desc: '1% Cr 0.5% Mo alloy pipe',
      },
      {
        astm: 'A335 Gr P11',
        bs: '3604/621',
        din: '17175 22 CrMo44',
        werk: '1.7368',
        desc: '1.25% Cr 0.5% Mo alloy pipe',
      },
      {
        astm: 'A335 Gr P22',
        bs: '3604/622',
        din: '17175 10 CrMo910',
        werk: '1.7386',
        desc: '2.25% Cr 1% Mo alloy pipe',
      },
      {
        astm: 'A335 Gr P5',
        bs: '3604/625',
        din: '17175 12 CrMo 195',
        werk: null,
        desc: '5% Cr 0.5% Mo alloy pipe',
      },
      {
        astm: 'A335 Gr P7',
        bs: '3604/627',
        din: '17175 x 12 CrMo7',
        werk: null,
        desc: '7% Cr 0.5% Mo alloy pipe',
      },
      {
        astm: 'A335 Gr P9',
        bs: '3604/629',
        din: '17175 x 12 CrMo91',
        werk: null,
        desc: '9% Cr 1% Mo alloy pipe',
      },
    ];

    for (const c of crossRefData) {
      const bsVal = c.bs ? `'${c.bs}'` : 'NULL';
      const dinVal = c.din ? `'${c.din}'` : 'NULL';
      const werkVal = c.werk ? `'${c.werk}'` : 'NULL';
      const descVal = c.desc ? `'${c.desc}'` : 'NULL';
      await queryRunner.query(`
        INSERT INTO pipe_specification_cross_refs
          (astm_standard, bs_standard, din_standard, werkstoff_number, description)
        VALUES
          ('${c.astm}', ${bsVal}, ${dinVal}, ${werkVal}, ${descVal})
        ON CONFLICT (astm_standard) DO NOTHING
      `);
    }

    console.warn('Pipe specification cross-references populated.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Reverting Priority 3 tolerance and specification data...');

    await queryRunner.query(
      `DROP TABLE IF EXISTS pipe_specification_cross_refs`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS pipe_end_preparations`);
    await queryRunner.query(`DROP TABLE IF EXISTS api_pipe_tolerances`);

    console.warn('Priority 3 tolerance and specification data reverted.');
  }
}
