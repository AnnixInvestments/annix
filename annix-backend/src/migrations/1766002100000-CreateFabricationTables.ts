import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFabricationTables1766002100000 implements MigrationInterface {
  name = 'CreateFabricationTables1766002100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================== Create Tables ====================

    // Fabrication Operations Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fabrication_operations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        unit VARCHAR(20) NOT NULL,
        hours_per_unit DECIMAL(8, 4) NOT NULL,
        cost_per_unit DECIMAL(10, 2),
        stainless_multiplier DECIMAL(4, 2) DEFAULT 1.5,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Fabrication Complexity Levels Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fabrication_complexity_levels (
        id SERIAL PRIMARY KEY,
        level VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        hours_per_ton DECIMAL(8, 2) NOT NULL,
        labor_multiplier DECIMAL(4, 2) DEFAULT 1.0,
        examples JSONB,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Shop Labor Rates Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS shop_labor_rates (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        material_type VARCHAR(50) NOT NULL,
        rate_per_hour DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'ZAR',
        effective_from DATE,
        effective_to DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ==================== Seed Fabrication Operations ====================
    await queryRunner.query(`
      INSERT INTO fabrication_operations (name, code, description, unit, hours_per_unit, stainless_multiplier, display_order) VALUES
      -- Hole Making Operations
      ('Drilling', 'drilling', 'Standard drilling operation for bolt holes', 'hole', 0.20, 1.5, 1),
      ('Punching', 'punching', 'Mechanical punching for holes in plates', 'hole', 0.08, 1.3, 2),
      ('Tapping', 'tapping', 'Creating internal threads', 'hole', 0.25, 1.5, 3),
      ('Countersinking', 'countersinking', 'Creating countersunk holes for flush fasteners', 'hole', 0.15, 1.5, 4),

      -- Welding Operations
      ('Fillet Weld', 'fillet_weld', 'Standard fillet welding per meter', 'meter', 1.00, 1.5, 10),
      ('Butt Weld', 'butt_weld', 'Full penetration butt welding per meter', 'meter', 1.80, 1.5, 11),
      ('Plug Weld', 'plug_weld', 'Plug welding for slot connections', 'each', 0.40, 1.5, 12),
      ('Stud Weld', 'stud_weld', 'Welding of studs/shear connectors', 'each', 0.10, 1.5, 13),
      ('Tack Weld', 'tack_weld', 'Temporary tack welding for assembly', 'each', 0.05, 1.5, 14),

      -- Cutting Operations
      ('Plasma Cutting', 'plasma_cut', 'Plasma cutting per meter of cut', 'meter', 0.15, 1.3, 20),
      ('Oxy-Fuel Cutting', 'oxy_cut', 'Oxy-fuel cutting per meter', 'meter', 0.20, 1.2, 21),
      ('Saw Cutting', 'saw_cut', 'Band saw cutting per cut', 'each', 0.30, 1.4, 22),
      ('Laser Cutting', 'laser_cut', 'Precision laser cutting per meter', 'meter', 0.12, 1.3, 23),
      ('Shearing', 'shearing', 'Mechanical shearing of plates', 'meter', 0.10, 1.2, 24),

      -- Edge Preparation
      ('Beveling', 'beveling', 'Edge beveling for weld prep per meter', 'meter', 0.25, 1.4, 30),
      ('Grinding', 'grinding', 'Surface grinding per square meter', 'm2', 0.50, 1.5, 31),
      ('Deburring', 'deburring', 'Edge deburring per meter', 'meter', 0.08, 1.2, 32),
      ('Chamfering', 'chamfering', 'Chamfering of edges per meter', 'meter', 0.15, 1.4, 33),

      -- Forming Operations
      ('Bending - Small', 'bending_small', 'Bending of sections up to 100mm', 'each', 0.50, 1.6, 40),
      ('Bending - Medium', 'bending_medium', 'Bending of sections 100-200mm', 'each', 0.80, 1.6, 41),
      ('Bending - Large', 'bending_large', 'Bending of sections over 200mm', 'each', 1.20, 1.6, 42),
      ('Rolling', 'rolling', 'Rolling of plates per meter', 'meter', 0.40, 1.5, 43),
      ('Pressing', 'pressing', 'Press forming per operation', 'each', 0.60, 1.5, 44),

      -- Assembly Operations
      ('Fit-up', 'fitup', 'Initial fit-up and alignment per joint', 'each', 0.30, 1.3, 50),
      ('Bolting', 'bolting', 'Installing and torquing bolts', 'each', 0.08, 1.2, 51),
      ('Clamping', 'clamping', 'Temporary clamping for welding', 'each', 0.10, 1.0, 52),

      -- Surface Treatment
      ('Blasting - SA 2.5', 'blast_sa25', 'Abrasive blasting to SA 2.5 per m2', 'm2', 0.20, 1.3, 60),
      ('Blasting - SA 3', 'blast_sa3', 'Abrasive blasting to SA 3 per m2', 'm2', 0.30, 1.3, 61),
      ('Pickling', 'pickling', 'Acid pickling of stainless per m2', 'm2', 0.15, 1.0, 62),
      ('Passivation', 'passivation', 'Passivation of stainless per m2', 'm2', 0.10, 1.0, 63),

      -- Inspection
      ('Visual Inspection', 'visual_insp', 'Visual weld inspection per meter', 'meter', 0.05, 1.0, 70),
      ('MPI', 'mpi', 'Magnetic particle inspection per meter', 'meter', 0.15, 1.0, 71),
      ('DPI', 'dpi', 'Dye penetrant inspection per meter', 'meter', 0.12, 1.0, 72),
      ('UT', 'ut', 'Ultrasonic testing per meter', 'meter', 0.20, 1.0, 73),
      ('RT', 'rt', 'Radiographic testing per meter', 'meter', 0.40, 1.0, 74),

      -- Material Handling
      ('Crane Handling', 'crane_handling', 'Crane operations per lift', 'each', 0.25, 1.0, 80),
      ('Turning/Repositioning', 'turning', 'Turning heavy assemblies', 'each', 0.30, 1.0, 81),

      -- Marking
      ('Layout Marking', 'layout_mark', 'Layout marking per piece', 'each', 0.15, 1.0, 90),
      ('Identification Marking', 'id_mark', 'Part identification marking', 'each', 0.05, 1.0, 91)
    `);

    // ==================== Seed Complexity Levels ====================
    await queryRunner.query(`
      INSERT INTO fabrication_complexity_levels (level, name, description, hours_per_ton, labor_multiplier, examples, display_order) VALUES
      (
        'simple',
        'Simple Fabrication',
        'Basic fabrication with minimal operations - straight cuts, few holes, simple welds',
        12.00,
        1.0,
        '["Straight beams with end plates", "Simple column bases", "Basic grating supports", "Standard bracings", "Plain angle connections"]',
        1
      ),
      (
        'medium',
        'Medium Complexity',
        'Standard fabrication with moderate operations - compound cuts, multiple holes, standard connections',
        20.00,
        1.0,
        '["Beam to column connections", "Portal frame corners", "Standard trusses", "Plate girders", "Stiffened brackets", "Multi-hole connections"]',
        2
      ),
      (
        'complex',
        'Complex Fabrication',
        'Complex fabrication with intricate operations - curved sections, heavy welding, tight tolerances',
        35.00,
        1.0,
        '["Curved roof structures", "Heavy moment connections", "Complex nodes/intersections", "Specialty equipment supports", "Architectural steel", "Pressure vessel saddles"]',
        3
      ),
      (
        'very_complex',
        'Very Complex / Specialty',
        'Highly complex specialty fabrication requiring precision and extensive operations',
        50.00,
        1.0,
        '["Precision machinery bases", "Aerospace structures", "Nuclear grade fabrication", "Complex architectural features", "High-precision equipment supports"]',
        4
      )
    `);

    // ==================== Seed Shop Labor Rates ====================
    await queryRunner.query(`
      INSERT INTO shop_labor_rates (code, name, description, material_type, rate_per_hour, currency, effective_from) VALUES
      (
        'carbon_steel',
        'Carbon Steel Shop Rate',
        'Standard shop rate for carbon and low alloy steel fabrication',
        'Carbon Steel',
        380.00,
        'ZAR',
        '2024-01-01'
      ),
      (
        'stainless_steel',
        'Stainless Steel Shop Rate',
        'Shop rate for stainless steel fabrication (includes additional handling)',
        'Stainless Steel',
        520.00,
        'ZAR',
        '2024-01-01'
      ),
      (
        'aluminum',
        'Aluminum Shop Rate',
        'Shop rate for aluminum fabrication',
        'Aluminum',
        450.00,
        'ZAR',
        '2024-01-01'
      ),
      (
        'duplex',
        'Duplex Stainless Shop Rate',
        'Shop rate for duplex and super duplex stainless steel',
        'Duplex Stainless',
        650.00,
        'ZAR',
        '2024-01-01'
      ),
      (
        'high_alloy',
        'High Alloy Steel Shop Rate',
        'Shop rate for high alloy and specialty steels (Inconel, Hastelloy, etc.)',
        'High Alloy',
        750.00,
        'ZAR',
        '2024-01-01'
      ),
      (
        'site_rate',
        'Site/Field Work Rate',
        'Shop rate for field/site fabrication and erection work',
        'All Materials',
        550.00,
        'ZAR',
        '2024-01-01'
      )
    `);

    // Create indexes for better query performance
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fab_operations_code ON fabrication_operations(code)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fab_operations_active ON fabrication_operations(is_active)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fab_complexity_level ON fabrication_complexity_levels(level)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_labor_rates_code ON shop_labor_rates(code)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_labor_rates_active ON shop_labor_rates(is_active)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_labor_rates_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_labor_rates_code`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fab_complexity_level`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fab_operations_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fab_operations_code`);
    await queryRunner.query(`DROP TABLE IF EXISTS shop_labor_rates`);
    await queryRunner.query(`DROP TABLE IF EXISTS fabrication_complexity_levels`);
    await queryRunner.query(`DROP TABLE IF EXISTS fabrication_operations`);
  }
}
