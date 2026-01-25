import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriority4To7VerificationAndFlowData1777200000000 implements MigrationInterface {
  name = 'AddPriority4To7VerificationAndFlowData1777200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      'Adding Priority 4-7 verification and flow data from MPS manual...',
    );

    await this.createDataVerificationTable(queryRunner);
    await this.verifyFlangeData(queryRunner);
    await this.createFlowFormulaParametersTable(queryRunner);
    await this.populateFlowFormulaParameters(queryRunner);
    await this.addPipeRoughnessFactors(queryRunner);
    await this.verifySizeRangeCoverage(queryRunner);

    console.warn('Priority 4-7 verification and flow data migration complete.');
  }

  private async createDataVerificationTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn('Creating data verification log table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS data_verification_logs (
        id SERIAL PRIMARY KEY,
        verification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        category VARCHAR(50) NOT NULL,
        standard VARCHAR(50) NOT NULL,
        check_type VARCHAR(50) NOT NULL,
        expected_count INT,
        actual_count INT,
        status VARCHAR(20) NOT NULL,
        details TEXT,
        reference_source VARCHAR(100)
      )
    `);
  }

  private async verifyFlangeData(queryRunner: QueryRunner): Promise<void> {
    console.warn('Verifying flange data against MPS manual...');

    const verificationChecks = [
      {
        category: 'Flanges',
        standard: 'BS 4504',
        checkType: 'PN6 Coverage',
        expectedMin: 15,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%BS4504%' AND code LIKE '%PN6%')",
      },
      {
        category: 'Flanges',
        standard: 'BS 4504',
        checkType: 'PN10 Coverage',
        expectedMin: 15,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%BS4504%' AND code LIKE '%PN10%')",
      },
      {
        category: 'Flanges',
        standard: 'BS 4504',
        checkType: 'PN16 Coverage',
        expectedMin: 15,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%BS4504%' AND code LIKE '%PN16%')",
      },
      {
        category: 'Flanges',
        standard: 'BS 4504',
        checkType: 'PN25 Coverage',
        expectedMin: 15,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%BS4504%' AND code LIKE '%PN25%')",
      },
      {
        category: 'Flanges',
        standard: 'BS 4504',
        checkType: 'PN40 Coverage',
        expectedMin: 15,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%BS4504%' AND code LIKE '%PN40%')",
      },
      {
        category: 'Flanges',
        standard: 'SABS 1123',
        checkType: 'T1000 Coverage',
        expectedMin: 15,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%SABS1123%' AND code LIKE '%1000%')",
      },
      {
        category: 'Flanges',
        standard: 'SABS 1123',
        checkType: 'T1600 Coverage',
        expectedMin: 15,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%SABS1123%' AND code LIKE '%1600%')",
      },
      {
        category: 'Flanges',
        standard: 'SABS 1123',
        checkType: 'T2500 Coverage',
        expectedMin: 15,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%SABS1123%' AND code LIKE '%2500%')",
      },
      {
        category: 'Flanges',
        standard: 'SABS 1123',
        checkType: 'T4000 Coverage',
        expectedMin: 15,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%SABS1123%' AND code LIKE '%4000%')",
      },
      {
        category: 'Flanges',
        standard: 'BS 10',
        checkType: 'Table D Coverage',
        expectedMin: 10,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%BS10%' AND code LIKE '%D%')",
      },
      {
        category: 'Flanges',
        standard: 'BS 10',
        checkType: 'Table E Coverage',
        expectedMin: 10,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%BS10%' AND code LIKE '%E%')",
      },
      {
        category: 'Flanges',
        standard: 'BS 10',
        checkType: 'Table F Coverage',
        expectedMin: 10,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%BS10%' AND code LIKE '%F%')",
      },
      {
        category: 'Flanges',
        standard: 'ANSI B16.5',
        checkType: 'Class 150 Coverage',
        expectedMin: 20,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%ANSI%' AND code LIKE '%150%')",
      },
      {
        category: 'Flanges',
        standard: 'ANSI B16.5',
        checkType: 'Class 300 Coverage',
        expectedMin: 20,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%ANSI%' AND code LIKE '%300%')",
      },
      {
        category: 'Flanges',
        standard: 'ANSI B16.5',
        checkType: 'Class 600 Coverage',
        expectedMin: 15,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%ANSI%' AND code LIKE '%600%')",
      },
      {
        category: 'Flanges',
        standard: 'ANSI B16.5',
        checkType: 'Class 900 Coverage',
        expectedMin: 10,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%ANSI%' AND code LIKE '%900%')",
      },
      {
        category: 'Flanges',
        standard: 'ANSI B16.5',
        checkType: 'Class 1500 Coverage',
        expectedMin: 10,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%ANSI%' AND code LIKE '%1500%')",
      },
      {
        category: 'Flanges',
        standard: 'ANSI B16.5',
        checkType: 'Class 2500 Coverage',
        expectedMin: 8,
        table: 'flange_dimensions',
        condition:
          "\"standardId\" IN (SELECT id FROM flange_standards WHERE code LIKE '%ANSI%' AND code LIKE '%2500%')",
      },
    ];

    for (const check of verificationChecks) {
      try {
        const result = await queryRunner.query(
          `SELECT COUNT(*) as count FROM ${check.table} WHERE ${check.condition}`,
        );
        const actualCount = parseInt(result[0]?.count || '0', 10);
        const status = actualCount >= check.expectedMin ? 'PASS' : 'REVIEW';
        const details = `Found ${actualCount} records, expected minimum ${check.expectedMin}`;

        await queryRunner.query(`
          INSERT INTO data_verification_logs
            (category, standard, check_type, expected_count, actual_count, status, details, reference_source)
          VALUES
            ('${check.category}', '${check.standard}', '${check.checkType}', ${check.expectedMin}, ${actualCount}, '${status}', '${details}', 'MPS Technical Manual')
        `);
      } catch (e) {
        await queryRunner.query(`
          INSERT INTO data_verification_logs
            (category, standard, check_type, expected_count, actual_count, status, details, reference_source)
          VALUES
            ('${check.category}', '${check.standard}', '${check.checkType}', ${check.expectedMin}, 0, 'ERROR', 'Query failed - table or column may not exist', 'MPS Technical Manual')
        `);
      }
    }

    console.warn('Flange data verification complete.');
  }

  private async createFlowFormulaParametersTable(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn('Creating flow formula parameters table...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS flow_formula_parameters (
        id SERIAL PRIMARY KEY,
        formula_name VARCHAR(50) NOT NULL,
        parameter_name VARCHAR(50) NOT NULL,
        parameter_value DECIMAL(10,6) NOT NULL,
        unit VARCHAR(30),
        application VARCHAR(100),
        reference_source VARCHAR(100),
        notes VARCHAR(255),
        UNIQUE(formula_name, parameter_name, application)
      )
    `);
  }

  private async populateFlowFormulaParameters(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn(
      'Populating flow formula parameters from MPS manual page 139-140...',
    );

    const formulaParams = [
      {
        formula: 'Prandtl-Colebrook',
        param: 'k_factor',
        value: 0.007,
        unit: 'mm',
        app: 'HDPE/PP pipes',
        ref: 'MPS Manual p.140',
        notes: 'Darcy roughness factor for smooth plastic pipes',
      },
      {
        formula: 'Prandtl-Colebrook',
        param: 'k_factor',
        value: 0.046,
        unit: 'mm',
        app: 'New steel pipes',
        ref: 'Engineering tables',
        notes: 'Darcy roughness factor for new steel',
      },
      {
        formula: 'Prandtl-Colebrook',
        param: 'k_factor',
        value: 0.15,
        unit: 'mm',
        app: 'Moderately corroded steel',
        ref: 'Engineering tables',
        notes: 'Darcy roughness factor for used steel pipes',
      },
      {
        formula: 'Prandtl-Colebrook',
        param: 'k_factor',
        value: 0.3,
        unit: 'mm',
        app: 'Cast iron',
        ref: 'Engineering tables',
        notes: 'Darcy roughness factor for cast iron',
      },
      {
        formula: 'Prandtl-Colebrook',
        param: 'k_factor',
        value: 3.0,
        unit: 'mm',
        app: 'Badly corroded steel',
        ref: 'Engineering tables',
        notes: 'Darcy roughness factor for severely corroded pipes',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 150,
        unit: null,
        app: 'HDPE/PP new',
        ref: 'MPS Manual p.139',
        notes: 'C value for new HDPE/PP pipes',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 140,
        unit: null,
        app: 'HDPE/PP 25 years',
        ref: 'MPS Manual p.139',
        notes: 'C value for 25 year old HDPE/PP',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 130,
        unit: null,
        app: 'HDPE/PP 50 years',
        ref: 'MPS Manual p.139',
        notes: 'C value for 50 year old HDPE/PP',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 150,
        unit: null,
        app: 'Steel new (lined/galv)',
        ref: 'MPS Manual p.139',
        notes: 'C value for new bitumen-lined or galvanized steel',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 130,
        unit: null,
        app: 'Steel 25 years',
        ref: 'MPS Manual p.139',
        notes: 'C value for 25 year old steel',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 100,
        unit: null,
        app: 'Steel old',
        ref: 'MPS Manual p.139',
        notes: 'C value for old steel pipes',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 60,
        unit: null,
        app: 'Steel badly corroded',
        ref: 'MPS Manual p.139',
        notes: 'C value for badly corroded steel',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 130,
        unit: null,
        app: 'Cast iron new',
        ref: 'MPS Manual p.139',
        notes: 'C value for new cast iron',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 110,
        unit: null,
        app: 'Cast iron 25 years',
        ref: 'MPS Manual p.139',
        notes: 'C value for 25 year old cast iron',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 90,
        unit: null,
        app: 'Cast iron old',
        ref: 'MPS Manual p.139',
        notes: 'C value for old cast iron',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 50,
        unit: null,
        app: 'Cast iron badly corroded',
        ref: 'MPS Manual p.139',
        notes: 'C value for badly corroded cast iron',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 150,
        unit: null,
        app: 'Smooth concrete new',
        ref: 'MPS Manual p.139',
        notes: 'C value for new smooth concrete/FRC',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 130,
        unit: null,
        app: 'Smooth concrete 25 years',
        ref: 'MPS Manual p.139',
        notes: 'C value for 25 year old concrete',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 120,
        unit: null,
        app: 'Smooth concrete old',
        ref: 'MPS Manual p.139',
        notes: 'C value for old concrete',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 100,
        unit: null,
        app: 'Concrete badly corroded',
        ref: 'MPS Manual p.139',
        notes: 'C value for badly deteriorated concrete',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 120,
        unit: null,
        app: 'Vitrified clay new',
        ref: 'MPS Manual p.139',
        notes: 'C value for new vitrified clay',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 80,
        unit: null,
        app: 'Vitrified clay old',
        ref: 'MPS Manual p.139',
        notes: 'C value for old vitrified clay',
      },
      {
        formula: 'Hazen-Williams',
        param: 'c_coefficient',
        value: 45,
        unit: null,
        app: 'Vitrified clay badly corroded',
        ref: 'MPS Manual p.139',
        notes: 'C value for badly corroded vitrified clay',
      },
      {
        formula: 'Manning',
        param: 'n_coefficient',
        value: 0.01,
        unit: null,
        app: 'HDPE/PP pipes',
        ref: 'MPS Manual p.140',
        notes: 'Manning n for smooth plastic pipes',
      },
      {
        formula: 'Manning',
        param: 'n_coefficient',
        value: 0.012,
        unit: null,
        app: 'New steel pipes',
        ref: 'Engineering tables',
        notes: 'Manning n for new steel',
      },
      {
        formula: 'Manning',
        param: 'n_coefficient',
        value: 0.015,
        unit: null,
        app: 'Cast iron',
        ref: 'Engineering tables',
        notes: 'Manning n for cast iron pipes',
      },
      {
        formula: 'Manning',
        param: 'n_coefficient',
        value: 0.013,
        unit: null,
        app: 'Concrete',
        ref: 'Engineering tables',
        notes: 'Manning n for concrete pipes',
      },
    ];

    for (const fp of formulaParams) {
      const unitVal = fp.unit ? `'${fp.unit}'` : 'NULL';
      const notesVal = fp.notes ? `'${fp.notes.replace(/'/g, "''")}'` : 'NULL';
      await queryRunner.query(`
        INSERT INTO flow_formula_parameters
          (formula_name, parameter_name, parameter_value, unit, application, reference_source, notes)
        VALUES
          ('${fp.formula}', '${fp.param}', ${fp.value}, ${unitVal}, '${fp.app}', '${fp.ref}', ${notesVal})
        ON CONFLICT (formula_name, parameter_name, application) DO NOTHING
      `);
    }

    console.warn('Flow formula parameters populated.');
  }

  private async addPipeRoughnessFactors(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn('Adding pipe roughness factors...');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pipe_roughness_factors (
        id SERIAL PRIMARY KEY,
        material VARCHAR(50) NOT NULL,
        condition VARCHAR(50) NOT NULL,
        absolute_roughness_mm DECIMAL(8,4) NOT NULL,
        relative_roughness_note VARCHAR(100),
        reference_source VARCHAR(100),
        UNIQUE(material, condition)
      )
    `);

    const roughnessData = [
      {
        mat: 'HDPE',
        cond: 'New',
        rough: 0.007,
        note: 'Very smooth internal surface',
        ref: 'MPS Manual p.140',
      },
      {
        mat: 'PP',
        cond: 'New',
        rough: 0.007,
        note: 'Very smooth internal surface',
        ref: 'MPS Manual p.140',
      },
      {
        mat: 'PVC',
        cond: 'New',
        rough: 0.007,
        note: 'Very smooth internal surface',
        ref: 'Engineering tables',
      },
      {
        mat: 'Steel',
        cond: 'New (bare)',
        rough: 0.046,
        note: 'Clean mill scale',
        ref: 'Engineering tables',
      },
      {
        mat: 'Steel',
        cond: 'New (coated)',
        rough: 0.03,
        note: 'Epoxy or similar coating',
        ref: 'Engineering tables',
      },
      {
        mat: 'Steel',
        cond: 'Slightly corroded',
        rough: 0.15,
        note: 'Light rust/deposits',
        ref: 'Engineering tables',
      },
      {
        mat: 'Steel',
        cond: 'Moderately corroded',
        rough: 0.3,
        note: 'Moderate tuberculation',
        ref: 'Engineering tables',
      },
      {
        mat: 'Steel',
        cond: 'Severely corroded',
        rough: 3.0,
        note: 'Heavy tuberculation',
        ref: 'Engineering tables',
      },
      {
        mat: 'Cast Iron',
        cond: 'New',
        rough: 0.26,
        note: 'Unlined',
        ref: 'Engineering tables',
      },
      {
        mat: 'Cast Iron',
        cond: 'Cement lined',
        rough: 0.03,
        note: 'Cement mortar lining',
        ref: 'Engineering tables',
      },
      {
        mat: 'Cast Iron',
        cond: 'Old',
        rough: 1.0,
        note: 'Moderate tuberculation',
        ref: 'Engineering tables',
      },
      {
        mat: 'Cast Iron',
        cond: 'Severely corroded',
        rough: 3.0,
        note: 'Heavy tuberculation',
        ref: 'Engineering tables',
      },
      {
        mat: 'Ductile Iron',
        cond: 'New (cement lined)',
        rough: 0.03,
        note: 'Standard cement lining',
        ref: 'Engineering tables',
      },
      {
        mat: 'Concrete',
        cond: 'Smooth finish',
        rough: 0.3,
        note: 'Steel forms',
        ref: 'Engineering tables',
      },
      {
        mat: 'Concrete',
        cond: 'Average',
        rough: 1.0,
        note: 'Typical construction',
        ref: 'Engineering tables',
      },
      {
        mat: 'Concrete',
        cond: 'Rough',
        rough: 3.0,
        note: 'Rough finish',
        ref: 'Engineering tables',
      },
      {
        mat: 'Copper',
        cond: 'New',
        rough: 0.0015,
        note: 'Drawn tubing',
        ref: 'Engineering tables',
      },
      {
        mat: 'Stainless Steel',
        cond: 'New',
        rough: 0.015,
        note: 'Mill finish',
        ref: 'Engineering tables',
      },
      {
        mat: 'Glass',
        cond: 'New',
        rough: 0.0015,
        note: 'Smooth glass pipe',
        ref: 'Engineering tables',
      },
      {
        mat: 'Rubber Lined',
        cond: 'New',
        rough: 0.01,
        note: 'Smooth rubber lining',
        ref: 'Engineering tables',
      },
    ];

    for (const r of roughnessData) {
      const noteVal = r.note ? `'${r.note}'` : 'NULL';
      await queryRunner.query(`
        INSERT INTO pipe_roughness_factors
          (material, condition, absolute_roughness_mm, relative_roughness_note, reference_source)
        VALUES
          ('${r.mat}', '${r.cond}', ${r.rough}, ${noteVal}, '${r.ref}')
        ON CONFLICT (material, condition) DO NOTHING
      `);
    }

    console.warn('Pipe roughness factors populated.');
  }

  private async verifySizeRangeCoverage(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.warn('Verifying pipe size range coverage...');

    const sizeChecks = [
      {
        category: 'Pipe Schedules',
        standard: 'ASTM A106',
        checkType: 'Size Range',
        table: 'pipe_dimensions',
        condition:
          "steel_specification_id IN (SELECT id FROM steel_specifications WHERE steel_spec_name LIKE '%A106%')",
        expectedMin: 50,
      },
      {
        category: 'Pipe Schedules',
        standard: 'SABS 719',
        checkType: 'Size Range',
        table: 'pipe_dimensions',
        condition:
          "steel_specification_id IN (SELECT id FROM steel_specifications WHERE steel_spec_name LIKE '%SABS 719%')",
        expectedMin: 30,
      },
      {
        category: 'Fittings',
        standard: 'ANSI B16.9',
        checkType: 'Fitting Coverage',
        table: 'ansi_b16_9_fitting_dimensions',
        condition: '1=1',
        expectedMin: 100,
      },
      {
        category: 'Fittings',
        standard: 'SABS 62',
        checkType: 'Fitting Coverage',
        table: 'sabs62_fitting_dimension',
        condition: '1=1',
        expectedMin: 50,
      },
      {
        category: 'Fittings',
        standard: 'SABS 719',
        checkType: 'Fitting Coverage',
        table: 'sabs719_fitting_dimension',
        condition: '1=1',
        expectedMin: 50,
      },
      {
        category: 'Fittings',
        standard: 'Forged Fittings',
        checkType: 'Fitting Coverage',
        table: 'forged_fitting_dimensions',
        condition: '1=1',
        expectedMin: 30,
      },
    ];

    for (const check of sizeChecks) {
      try {
        const result = await queryRunner.query(
          `SELECT COUNT(*) as count FROM ${check.table} WHERE ${check.condition}`,
        );
        const actualCount = parseInt(result[0]?.count || '0', 10);
        const status = actualCount >= check.expectedMin ? 'PASS' : 'REVIEW';
        const details = `Found ${actualCount} records, expected minimum ${check.expectedMin}`;

        await queryRunner.query(`
          INSERT INTO data_verification_logs
            (category, standard, check_type, expected_count, actual_count, status, details, reference_source)
          VALUES
            ('${check.category}', '${check.standard}', '${check.checkType}', ${check.expectedMin}, ${actualCount}, '${status}', '${details}', 'Database schema verification')
        `);
      } catch (e) {
        await queryRunner.query(`
          INSERT INTO data_verification_logs
            (category, standard, check_type, expected_count, actual_count, status, details, reference_source)
          VALUES
            ('${check.category}', '${check.standard}', '${check.checkType}', ${check.expectedMin}, 0, 'SKIPPED', 'Table does not exist or query failed', 'Database schema verification')
        `);
      }
    }

    const summaryResult = await queryRunner.query(`
      SELECT status, COUNT(*) as count FROM data_verification_logs GROUP BY status
    `);
    console.warn('Verification summary:', summaryResult);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('Reverting Priority 4-7 verification and flow data...');

    await queryRunner.query(`DROP TABLE IF EXISTS pipe_roughness_factors`);
    await queryRunner.query(`DROP TABLE IF EXISTS flow_formula_parameters`);
    await queryRunner.query(`DROP TABLE IF EXISTS data_verification_logs`);

    console.warn('Priority 4-7 verification and flow data reverted.');
  }
}
