import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSans1200HStructuralSteelworkData1777800000010 implements MigrationInterface {
  name = "AddSans1200HStructuralSteelworkData1777800000010";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = async (tableName: string): Promise<boolean> => {
      const result = await queryRunner.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
        [tableName],
      );
      return result[0].exists;
    };

    if (!(await tableExists("sans1200h_steel_grades"))) {
      await queryRunner.query(`
        CREATE TABLE sans1200h_steel_grades (
          id SERIAL PRIMARY KEY,
          grade VARCHAR(20) NOT NULL,
          description VARCHAR(100) NOT NULL,
          max_thickness_mm INTEGER,
          requires_impact_test BOOLEAN NOT NULL DEFAULT false,
          impact_test_energy_j INTEGER,
          impact_test_temp_c INTEGER,
          standard VARCHAR(20) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO sans1200h_steel_grades (grade, description, max_thickness_mm, requires_impact_test, impact_test_energy_j, impact_test_temp_c, standard, notes)
        VALUES
          ('300WA', 'Carbon-manganese steel', 25, false, NULL, NULL, 'SABS 1431', 'Standard structural grade'),
          ('350WA', 'Higher strength C-Mn steel', 20, false, NULL, NULL, 'SABS 1431', 'Higher strength grade'),
          ('450WA', 'High strength C-Mn steel', 12, false, NULL, NULL, 'SABS 1431', 'High strength grade'),
          ('300WC', 'Impact tested C-Mn steel', NULL, true, 27, 0, 'SABS 1431', 'No thickness limit with impact test'),
          ('350WC', 'Impact tested higher strength', NULL, true, 27, 0, 'SABS 1431', 'No thickness limit with impact test'),
          ('300WA (thick)', 'C-Mn steel > 25mm', NULL, true, 27, 0, 'SABS 1431', 'Exceeds limit - requires impact test'),
          ('350WA (thick)', 'Higher strength C-Mn > 20mm', NULL, true, 27, 0, 'SABS 1431', 'Exceeds limit - requires impact test'),
          ('450WA (thick)', 'High strength C-Mn > 12mm', NULL, true, 27, 0, 'SABS 1431', 'Exceeds limit - requires impact test')
      `);
    }

    if (!(await tableExists("sans1200h_bolt_specifications"))) {
      await queryRunner.query(`
        CREATE TABLE sans1200h_bolt_specifications (
          id SERIAL PRIMARY KEY,
          bolt_type VARCHAR(50) NOT NULL,
          standard VARCHAR(20) NOT NULL,
          application VARCHAR(100) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO sans1200h_bolt_specifications (bolt_type, standard, application, notes)
        VALUES
          ('Hexagon bolts (coarse thread)', 'SABS 135', 'General structural connections', 'Standard structural bolts'),
          ('Precision hexagon bolts', 'SABS 136', 'Fitted connections', 'Medium fit series'),
          ('Mushroom-head bolts', 'SABS 1143', 'Specific applications', 'Where flush surface required'),
          ('Countersunk-head bolts', 'SABS 1143', 'Specific applications', 'Where flush surface required'),
          ('Flat washers', 'SABS 1149', 'Under bolt heads and nuts', NULL),
          ('Taper washers', 'SABS 1149', 'On tapered flanges', 'Required for proper bearing'),
          ('Friction-grip bolts', 'SABS 1282', 'High-strength connections', 'Per SABS 094 installation'),
          ('Mild steel rivets', 'SABS 435', 'Riveted connections', 'Where specified')
      `);
    }

    if (!(await tableExists("sans1200h_bolt_tension_requirements"))) {
      await queryRunner.query(`
        CREATE TABLE sans1200h_bolt_tension_requirements (
          id SERIAL PRIMARY KEY,
          bolt_grade VARCHAR(20) NOT NULL,
          connection_type VARCHAR(50) NOT NULL,
          tension_requirement VARCHAR(100) NOT NULL,
          tightening_method VARCHAR(100),
          reuse_allowed BOOLEAN,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO sans1200h_bolt_tension_requirements (bolt_grade, connection_type, tension_requirement, tightening_method, reuse_allowed, notes)
        VALUES
          ('Grade 4.6', 'Shear/bearing', 'Hand-tight', 'Standard podger spanner', true, 'Limit of hand torque'),
          ('Grade 8.8', 'Shear/bearing', 'Hand-tight', 'Standard podger spanner', true, 'Limit of hand torque'),
          ('High tensile', 'Major tension/moment', '75% of proof load stress', 'Calibrated wrench', NULL, 'Also for fatigue-prone connections'),
          ('Grade 8.8s', 'Friction-grip (black)', 'Per SABS 094', 'Turn-of-the-nut', true, 'Reuse at Engineer discretion'),
          ('Grade 8.8s', 'Friction-grip (galvanized)', 'Per SABS 094', 'Turn-of-the-nut', false, 'No reuse allowed'),
          ('Grade 10.9s', 'Friction-grip', 'Per SABS 094', 'Turn-of-the-nut', false, 'No reuse allowed')
      `);
    }

    if (!(await tableExists("sans1200h_hole_clearances"))) {
      await queryRunner.query(`
        CREATE TABLE sans1200h_hole_clearances (
          id SERIAL PRIMARY KEY,
          fastener_type VARCHAR(50) NOT NULL,
          fastener_diameter_condition VARCHAR(50) NOT NULL,
          max_clearance_mm DECIMAL(4,1) NOT NULL,
          component_position VARCHAR(50),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO sans1200h_hole_clearances (fastener_type, fastener_diameter_condition, max_clearance_mm, component_position, notes)
        VALUES
          ('Standard bolts/rivets', '≤ 24 mm', 2.0, 'All', NULL),
          ('Standard bolts/rivets', '> 24 mm', 3.0, 'All', NULL),
          ('Friction-grip fasteners', 'All', 2.0, 'Outer components', 'Two components'),
          ('Friction-grip fasteners', 'All', 3.0, 'Inner components', 'More than three components bolted'),
          ('Fitted bolts/pins', 'All', 0.1, 'All', 'Tolerance 0 to +0.1 mm')
      `);
    }

    if (!(await tableExists("sans1200h_cutting_methods"))) {
      await queryRunner.query(`
        CREATE TABLE sans1200h_cutting_methods (
          id SERIAL PRIMARY KEY,
          method VARCHAR(50) NOT NULL,
          permitted BOOLEAN NOT NULL,
          condition VARCHAR(200),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO sans1200h_cutting_methods (method, permitted, condition, notes)
        VALUES
          ('Sawing', true, 'General use', 'Preferred method'),
          ('Shearing', true, 'General use', NULL),
          ('Cropping', true, 'General use', NULL),
          ('Machine flame-cutting', true, 'General use', NULL),
          ('Manual flame-cutting', true, 'Only where authorized', 'Requires specific approval'),
          ('Flame-cutting holes', false, 'Not permitted', 'Exception: HD bolts with specific approval'),
          ('Punching holes (≤ thickness)', true, 'Material thickness ≤ hole diameter', NULL),
          ('Punching holes (> 12mm)', true, 'Material > 12mm requires prior approval', 'Thick material restriction')
      `);
    }

    if (!(await tableExists("sans1200h_rivet_defect_limits"))) {
      await queryRunner.query(`
        CREATE TABLE sans1200h_rivet_defect_limits (
          id SERIAL PRIMARY KEY,
          defect_type VARCHAR(50) NOT NULL,
          rejection_criterion VARCHAR(200) NOT NULL,
          measurement_method VARCHAR(200),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO sans1200h_rivet_defect_limits (defect_type, rejection_criterion, measurement_method, notes)
        VALUES
          ('Eccentricity', '> 0.1 × shank diameter', 'Visual/measurement', 'Off-centre head'),
          ('Pitting (burning)', '> 1 mm depth over > 10% surface', 'Visual inspection', 'Surface damage from heating'),
          ('Cracks', 'Any visible to unaided eye', 'Visual inspection', 'Zero tolerance'),
          ('Gap under head', '> 0.15 mm feeler gauge to shank', '0.15 mm feeler gauge', 'Poor head formation'),
          ('Looseness', 'Movement felt when struck', 'Hammer test', 'Finger on opposite side'),
          ('Malformed head', 'Jockey cap formation', 'Visual inspection', 'Improper driving'),
          ('Countersunk unfilled', 'Not fully filled', 'Visual inspection', 'Insufficient material')
      `);
    }

    if (!(await tableExists("sans1200h_fabrication_tolerances"))) {
      await queryRunner.query(`
        CREATE TABLE sans1200h_fabrication_tolerances (
          id SERIAL PRIMARY KEY,
          element VARCHAR(100) NOT NULL,
          tolerance_value VARCHAR(100) NOT NULL,
          condition VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO sans1200h_fabrication_tolerances (element, tolerance_value, condition, notes)
        VALUES
          ('Component dimensions', '± 2 mm', 'General', 'Includes gussets, bracing, etc.'),
          ('Bolt hole locations', '± 2 mm', 'General', 'In components and elements'),
          ('Member length', 'Greater of: 3 mm or L/1000', 'Individual members', NULL),
          ('Truss/lattice girder length', 'Greater of: 3 mm or L/1000', 'Overall length', NULL),
          ('Truss component parts', '± 2 mm', 'Assembly tolerance', 'For proper assembly'),
          ('Calculated tolerances', 'Round up to nearest mm', 'All calculations', 'Minimum 1 mm'),
          ('Tape tension for measurement', '70 N', 'Verification', 'Standard condition'),
          ('Steel temperature for measurement', '2°C to 30°C', 'Normal temperature', 'Verification condition')
      `);
    }

    if (!(await tableExists("sans1200h_erection_tolerances"))) {
      await queryRunner.query(`
        CREATE TABLE sans1200h_erection_tolerances (
          id SERIAL PRIMARY KEY,
          element VARCHAR(100) NOT NULL,
          tolerance_value VARCHAR(100) NOT NULL,
          condition VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO sans1200h_erection_tolerances (element, tolerance_value, condition, notes)
        VALUES
          ('Out-of-plumb (height H)', 'Lesser of: 25 mm or L/500', 'Any vertical height', NULL),
          ('Purlins/sheeting rails', 'As project specification', 'Between restrained points', NULL),
          ('Other members', 'As project specification', 'General members', NULL),
          ('Handrails', 'Visually straight', 'Or specified shape', 'Per Engineer opinion'),
          ('Holding-down bolt location', 'As project specification', 'Plan position', NULL),
          ('Holding-down bolt elevation', 'As project specification', 'Top of bolt', NULL),
          ('Column base level', 'As project specification', 'Designated level', NULL),
          ('Column base plan position', 'As project specification', 'Designated position', NULL),
          ('Multi-storey - each storey', 'As project specification', 'Per storey', NULL),
          ('Multi-storey - total height', 'As project specification', 'Cumulative', NULL)
      `);
    }

    if (!(await tableExists("sans1200h_gantry_rail_tolerances"))) {
      await queryRunner.query(`
        CREATE TABLE sans1200h_gantry_rail_tolerances (
          id SERIAL PRIMARY KEY,
          dimension VARCHAR(100) NOT NULL,
          span_condition VARCHAR(50) NOT NULL,
          tolerance_value VARCHAR(50) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO sans1200h_gantry_rail_tolerances (dimension, span_condition, tolerance_value, notes)
        VALUES
          ('Gauge deviation', '≤ 15 m', '± 3 mm', NULL),
          ('Gauge deviation', '> 15 m', '± 5 mm', NULL),
          ('Gauge deviation', 'Maximum', '10 mm', 'Absolute limit'),
          ('Level difference between rails', 'All', 'As spec', 'Measured at supports'),
          ('Level over 2 m length', 'All', '2 mm', 'Local levelness'),
          ('Plan deviation from straight', 'All', 'As spec', 'Overall alignment'),
          ('Horizontal offset (2 m chord)', 'All', '1 mm', 'Local straightness'),
          ('Horizontal offset (15 m chord)', 'All', '5 mm', 'Overall straightness'),
          ('Gauge deviation (roller-guided)', '≤ 15 m', '± 6 mm', 'Double tolerance'),
          ('Gauge deviation (roller-guided)', '> 15 m', '± 10 mm', 'Double tolerance')
      `);
    }

    if (!(await tableExists("sans1200h_grouting_requirements"))) {
      await queryRunner.query(`
        CREATE TABLE sans1200h_grouting_requirements (
          id SERIAL PRIMARY KEY,
          application VARCHAR(100) NOT NULL,
          parameter VARCHAR(100) NOT NULL,
          requirement VARCHAR(100) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO sans1200h_grouting_requirements (application, parameter, requirement, notes)
        VALUES
          ('Stanchions in pockets', 'Corrosion protection depth', '100 mm below concrete', 'Applied before embedding'),
          ('Stanchions in pockets', 'Additional protection', '100 mm above and below concrete', 'Paint system'),
          ('Stanchions in pockets', 'Grout strength', '≥ surrounding concrete or 20 MPa', 'Whichever is greater'),
          ('Stanchions in pockets', 'Maximum aggregate size', '10 mm', NULL),
          ('Stanchions in pockets', 'Initial fill depth', 'At least 2/3 of pocket', NULL),
          ('Stanchions in pockets', 'Waiting period', '48 hours minimum', 'Before filling remainder'),
          ('Encasing steelwork', 'Concrete cover', 'Minimum 100 mm', 'Dense concrete'),
          ('Rapid-hardening cement', 'Usage', 'Only when authorized', 'By Engineer'),
          ('High alumina cement', 'Usage', 'Only when authorized', 'By Engineer')
      `);
    }

    if (!(await tableExists("sans1200h_assembly_requirements"))) {
      await queryRunner.query(`
        CREATE TABLE sans1200h_assembly_requirements (
          id SERIAL PRIMARY KEY,
          category VARCHAR(50) NOT NULL,
          requirement VARCHAR(200) NOT NULL,
          specification VARCHAR(200) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO sans1200h_assembly_requirements (category, requirement, specification, notes)
        VALUES
          ('Bolt length', 'Thread projection beyond nut', 'At least 1 thread', NULL),
          ('Bolt length', 'Clear thread before shank', 'At least 1 full thread (plus runout)', NULL),
          ('Fitted bolts', 'Thread in bearing area', 'No threaded portion', 'Within connected parts'),
          ('Washers', 'Flat surfaces, normal clearance', 'Not required unless specified', NULL),
          ('Washers', 'Tapered flanges', 'Taper washers required', 'For proper bearing'),
          ('Washers', 'Greater than normal clearance', 'Washers under head and nut', NULL),
          ('Hollow sections', 'Sealing', 'Prevent moisture ingress', 'Unless special protection'),
          ('Burrs', 'Before assembly', 'Remove from holes', 'Except when drilled through assembly'),
          ('Edges', 'After cutting', 'Free from defects/distortions', 'Ground and smoothed')
      `);
    }

    if (!(await tableExists("sans1200h_welding_standards"))) {
      await queryRunner.query(`
        CREATE TABLE sans1200h_welding_standards (
          id SERIAL PRIMARY KEY,
          standard VARCHAR(20) NOT NULL,
          title VARCHAR(200) NOT NULL,
          application VARCHAR(200) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO sans1200h_welding_standards (standard, title, application, notes)
        VALUES
          ('SABS 044', 'Welding (Parts I-V)', 'General welding requirements', 'Primary SA standard'),
          ('SABS 044 Part III', 'Fusion welding of steel', 'Weld procedure and production tests', NULL),
          ('SABS 044 Part IV', 'Welder approval (with WPS)', 'Welder qualification', 'Working to approved procedures'),
          ('SABS 044 Part V', 'Welder approval (without WPS)', 'Welder qualification', 'Without procedure approval'),
          ('SABS 0162', 'Structural use of steel', 'Design and execution', NULL),
          ('AWS D1.1', 'Structural welding code - Steel', 'Alternative standard', 'American Welding Society'),
          ('BS 5135', 'Arc welding of carbon steels', 'Alternative standard', 'British Standard'),
          ('BS 709', 'Destructive testing of welds', 'Testing methods', NULL),
          ('SABS 455', 'Covered electrodes', 'Welding consumables', 'C-Mn steel electrodes')
      `);
    }

    if (!(await tableExists("sans1200h_referenced_standards"))) {
      await queryRunner.query(`
        CREATE TABLE sans1200h_referenced_standards (
          id SERIAL PRIMARY KEY,
          standard VARCHAR(20) NOT NULL,
          title VARCHAR(200) NOT NULL,
          category VARCHAR(50) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO sans1200h_referenced_standards (standard, title, category, notes)
        VALUES
          ('SABS 044', 'Welding (Parts I-V)', 'Welding', 'Primary welding standard'),
          ('SABS 094', 'Use of high-strength friction-grip bolts', 'Fasteners', 'Installation requirements'),
          ('SABS 0162', 'Structural use of steel', 'Design', 'Structural design code'),
          ('SABS 135', 'ISO metric bolts (coarse thread)', 'Fasteners', 'Hexagon and square'),
          ('SABS 136', 'ISO metric precision bolts', 'Fasteners', 'Medium fit series'),
          ('SABS 435', 'Mild steel rivets', 'Fasteners', NULL),
          ('SABS 455', 'Covered electrodes for arc welding', 'Welding', 'C-Mn steel electrodes'),
          ('SABS 657', 'Steel tubes for non-pressure purposes', 'Materials', 'Part I: Structural tubes'),
          ('SABS 1143', 'Mushroom/countersunk bolts', 'Fasteners', NULL),
          ('SABS 1149', 'Flat and taper steel washers', 'Fasteners', NULL),
          ('SABS 1200 A', 'Civil engineering construction (General)', 'Specifications', NULL),
          ('SABS 1200 AA', 'Civil engineering construction (Small works)', 'Specifications', NULL),
          ('SABS 1200 AH', 'Civil engineering construction (Structural)', 'Specifications', NULL),
          ('SABS 1200 HA', 'Structural steelwork (Sundry items)', 'Specifications', NULL),
          ('SABS 1200 HB', 'Cladding and sheeting', 'Specifications', NULL),
          ('SABS 1200 HC', 'Corrosion protection of structural steelwork', 'Protection', NULL),
          ('SABS 1282', 'High-strength bolts for friction-grip joints', 'Fasteners', NULL),
          ('SABS 1431', 'Weldable structural steels', 'Materials', 'Steel grades'),
          ('AWS D1.1', 'Structural welding code - Steel', 'Welding', 'American standard'),
          ('BS 709', 'Destructive testing of fusion welded joints', 'Testing', NULL),
          ('BS 5135', 'Arc welding of carbon steels', 'Welding', 'British standard'),
          ('BS 5531', 'Safety in erecting structural frames', 'Safety', NULL)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS sans1200h_referenced_standards");
    await queryRunner.query("DROP TABLE IF EXISTS sans1200h_welding_standards");
    await queryRunner.query("DROP TABLE IF EXISTS sans1200h_assembly_requirements");
    await queryRunner.query("DROP TABLE IF EXISTS sans1200h_grouting_requirements");
    await queryRunner.query("DROP TABLE IF EXISTS sans1200h_gantry_rail_tolerances");
    await queryRunner.query("DROP TABLE IF EXISTS sans1200h_erection_tolerances");
    await queryRunner.query("DROP TABLE IF EXISTS sans1200h_fabrication_tolerances");
    await queryRunner.query("DROP TABLE IF EXISTS sans1200h_rivet_defect_limits");
    await queryRunner.query("DROP TABLE IF EXISTS sans1200h_cutting_methods");
    await queryRunner.query("DROP TABLE IF EXISTS sans1200h_hole_clearances");
    await queryRunner.query("DROP TABLE IF EXISTS sans1200h_bolt_tension_requirements");
    await queryRunner.query("DROP TABLE IF EXISTS sans1200h_bolt_specifications");
    await queryRunner.query("DROP TABLE IF EXISTS sans1200h_steel_grades");
  }
}
