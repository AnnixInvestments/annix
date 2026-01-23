import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDataConsistencyAndValidation1775900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addSourceDocumentationFields(queryRunner);
    await this.addNamingNormalization(queryRunner);
    await this.createValidationTables(queryRunner);
    await this.createValidationViews(queryRunner);
    await this.seedPtCurveVerificationData(queryRunner);
    await this.generateCoverageReport(queryRunner);
  }

  private async addSourceDocumentationFields(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE flange_dimensions
      ADD COLUMN IF NOT EXISTS source_standard VARCHAR(100),
      ADD COLUMN IF NOT EXISTS source_table VARCHAR(50),
      ADD COLUMN IF NOT EXISTS source_page VARCHAR(20),
      ADD COLUMN IF NOT EXISTS source_edition VARCHAR(50),
      ADD COLUMN IF NOT EXISTS verified_date DATE,
      ADD COLUMN IF NOT EXISTS verified_by VARCHAR(100),
      ADD COLUMN IF NOT EXISTS data_quality_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS notes TEXT
    `);

    await queryRunner.query(`
      ALTER TABLE flange_pt_ratings
      ADD COLUMN IF NOT EXISTS source_standard VARCHAR(100),
      ADD COLUMN IF NOT EXISTS source_table VARCHAR(50),
      ADD COLUMN IF NOT EXISTS source_page VARCHAR(20),
      ADD COLUMN IF NOT EXISTS source_edition VARCHAR(50),
      ADD COLUMN IF NOT EXISTS verified_date DATE,
      ADD COLUMN IF NOT EXISTS data_quality_score INTEGER DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE flange_bolting
      ADD COLUMN IF NOT EXISTS source_standard VARCHAR(100),
      ADD COLUMN IF NOT EXISTS source_table VARCHAR(50),
      ADD COLUMN IF NOT EXISTS verified_date DATE
    `);

    await queryRunner.query(`
      UPDATE flange_dimensions fd
      SET source_standard = fs.code,
          source_edition = CASE
            WHEN fs.code = 'ASME B16.5' THEN '2020'
            WHEN fs.code = 'ASME B16.47' THEN '2020'
            WHEN fs.code = 'BS 4504' THEN '1989'
            WHEN fs.code = 'BS 10' THEN '1962'
            WHEN fs.code = 'SABS 1123' THEN '2008'
            ELSE NULL
          END,
          source_table = CASE
            WHEN fs.code = 'ASME B16.5' THEN 'Tables 7-23'
            WHEN fs.code = 'ASME B16.47' THEN 'Series A/B Tables'
            WHEN fs.code = 'BS 4504' THEN 'Tables 1-24'
            WHEN fs.code = 'BS 10' THEN 'Tables D-K'
            WHEN fs.code = 'SABS 1123' THEN 'Tables 1-6'
            ELSE NULL
          END
      FROM flange_standards fs
      WHERE fd."standardId" = fs.id
        AND fd.source_standard IS NULL
    `);

    await queryRunner.query(`
      UPDATE flange_pt_ratings fpr
      SET source_standard = CASE
            WHEN fpr.material_group LIKE '%A105%' OR fpr.material_group LIKE '1.%' THEN 'ASME B16.5-2020'
            WHEN fpr.material_group LIKE '%304%' OR fpr.material_group LIKE '%316%' THEN 'ASME B16.5-2020'
            WHEN fpr.material_group LIKE '%A182%' THEN 'ASME B16.5-2020'
            ELSE 'ASME B16.5-2020'
          END,
          source_table = 'Table 2'
      WHERE source_standard IS NULL
    `);
  }

  private async addNamingNormalization(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE steel_specifications
      ADD COLUMN IF NOT EXISTS normalized_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(200),
      ADD COLUMN IF NOT EXISTS is_deprecated BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS deprecated_date DATE,
      ADD COLUMN IF NOT EXISTS replacement_id INTEGER REFERENCES steel_specifications(id),
      ADD COLUMN IF NOT EXISTS astm_equivalent VARCHAR(50),
      ADD COLUMN IF NOT EXISTS uns_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS en_equivalent VARCHAR(50),
      ADD COLUMN IF NOT EXISTS material_category VARCHAR(50)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_steel_spec_normalized
      ON steel_specifications(normalized_name)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_steel_spec_uns
      ON steel_specifications(uns_number)
    `);

    const normalizations = [
      { pattern: '%A106%B%', normalized: 'ASTM_A106_B', category: 'carbon_steel', uns: 'K03006' },
      { pattern: '%A106%C%', normalized: 'ASTM_A106_C', category: 'carbon_steel', uns: 'K03501' },
      { pattern: '%A53%B%', normalized: 'ASTM_A53_B', category: 'carbon_steel', uns: 'K03005' },
      { pattern: '%A333%6%', normalized: 'ASTM_A333_6', category: 'carbon_steel_low_temp', uns: 'K03006' },
      { pattern: '%A335%P11%', normalized: 'ASTM_A335_P11', category: 'chrome_moly', uns: 'K11597' },
      { pattern: '%A335%P22%', normalized: 'ASTM_A335_P22', category: 'chrome_moly', uns: 'K21590' },
      { pattern: '%A335%P91%', normalized: 'ASTM_A335_P91', category: 'chrome_moly', uns: 'K91560' },
      { pattern: '%A312%304%', normalized: 'ASTM_A312_TP304', category: 'austenitic_ss', uns: 'S30400' },
      { pattern: '%A312%316%', normalized: 'ASTM_A312_TP316', category: 'austenitic_ss', uns: 'S31600' },
      { pattern: '%A312%321%', normalized: 'ASTM_A312_TP321', category: 'austenitic_ss', uns: 'S32100' },
      { pattern: '%A790%S31803%', normalized: 'ASTM_A790_S31803', category: 'duplex_ss', uns: 'S31803' },
      { pattern: '%A790%S32205%', normalized: 'ASTM_A790_S32205', category: 'duplex_ss', uns: 'S32205' },
      { pattern: '%API%5L%B%', normalized: 'API_5L_B', category: 'line_pipe', uns: 'K03006' },
      { pattern: '%API%5L%X42%', normalized: 'API_5L_X42', category: 'line_pipe', uns: 'K03510' },
      { pattern: '%API%5L%X52%', normalized: 'API_5L_X52', category: 'line_pipe', uns: 'K03510' },
      { pattern: '%API%5L%X60%', normalized: 'API_5L_X60', category: 'line_pipe', uns: null },
      { pattern: '%API%5L%X65%', normalized: 'API_5L_X65', category: 'line_pipe', uns: null },
    ];

    for (const norm of normalizations) {
      await queryRunner.query(`
        UPDATE steel_specifications
        SET normalized_name = $1,
            material_category = $2,
            uns_number = $3
        WHERE steel_spec_name ILIKE $4
          AND normalized_name IS NULL
      `, [norm.normalized, norm.category, norm.uns, norm.pattern]);
    }

    await queryRunner.query(`
      UPDATE steel_specifications
      SET normalized_name = UPPER(REPLACE(REPLACE(REPLACE(steel_spec_name, ' ', '_'), '-', '_'), '.', '_')),
          display_name = steel_spec_name
      WHERE normalized_name IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE flange_standards
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(200),
      ADD COLUMN IF NOT EXISTS organization VARCHAR(100),
      ADD COLUMN IF NOT EXISTS country VARCHAR(50),
      ADD COLUMN IF NOT EXISTS current_edition VARCHAR(20),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS superseded_by VARCHAR(100)
    `);

    await queryRunner.query(`
      UPDATE flange_standards
      SET full_name = CASE code
            WHEN 'ASME B16.5' THEN 'Pipe Flanges and Flanged Fittings NPS 1/2 Through NPS 24'
            WHEN 'ASME B16.47' THEN 'Large Diameter Steel Flanges NPS 26 Through NPS 60'
            WHEN 'ASME B16.48' THEN 'Steel Line Blanks'
            WHEN 'BS 4504' THEN 'Circular Flanges for Pipes, Valves and Fittings (PN Designated)'
            WHEN 'BS 10' THEN 'Flanges and Bolting for Pipes, Valves and Fittings'
            WHEN 'SABS 1123' THEN 'Steel Flanges'
            WHEN 'EN 1092-1' THEN 'Flanges and Their Joints - Steel Flanges for PN Designated'
            ELSE code
          END,
          organization = CASE
            WHEN code LIKE 'ASME%' THEN 'ASME International'
            WHEN code LIKE 'BS%' THEN 'British Standards Institution'
            WHEN code LIKE 'SABS%' OR code LIKE 'SANS%' THEN 'South African Bureau of Standards'
            WHEN code LIKE 'EN%' THEN 'European Committee for Standardization'
            WHEN code LIKE 'ISO%' THEN 'International Organization for Standardization'
            WHEN code LIKE 'DIN%' THEN 'Deutsches Institut für Normung'
            WHEN code LIKE 'JIS%' THEN 'Japanese Industrial Standards'
            ELSE NULL
          END,
          country = CASE
            WHEN code LIKE 'ASME%' THEN 'USA'
            WHEN code LIKE 'BS%' THEN 'UK'
            WHEN code LIKE 'SABS%' OR code LIKE 'SANS%' THEN 'South Africa'
            WHEN code LIKE 'EN%' THEN 'Europe'
            WHEN code LIKE 'ISO%' THEN 'International'
            WHEN code LIKE 'DIN%' THEN 'Germany'
            WHEN code LIKE 'JIS%' THEN 'Japan'
            ELSE NULL
          END,
          current_edition = CASE code
            WHEN 'ASME B16.5' THEN '2020'
            WHEN 'ASME B16.47' THEN '2020'
            WHEN 'ASME B16.48' THEN '2020'
            WHEN 'BS 4504' THEN '1989 (Withdrawn)'
            WHEN 'BS 10' THEN '1962 (Withdrawn)'
            WHEN 'SABS 1123' THEN '2008'
            WHEN 'EN 1092-1' THEN '2018'
            ELSE NULL
          END,
          is_active = CASE
            WHEN code IN ('BS 4504', 'BS 10') THEN false
            ELSE true
          END,
          superseded_by = CASE code
            WHEN 'BS 4504' THEN 'EN 1092-1'
            WHEN 'BS 10' THEN 'BS EN 1092-1'
            ELSE NULL
          END
      WHERE full_name IS NULL
    `);
  }

  private async createValidationTables(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS flange_data_validation_rules (
        id SERIAL PRIMARY KEY,
        rule_code VARCHAR(50) NOT NULL UNIQUE,
        rule_name VARCHAR(200) NOT NULL,
        rule_description TEXT,
        rule_sql TEXT NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'warning',
        category VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS flange_data_validation_results (
        id SERIAL PRIMARY KEY,
        validation_run_id UUID NOT NULL,
        rule_code VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        issue_description TEXT NOT NULL,
        expected_value VARCHAR(200),
        actual_value VARCHAR(200),
        severity VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_validation_results_run
      ON flange_data_validation_results(validation_run_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pt_curve_verification (
        id SERIAL PRIMARY KEY,
        standard_code VARCHAR(50) NOT NULL,
        material_group VARCHAR(50) NOT NULL,
        pressure_class VARCHAR(20) NOT NULL,
        temperature_c DECIMAL(8,2) NOT NULL,
        expected_pressure_bar DECIMAL(10,2) NOT NULL,
        actual_pressure_bar DECIMAL(10,2),
        variance_percent DECIMAL(6,2),
        verification_status VARCHAR(20) DEFAULT 'pending',
        source_reference VARCHAR(200),
        notes TEXT,
        verified_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(standard_code, material_group, pressure_class, temperature_c)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS data_coverage_report (
        id SERIAL PRIMARY KEY,
        report_date DATE NOT NULL DEFAULT CURRENT_DATE,
        entity_type VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        total_expected INTEGER,
        total_present INTEGER,
        coverage_percent DECIMAL(5,2),
        missing_items TEXT[],
        notes TEXT,
        UNIQUE(report_date, entity_type, category, subcategory)
      )
    `);

    const validationRules = [
      {
        code: 'FD_OD_CONSISTENCY',
        name: 'Flange OD Consistency Check',
        description: 'Verifies that flange OD (D) is greater than nominal OD',
        sql: `SELECT fd.id, fd."D" as flange_od, nod.outside_diameter_mm as pipe_od
              FROM flange_dimensions fd
              JOIN nominal_outside_diameters nod ON fd."nominalOutsideDiameterId" = nod.id
              WHERE fd."D" <= nod.outside_diameter_mm`,
        severity: 'error',
        category: 'dimensional',
      },
      {
        code: 'FD_ID_VS_OD',
        name: 'Flange ID vs OD Check',
        description: 'Verifies that flange bore (d1) is less than flange OD',
        sql: `SELECT id, "d1" as bore, "D" as od FROM flange_dimensions WHERE "d1" >= "D"`,
        severity: 'error',
        category: 'dimensional',
      },
      {
        code: 'FD_PCD_POSITION',
        name: 'PCD Position Check',
        description: 'Verifies that PCD is between bore and OD',
        sql: `SELECT id, "d1" as bore, pcd, "D" as od FROM flange_dimensions WHERE pcd <= "d1" OR pcd >= "D"`,
        severity: 'error',
        category: 'dimensional',
      },
      {
        code: 'FD_BOLT_HOLE_FIT',
        name: 'Bolt Hole Fit Check',
        description: 'Verifies bolt holes fit within flange annulus',
        sql: `SELECT id, d4 as hole_dia, num_holes, pcd, "D" as od, "d1" as bore
              FROM flange_dimensions
              WHERE (pcd + d4/2) > ("D" - 5) OR (pcd - d4/2) < ("d1" + 5)`,
        severity: 'warning',
        category: 'dimensional',
      },
      {
        code: 'FD_HOLE_SPACING',
        name: 'Bolt Hole Spacing Check',
        description: 'Verifies bolt holes do not overlap',
        sql: `SELECT id, d4, num_holes, pcd,
                     (3.14159 * pcd / num_holes) as hole_spacing
              FROM flange_dimensions
              WHERE (3.14159 * pcd / num_holes) < (d4 * 1.5)`,
        severity: 'warning',
        category: 'dimensional',
      },
      {
        code: 'FD_MASS_REASONABLE',
        name: 'Flange Mass Reasonableness',
        description: 'Verifies flange mass is within expected range for size',
        sql: `SELECT id, mass_kg, "D", b,
                     (3.14159 * "D" * "D" / 4 * b * 7.85 / 1000000) as est_mass
              FROM flange_dimensions
              WHERE mass_kg < (3.14159 * "D" * "D" / 4 * b * 7.85 / 1000000) * 0.3
                 OR mass_kg > (3.14159 * "D" * "D" / 4 * b * 7.85 / 1000000) * 2.0`,
        severity: 'warning',
        category: 'physical',
      },
      {
        code: 'PT_MONOTONIC_DECREASE',
        name: 'P-T Rating Monotonic Decrease',
        description: 'Verifies pressure ratings decrease with temperature',
        sql: `SELECT fpr1.id, fpr1.temperature_celsius, fpr1.max_pressure_bar,
                     fpr2.temperature_celsius as next_temp, fpr2.max_pressure_bar as next_pressure
              FROM flange_pt_ratings fpr1
              JOIN flange_pt_ratings fpr2
                ON fpr1.pressure_class_id = fpr2.pressure_class_id
               AND fpr1.material_group = fpr2.material_group
               AND fpr2.temperature_celsius = (
                 SELECT MIN(temperature_celsius) FROM flange_pt_ratings
                 WHERE pressure_class_id = fpr1.pressure_class_id
                   AND material_group = fpr1.material_group
                   AND temperature_celsius > fpr1.temperature_celsius
               )
              WHERE fpr1.max_pressure_bar < fpr2.max_pressure_bar`,
        severity: 'error',
        category: 'pressure_rating',
      },
      {
        code: 'PT_POSITIVE_VALUES',
        name: 'P-T Rating Positive Values',
        description: 'Verifies all pressure ratings are positive',
        sql: `SELECT id, material_group, temperature_celsius, max_pressure_bar
              FROM flange_pt_ratings WHERE max_pressure_bar <= 0`,
        severity: 'error',
        category: 'pressure_rating',
      },
      {
        code: 'FB_BOLT_SIZE_MATCH',
        name: 'Bolting Size Match',
        description: 'Verifies bolt size matches flange dimension specification',
        sql: `SELECT fd.id, fd.d4 as hole_dia, b.size_designation
              FROM flange_dimensions fd
              JOIN bolts b ON fd."boltId" = b.id
              WHERE fd.d4 < (
                CASE
                  WHEN b.size_designation LIKE 'M%' THEN
                    CAST(SUBSTRING(b.size_designation FROM 2) AS DECIMAL) + 2
                  ELSE fd.d4
                END
              )`,
        severity: 'warning',
        category: 'bolting',
      },
    ];

    for (const rule of validationRules) {
      await queryRunner.query(`
        INSERT INTO flange_data_validation_rules (rule_code, rule_name, rule_description, rule_sql, severity, category)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (rule_code) DO UPDATE SET
          rule_name = $2,
          rule_sql = $4
      `, [rule.code, rule.name, rule.description, rule.sql, rule.severity, rule.category]);
    }
  }

  private async createValidationViews(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_flange_dimension_validation AS
      SELECT
        fd.id,
        fs.code as standard,
        fpc.designation as pressure_class,
        ft.code as flange_type,
        nod.nominal_diameter_mm,
        nod.outside_diameter_mm as pipe_od,
        fd."D" as flange_od,
        fd."d1" as bore,
        fd.pcd,
        fd.d4 as hole_dia,
        fd.num_holes,
        fd.b as thickness,
        fd.f as raised_face,
        fd.mass_kg,
        CASE WHEN fd."D" > nod.outside_diameter_mm THEN 'PASS' ELSE 'FAIL: OD too small' END as od_check,
        CASE WHEN fd."d1" < fd."D" THEN 'PASS' ELSE 'FAIL: Bore >= OD' END as bore_check,
        CASE WHEN fd.pcd > fd."d1" AND fd.pcd < fd."D" THEN 'PASS' ELSE 'FAIL: PCD out of range' END as pcd_check,
        CASE WHEN (3.14159 * fd.pcd / fd.num_holes) > (fd.d4 * 1.5) THEN 'PASS' ELSE 'WARN: Tight hole spacing' END as spacing_check,
        fd.source_standard,
        fd.source_table,
        fd.verified_date,
        fd.data_quality_score
      FROM flange_dimensions fd
      JOIN flange_standards fs ON fd."standardId" = fs.id
      JOIN flange_pressure_classes fpc ON fd."pressureClassId" = fpc.id
      LEFT JOIN flange_types ft ON fd."flangeTypeId" = ft.id
      JOIN nominal_outside_diameters nod ON fd."nominalOutsideDiameterId" = nod.id
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_pt_rating_coverage AS
      SELECT
        fpc.designation as pressure_class,
        fpr.material_group,
        COUNT(DISTINCT fpr.temperature_celsius) as temp_points,
        MIN(fpr.temperature_celsius) as min_temp_c,
        MAX(fpr.temperature_celsius) as max_temp_c,
        MIN(fpr.max_pressure_bar) as min_pressure_bar,
        MAX(fpr.max_pressure_bar) as max_pressure_bar,
        fpr.source_standard,
        COUNT(CASE WHEN fpr.data_quality_score >= 80 THEN 1 END) as verified_count
      FROM flange_pt_ratings fpr
      JOIN flange_pressure_classes fpc ON fpr.pressure_class_id = fpc.id
      GROUP BY fpc.designation, fpr.material_group, fpr.source_standard
      ORDER BY fpc.designation, fpr.material_group
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_flange_data_completeness AS
      SELECT
        fs.code as standard,
        fpc.designation as pressure_class,
        ft.code as flange_type,
        COUNT(DISTINCT nod.nominal_diameter_mm) as sizes_covered,
        MIN(nod.nominal_diameter_mm) as min_size_mm,
        MAX(nod.nominal_diameter_mm) as max_size_mm,
        COUNT(*) as total_records,
        COUNT(fd.source_standard) as documented_records,
        COUNT(fd.verified_date) as verified_records,
        ROUND(COUNT(fd.source_standard)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as documentation_percent,
        ROUND(COUNT(fd.verified_date)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as verification_percent
      FROM flange_dimensions fd
      JOIN flange_standards fs ON fd."standardId" = fs.id
      JOIN flange_pressure_classes fpc ON fd."pressureClassId" = fpc.id
      LEFT JOIN flange_types ft ON fd."flangeTypeId" = ft.id
      JOIN nominal_outside_diameters nod ON fd."nominalOutsideDiameterId" = nod.id
      GROUP BY fs.code, fpc.designation, ft.code
      ORDER BY fs.code, fpc.designation, ft.code
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_standard_coverage_summary AS
      SELECT
        fs.code as standard,
        fs.full_name,
        fs.current_edition,
        fs.is_active,
        COUNT(DISTINCT fd.id) as flange_dimensions,
        COUNT(DISTINCT fpc.id) as pressure_classes,
        COUNT(DISTINCT nod.nominal_diameter_mm) as sizes,
        COUNT(DISTINCT ft.id) as flange_types,
        (SELECT COUNT(*) FROM flange_pt_ratings WHERE source_standard LIKE fs.code || '%') as pt_ratings
      FROM flange_standards fs
      LEFT JOIN flange_dimensions fd ON fd."standardId" = fs.id
      LEFT JOIN flange_pressure_classes fpc ON fd."pressureClassId" = fpc.id
      LEFT JOIN nominal_outside_diameters nod ON fd."nominalOutsideDiameterId" = nod.id
      LEFT JOIN flange_types ft ON fd."flangeTypeId" = ft.id
      GROUP BY fs.id, fs.code, fs.full_name, fs.current_edition, fs.is_active
      ORDER BY fs.code
    `);
  }

  private async seedPtCurveVerificationData(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const asmeB165References = [
      // Class 150 - Material Group 1.1 (Carbon Steel)
      { standard: 'ASME B16.5', material: '1.1', class: '150', temp: -29, pressure: 19.6, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '150', temp: 38, pressure: 19.6, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '150', temp: 93, pressure: 17.7, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '150', temp: 149, pressure: 15.8, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '150', temp: 204, pressure: 13.8, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '150', temp: 260, pressure: 12.1, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '150', temp: 316, pressure: 9.7, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '150', temp: 343, pressure: 7.6, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '150', temp: 371, pressure: 5.9, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '150', temp: 399, pressure: 4.1, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '150', temp: 427, pressure: 2.8, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '150', temp: 454, pressure: 1.9, source: 'Table 2-1.1' },

      // Class 300 - Material Group 1.1
      { standard: 'ASME B16.5', material: '1.1', class: '300', temp: -29, pressure: 51.1, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '300', temp: 38, pressure: 51.1, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '300', temp: 93, pressure: 48.6, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '300', temp: 149, pressure: 45.7, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '300', temp: 204, pressure: 42.6, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '300', temp: 260, pressure: 39.4, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '300', temp: 316, pressure: 34.3, source: 'Table 2-1.1' },

      // Class 600 - Material Group 1.1
      { standard: 'ASME B16.5', material: '1.1', class: '600', temp: -29, pressure: 102.1, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '600', temp: 38, pressure: 102.1, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '600', temp: 149, pressure: 91.4, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '600', temp: 260, pressure: 78.8, source: 'Table 2-1.1' },
      { standard: 'ASME B16.5', material: '1.1', class: '600', temp: 316, pressure: 68.7, source: 'Table 2-1.1' },

      // Class 150 - Material Group 2.1 (304 Stainless)
      { standard: 'ASME B16.5', material: '2.1', class: '150', temp: -29, pressure: 19.6, source: 'Table 2-2.1' },
      { standard: 'ASME B16.5', material: '2.1', class: '150', temp: 38, pressure: 18.5, source: 'Table 2-2.1' },
      { standard: 'ASME B16.5', material: '2.1', class: '150', temp: 93, pressure: 16.5, source: 'Table 2-2.1' },
      { standard: 'ASME B16.5', material: '2.1', class: '150', temp: 149, pressure: 15.3, source: 'Table 2-2.1' },
      { standard: 'ASME B16.5', material: '2.1', class: '150', temp: 204, pressure: 14.3, source: 'Table 2-2.1' },
      { standard: 'ASME B16.5', material: '2.1', class: '150', temp: 260, pressure: 13.6, source: 'Table 2-2.1' },
      { standard: 'ASME B16.5', material: '2.1', class: '150', temp: 316, pressure: 13.1, source: 'Table 2-2.1' },
      { standard: 'ASME B16.5', material: '2.1', class: '150', temp: 371, pressure: 12.7, source: 'Table 2-2.1' },
      { standard: 'ASME B16.5', material: '2.1', class: '150', temp: 427, pressure: 12.4, source: 'Table 2-2.1' },

      // Class 150 - Material Group 2.2 (316 Stainless)
      { standard: 'ASME B16.5', material: '2.2', class: '150', temp: -29, pressure: 19.6, source: 'Table 2-2.2' },
      { standard: 'ASME B16.5', material: '2.2', class: '150', temp: 38, pressure: 18.9, source: 'Table 2-2.2' },
      { standard: 'ASME B16.5', material: '2.2', class: '150', temp: 149, pressure: 15.8, source: 'Table 2-2.2' },
      { standard: 'ASME B16.5', material: '2.2', class: '150', temp: 260, pressure: 14.1, source: 'Table 2-2.2' },
      { standard: 'ASME B16.5', material: '2.2', class: '150', temp: 371, pressure: 13.2, source: 'Table 2-2.2' },
      { standard: 'ASME B16.5', material: '2.2', class: '150', temp: 427, pressure: 12.9, source: 'Table 2-2.2' },
    ];

    for (const ref of asmeB165References) {
      await queryRunner.query(`
        INSERT INTO pt_curve_verification (
          standard_code, material_group, pressure_class, temperature_c,
          expected_pressure_bar, source_reference, verification_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'reference')
        ON CONFLICT (standard_code, material_group, pressure_class, temperature_c)
        DO UPDATE SET expected_pressure_bar = $5, source_reference = $6
      `, [ref.standard, ref.material, ref.class, ref.temp, ref.pressure, ref.source]);
    }

    await queryRunner.query(`
      UPDATE pt_curve_verification pcv
      SET actual_pressure_bar = fpr.max_pressure_bar,
          variance_percent = ROUND(
            ABS(fpr.max_pressure_bar - pcv.expected_pressure_bar) /
            NULLIF(pcv.expected_pressure_bar, 0) * 100, 2
          ),
          verification_status = CASE
            WHEN ABS(fpr.max_pressure_bar - pcv.expected_pressure_bar) /
                 NULLIF(pcv.expected_pressure_bar, 0) * 100 <= 1 THEN 'verified'
            WHEN ABS(fpr.max_pressure_bar - pcv.expected_pressure_bar) /
                 NULLIF(pcv.expected_pressure_bar, 0) * 100 <= 5 THEN 'acceptable'
            ELSE 'discrepancy'
          END,
          verified_date = CURRENT_DATE
      FROM flange_pt_ratings fpr
      JOIN flange_pressure_classes fpc ON fpr.pressure_class_id = fpc.id
      WHERE pcv.material_group = fpr.material_group
        AND pcv.pressure_class = fpc.designation
        AND pcv.temperature_c = fpr.temperature_celsius
        AND pcv.standard_code = 'ASME B16.5'
    `);
  }

  private async generateCoverageReport(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO data_coverage_report (entity_type, category, subcategory, total_expected, total_present, coverage_percent)
      SELECT
        'flange_dimension' as entity_type,
        fs.code as category,
        fpc.designation as subcategory,
        CASE fs.code
          WHEN 'ASME B16.5' THEN 25
          WHEN 'ASME B16.47' THEN 8
          WHEN 'BS 4504' THEN 20
          WHEN 'BS 10' THEN 15
          WHEN 'SABS 1123' THEN 12
          ELSE 15
        END as total_expected,
        COUNT(DISTINCT nod.nominal_diameter_mm) as total_present,
        ROUND(COUNT(DISTINCT nod.nominal_diameter_mm)::numeric /
              CASE fs.code
                WHEN 'ASME B16.5' THEN 25
                WHEN 'ASME B16.47' THEN 8
                WHEN 'BS 4504' THEN 20
                WHEN 'BS 10' THEN 15
                WHEN 'SABS 1123' THEN 12
                ELSE 15
              END * 100, 1) as coverage_percent
      FROM flange_dimensions fd
      JOIN flange_standards fs ON fd."standardId" = fs.id
      JOIN flange_pressure_classes fpc ON fd."pressureClassId" = fpc.id
      JOIN nominal_outside_diameters nod ON fd."nominalOutsideDiameterId" = nod.id
      GROUP BY fs.code, fpc.designation
      ON CONFLICT (report_date, entity_type, category, subcategory)
      DO UPDATE SET
        total_present = EXCLUDED.total_present,
        coverage_percent = EXCLUDED.coverage_percent
    `);

    await queryRunner.query(`
      INSERT INTO data_coverage_report (entity_type, category, subcategory, total_expected, total_present, coverage_percent)
      SELECT
        'pt_rating' as entity_type,
        'ASME B16.5' as category,
        material_group as subcategory,
        12 as total_expected,
        COUNT(DISTINCT temperature_celsius) as total_present,
        ROUND(COUNT(DISTINCT temperature_celsius)::numeric / 12 * 100, 1) as coverage_percent
      FROM flange_pt_ratings
      GROUP BY material_group
      ON CONFLICT (report_date, entity_type, category, subcategory)
      DO UPDATE SET
        total_present = EXCLUDED.total_present,
        coverage_percent = EXCLUDED.coverage_percent
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS v_standard_coverage_summary`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_flange_data_completeness`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_pt_rating_coverage`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_flange_dimension_validation`);

    await queryRunner.query(`DROP TABLE IF EXISTS data_coverage_report`);
    await queryRunner.query(`DROP TABLE IF EXISTS pt_curve_verification`);
    await queryRunner.query(`DROP TABLE IF EXISTS flange_data_validation_results`);
    await queryRunner.query(`DROP TABLE IF EXISTS flange_data_validation_rules`);

    await queryRunner.query(`
      ALTER TABLE flange_standards
      DROP COLUMN IF EXISTS full_name,
      DROP COLUMN IF EXISTS organization,
      DROP COLUMN IF EXISTS country,
      DROP COLUMN IF EXISTS current_edition,
      DROP COLUMN IF EXISTS is_active,
      DROP COLUMN IF EXISTS superseded_by
    `);

    await queryRunner.query(`
      ALTER TABLE steel_specifications
      DROP COLUMN IF EXISTS normalized_name,
      DROP COLUMN IF EXISTS display_name,
      DROP COLUMN IF EXISTS is_deprecated,
      DROP COLUMN IF EXISTS deprecated_date,
      DROP COLUMN IF EXISTS replacement_id,
      DROP COLUMN IF EXISTS astm_equivalent,
      DROP COLUMN IF EXISTS uns_number,
      DROP COLUMN IF EXISTS en_equivalent,
      DROP COLUMN IF EXISTS material_category
    `);

    await queryRunner.query(`
      ALTER TABLE flange_bolting
      DROP COLUMN IF EXISTS source_standard,
      DROP COLUMN IF EXISTS source_table,
      DROP COLUMN IF EXISTS verified_date
    `);

    await queryRunner.query(`
      ALTER TABLE flange_pt_ratings
      DROP COLUMN IF EXISTS source_standard,
      DROP COLUMN IF EXISTS source_table,
      DROP COLUMN IF EXISTS source_page,
      DROP COLUMN IF EXISTS source_edition,
      DROP COLUMN IF EXISTS verified_date,
      DROP COLUMN IF EXISTS data_quality_score
    `);

    await queryRunner.query(`
      ALTER TABLE flange_dimensions
      DROP COLUMN IF EXISTS source_standard,
      DROP COLUMN IF EXISTS source_table,
      DROP COLUMN IF EXISTS source_page,
      DROP COLUMN IF EXISTS source_edition,
      DROP COLUMN IF EXISTS verified_date,
      DROP COLUMN IF EXISTS verified_by,
      DROP COLUMN IF EXISTS data_quality_score,
      DROP COLUMN IF EXISTS notes
    `);
  }
}
