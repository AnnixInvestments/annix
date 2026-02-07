import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWeldingProcessesData1777800000005 implements MigrationInterface {
  name = "AddWeldingProcessesData1777800000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = async (tableName: string): Promise<boolean> => {
      const result = await queryRunner.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
        [tableName],
      );
      return result[0].exists;
    };

    if (!(await tableExists("welding_processes"))) {
      await queryRunner.query(`
        CREATE TABLE welding_processes (
          id SERIAL PRIMARY KEY,
          aws_code VARCHAR(20) NOT NULL UNIQUE,
          process_name VARCHAR(150) NOT NULL,
          common_name VARCHAR(100),
          category VARCHAR(50) NOT NULL,
          description TEXT,
          primary_application TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO welding_processes (aws_code, process_name, common_name, category, description, primary_application)
        VALUES
          ('SMAW', 'Shielded Metal Arc Welding', 'Stick, MMA', 'Fusion Arc', 'Manual process using flux-coated consumable electrode', 'General fabrication, field welding, all positions'),
          ('GTAW', 'Gas Tungsten Arc Welding', 'TIG', 'Fusion Arc', 'Non-consumable tungsten electrode with inert gas shielding', 'High quality welds, thin material, non-ferrous metals'),
          ('GMAW', 'Gas Metal Arc Welding', 'MIG, MAG', 'Fusion Arc', 'Consumable wire electrode with gas shielding', 'Production welding, semi-automatic/automatic'),
          ('FCAW', 'Flux Cored Arc Welding', NULL, 'Fusion Arc', 'Tubular wire with flux core, self-shielded or gas-shielded', 'High deposition, outdoor welding'),
          ('SAW', 'Submerged Arc Welding', NULL, 'Fusion Arc', 'Arc under granular flux blanket', 'Heavy sections, high productivity'),
          ('ESW', 'Electro-Slag Welding', NULL, 'Fusion Arc', 'Resistance heating through molten slag', 'Very thick sections, vertical joints'),
          ('PAW', 'Plasma Arc Welding', NULL, 'High Energy', 'Constricted plasma arc', 'Precision, thin material, keyhole welding'),
          ('OFW', 'Oxy-Fuel Welding', 'Gas Welding', 'Gas', 'Combustion of fuel gas with oxygen', 'Thin sheets, repair, brazing'),
          ('RW', 'Resistance Welding', 'Spot, Seam', 'Resistance', 'Electric resistance heating under pressure', 'Sheet metal, production'),
          ('EBW', 'Electron Beam Welding', NULL, 'High Energy', 'Focused electron beam in vacuum', 'Aerospace, precision, deep penetration'),
          ('LBW', 'Laser Beam Welding', NULL, 'High Energy', 'Concentrated laser energy', 'Precision, automation, dissimilar metals'),
          ('FRW', 'Friction Welding', NULL, 'Solid State', 'Frictional heat with forging pressure', 'Dissimilar metals, round sections')
      `);
    }

    if (!(await tableExists("fuel_gas_temperatures"))) {
      await queryRunner.query(`
        CREATE TABLE fuel_gas_temperatures (
          id SERIAL PRIMARY KEY,
          fuel_gas VARCHAR(50) NOT NULL UNIQUE,
          max_temperature_c INTEGER NOT NULL,
          neutral_flame_c INTEGER NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO fuel_gas_temperatures (fuel_gas, max_temperature_c, neutral_flame_c, notes)
        VALUES
          ('Acetylene', 3300, 3200, 'Most common fuel gas, highest temperature'),
          ('MAPP (Methyl Acetylene Propadiene)', 2900, 2600, 'Safer than acetylene, good for cutting'),
          ('Propylene', 2860, 2500, 'Lower cost alternative'),
          ('Propane', 2780, 2450, 'Commonly available, lower temperature'),
          ('Methane', 2740, 2350, 'Natural gas'),
          ('Hydrogen', 2870, 2390, 'Clean flame, used for aluminium')
      `);
    }

    if (!(await tableExists("flame_types"))) {
      await queryRunner.query(`
        CREATE TABLE flame_types (
          id SERIAL PRIMARY KEY,
          flame_type VARCHAR(50) NOT NULL UNIQUE,
          gas_ratio VARCHAR(20) NOT NULL,
          description TEXT,
          application TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO flame_types (flame_type, gas_ratio, description, application)
        VALUES
          ('Reducing (Carburising)', '> 1:1', 'Excess acetylene, adds carbon to weld', 'High carbon steel, hardfacing, stellite'),
          ('Neutral', '1:1', 'Equal parts fuel and oxygen', 'General steel welding, most applications'),
          ('Oxidising', '< 1:1', 'Excess oxygen, highest temperature', 'Copper alloys, zinc alloys, cast iron, manganese steel')
      `);
    }

    if (!(await tableExists("electrode_current_ranges"))) {
      await queryRunner.query(`
        CREATE TABLE electrode_current_ranges (
          id SERIAL PRIMARY KEY,
          electrode_diameter_mm DECIMAL(4,2) NOT NULL,
          min_current_a INTEGER NOT NULL,
          max_current_a INTEGER NOT NULL,
          typical_application TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(electrode_diameter_mm)
        )
      `);

      await queryRunner.query(`
        INSERT INTO electrode_current_ranges (electrode_diameter_mm, min_current_a, max_current_a, typical_application)
        VALUES
          (1.6, 20, 45, 'Very thin material, tack welds'),
          (2.0, 35, 65, 'Light work, sheet metal'),
          (2.5, 50, 90, 'General light work'),
          (3.2, 80, 130, 'General purpose'),
          (4.0, 120, 180, 'Medium work, most common size'),
          (5.0, 180, 270, 'Heavy work, thick sections'),
          (6.3, 240, 320, 'Maximum heat, heavy sections')
      `);
    }

    if (!(await tableExists("welding_shielding_gases"))) {
      await queryRunner.query(`
        CREATE TABLE welding_shielding_gases (
          id SERIAL PRIMARY KEY,
          gas_composition VARCHAR(100) NOT NULL,
          process VARCHAR(20) NOT NULL,
          application TEXT NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(gas_composition, process)
        )
      `);

      await queryRunner.query(`
        INSERT INTO welding_shielding_gases (gas_composition, process, application, notes)
        VALUES
          ('Argon 100%', 'GMAW', 'Most metals except steel', 'Good arc stability'),
          ('Helium 100%', 'GMAW', 'Aluminium, copper alloys', 'Higher heat input, higher flow rate needed'),
          ('Ar + He 50%', 'GMAW', 'Aluminium, copper alloys', 'Balance of properties'),
          ('Ar + 25% N2', 'GMAW', 'Copper and alloys', 'Improved penetration'),
          ('Ar + 1-2% O2', 'GMAW', 'Alloy steels, stainless steels', 'Improved wetting'),
          ('Ar + 3-5% O2', 'GMAW', 'Carbon steels', 'Requires deoxidised electrodes'),
          ('Ar + 25% CO2', 'GMAW', 'Various steels', 'Short circuiting arc, good penetration'),
          ('Ar + 5% O2 + 15% CO2', 'GMAW', 'Various steels', 'Requires deoxidised wire'),
          ('CO2 100%', 'GMAW', 'Carbon/low alloy steel', 'Low cost, requires deoxidised electrodes'),
          ('Argon 100%', 'GTAW', 'Carbon steel, stainless, aluminium', 'Most common TIG gas'),
          ('Ar + 5% H2', 'GTAW', 'Stainless steel, nickel alloys', 'Increased arc efficiency'),
          ('Ar + He', 'GTAW', 'Aluminium, copper', 'Higher heat input'),
          ('Helium 100%', 'GTAW', 'Aluminium (thick)', 'Maximum heat input')
      `);
    }

    if (!(await tableExists("metal_transfer_modes"))) {
      await queryRunner.query(`
        CREATE TABLE metal_transfer_modes (
          id SERIAL PRIMARY KEY,
          transfer_mode VARCHAR(50) NOT NULL UNIQUE,
          current_range VARCHAR(50) NOT NULL,
          voltage_range VARCHAR(20) NOT NULL,
          description TEXT,
          application TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO metal_transfer_modes (transfer_mode, current_range, voltage_range, description, application)
        VALUES
          ('Short Circuit (Dip)', '60-180 A', '16-22 V', 'Wire touches pool, small drops transferred', 'Thin sheets, all positions, root passes'),
          ('Globular', 'Medium', '22-28 V', 'Large drops transfer by gravity', 'Flat position only, limited use'),
          ('Spray', '>250 A', '24-32 V', 'Fine droplets propelled by electromagnetic force', 'Thick sections, flat and horizontal'),
          ('Pulsed', 'Variable', 'Variable', 'Alternating high/low current pulses', 'All positions, precise control, thin material')
      `);
    }

    if (!(await tableExists("tungsten_electrode_types"))) {
      await queryRunner.query(`
        CREATE TABLE tungsten_electrode_types (
          id SERIAL PRIMARY KEY,
          electrode_type VARCHAR(50) NOT NULL UNIQUE,
          aws_class VARCHAR(20),
          alloying_element VARCHAR(50),
          oxide_content VARCHAR(20),
          current_type VARCHAR(20) NOT NULL,
          application TEXT,
          color_code VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO tungsten_electrode_types (electrode_type, aws_class, alloying_element, oxide_content, current_type, application, color_code)
        VALUES
          ('Pure Tungsten', 'EWP', 'None', 'None', 'AC', 'Aluminium, magnesium (AC welding)', 'Green'),
          ('Thoriated 1%', 'EWTh-1', 'Thorium', '1% ThO2', 'DC', 'Steel, stainless, high current', 'Yellow'),
          ('Thoriated 2%', 'EWTh-2', 'Thorium', '2% ThO2', 'DC', 'Steel, stainless, highest current capacity', 'Red'),
          ('Zirconiated', 'EWZr-1', 'Zirconium', '0.3-0.5% ZrO2', 'AC', 'Aluminium, magnesium, contamination resistant', 'Brown'),
          ('Ceriated 2%', 'EWCe-2', 'Cerium', '2% CeO2', 'AC/DC', 'General purpose, low current start', 'Gray'),
          ('Lanthanated 1%', 'EWLa-1', 'Lanthanum', '1% La2O3', 'AC/DC', 'General purpose, non-radioactive', 'Black'),
          ('Lanthanated 1.5%', 'EWLa-1.5', 'Lanthanum', '1.5% La2O3', 'AC/DC', 'General purpose, better than 1%', 'Gold'),
          ('Lanthanated 2%', 'EWLa-2', 'Lanthanum', '2% La2O3', 'AC/DC', 'Most versatile, thorium replacement', 'Blue')
      `);
    }

    if (!(await tableExists("welding_groove_types"))) {
      await queryRunner.query(`
        CREATE TABLE welding_groove_types (
          id SERIAL PRIMARY KEY,
          groove_type VARCHAR(50) NOT NULL UNIQUE,
          included_angle VARCHAR(20),
          root_opening VARCHAR(20),
          root_face VARCHAR(20),
          min_thickness_mm DECIMAL(5,2),
          max_thickness_mm DECIMAL(5,2),
          application TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO welding_groove_types (groove_type, included_angle, root_opening, root_face, min_thickness_mm, max_thickness_mm, application)
        VALUES
          ('Square', '0°', '0-3mm', 'Full thickness', 0, 6, 'Thin material, full penetration'),
          ('Single V', '60-70°', '0-3mm', '0-3mm', 5, 19, 'General purpose, most common'),
          ('Double V', '60-70°', '0-3mm', '0-3mm', 16, 100, 'Thick sections, both sides accessible'),
          ('Single Bevel', '35-45°', '0-3mm', '0-3mm', 5, 19, 'T-joints, corner joints'),
          ('Double Bevel', '35-45°', '0-3mm', '0-3mm', 16, 50, 'Thick T-joints'),
          ('Single J', '15-25°', '0-3mm', '1.5-3mm', 16, 40, 'Thick sections, reduced filler'),
          ('Double J', '15-25°', '0-3mm', '1.5-3mm', 25, 75, 'Very thick sections'),
          ('Single U', '10-20°', '0-3mm', '1.5-3mm', 19, 50, 'Thick sections, minimum distortion'),
          ('Double U', '10-20°', '0-3mm', '1.5-3mm', 38, 100, 'Very thick sections, both sides')
      `);
    }

    if (!(await tableExists("resistance_welding_params"))) {
      await queryRunner.query(`
        CREATE TABLE resistance_welding_params (
          id SERIAL PRIMARY KEY,
          welding_type VARCHAR(50) NOT NULL,
          material VARCHAR(50) NOT NULL,
          max_thickness_mm DECIMAL(5,2),
          pressure_range_mpa VARCHAR(50),
          current_density_a_mm2 DECIMAL(8,2),
          electrode_formula TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(welding_type, material)
        )
      `);

      await queryRunner.query(`
        INSERT INTO resistance_welding_params (welding_type, material, max_thickness_mm, pressure_range_mpa, current_density_a_mm2, electrode_formula, notes)
        VALUES
          ('Spot', 'Mild Steel', 10, '3-8.5', 775, 'de = 0.1 + 2t (mm)', 'Most common application'),
          ('Spot', 'Aluminium', 6, '5-10', 1000, 'de = 0.1 + 2t (mm)', 'Higher current required'),
          ('Spot', 'Copper', 1.5, '8-12', 1500, 'de = 0.1 + 2t (mm)', 'Difficult due to high conductivity'),
          ('Spot', 'Stainless Steel', 8, '4-9', 850, 'de = 0.1 + 2t (mm)', 'Higher resistance than mild steel'),
          ('Seam', 'Mild Steel', 6, '3-8.5', 600, NULL, 'Continuous or intermittent'),
          ('Seam', 'Aluminium', 3, '5-10', 800, NULL, 'Requires precise control'),
          ('Flash Butt', 'Low Alloy Steel', NULL, '70 (cold), 35 (preheat)', NULL, NULL, 'Pipes, structural sections'),
          ('Flash Butt', 'Medium Carbon Steel', NULL, '110 (cold), 55 (preheat)', NULL, NULL, 'Higher pressure required'),
          ('Flash Butt', 'Stainless Steel', NULL, '177 (cold), 88 (preheat)', NULL, NULL, 'Highest pressure'),
          ('Flash Butt', 'Tool Steel', NULL, '177 (cold), 88 (preheat)', NULL, NULL, 'Similar to stainless')
      `);
    }

    if (!(await tableExists("welding_electrode_standards"))) {
      await queryRunner.query(`
        CREATE TABLE welding_electrode_standards (
          id SERIAL PRIMARY KEY,
          standard_code VARCHAR(30) NOT NULL UNIQUE,
          issuing_body VARCHAR(20) NOT NULL,
          description TEXT NOT NULL,
          material_type VARCHAR(50) NOT NULL,
          process VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO welding_electrode_standards (standard_code, issuing_body, description, material_type, process)
        VALUES
          ('AWS A5.1', 'AWS', 'Carbon steel covered arc welding electrodes', 'Carbon Steel', 'SMAW'),
          ('AWS A5.4', 'AWS', 'Stainless steel covered electrodes', 'Stainless Steel', 'SMAW'),
          ('AWS A5.5', 'AWS', 'Low alloy steel covered electrodes', 'Low Alloy Steel', 'SMAW'),
          ('AWS A5.7', 'AWS', 'Copper and copper alloy bare welding rods and electrodes', 'Copper Alloys', 'GTAW/GMAW'),
          ('AWS A5.9', 'AWS', 'Bare stainless steel welding electrodes and rods', 'Stainless Steel', 'GTAW/GMAW'),
          ('AWS A5.10', 'AWS', 'Aluminium and aluminium alloy welding electrodes and rods', 'Aluminium', 'GTAW/GMAW'),
          ('AWS A5.12', 'AWS', 'Tungsten and oxide dispersed tungsten electrodes for arc welding', 'Tungsten', 'GTAW'),
          ('AWS A5.17', 'AWS', 'Carbon steel electrodes and fluxes for SAW', 'Carbon Steel', 'SAW'),
          ('AWS A5.18', 'AWS', 'Carbon steel electrodes and rods for GMAW', 'Carbon Steel', 'GMAW'),
          ('AWS A5.20', 'AWS', 'Carbon steel electrodes for FCAW', 'Carbon Steel', 'FCAW'),
          ('AWS A5.23', 'AWS', 'Low alloy steel electrodes and fluxes for SAW', 'Low Alloy Steel', 'SAW'),
          ('AWS A5.25', 'AWS', 'Carbon and low alloy steel electrodes and fluxes for ESW', 'Carbon/Low Alloy', 'ESW'),
          ('IS 815', 'BIS', 'Covered electrodes for metal arc welding of structural steels', 'Structural Steel', 'SMAW'),
          ('IS 1395', 'BIS', 'Low and medium alloy steel covered electrodes', 'Low/Medium Alloy', 'SMAW'),
          ('IS 5897', 'BIS', 'Aluminium alloy filler rods and wires', 'Aluminium', 'GTAW/GMAW'),
          ('IS 5898', 'BIS', 'Copper alloy filler rods and wires', 'Copper Alloys', 'GTAW/GMAW')
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS welding_electrode_standards");
    await queryRunner.query("DROP TABLE IF EXISTS resistance_welding_params");
    await queryRunner.query("DROP TABLE IF EXISTS welding_groove_types");
    await queryRunner.query("DROP TABLE IF EXISTS tungsten_electrode_types");
    await queryRunner.query("DROP TABLE IF EXISTS metal_transfer_modes");
    await queryRunner.query("DROP TABLE IF EXISTS welding_shielding_gases");
    await queryRunner.query("DROP TABLE IF EXISTS electrode_current_ranges");
    await queryRunner.query("DROP TABLE IF EXISTS flame_types");
    await queryRunner.query("DROP TABLE IF EXISTS fuel_gas_temperatures");
    await queryRunner.query("DROP TABLE IF EXISTS welding_processes");
  }
}
