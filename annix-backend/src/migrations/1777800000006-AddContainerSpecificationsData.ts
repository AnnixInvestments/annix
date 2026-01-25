import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContainerSpecificationsData1777800000006 implements MigrationInterface {
  name = 'AddContainerSpecificationsData1777800000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = async (tableName: string): Promise<boolean> => {
      const result = await queryRunner.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        [tableName],
      );
      return result[0].exists;
    };

    if (!(await tableExists('container_types'))) {
      await queryRunner.query(`
        CREATE TABLE container_types (
          id SERIAL PRIMARY KEY,
          type_code VARCHAR(10) NOT NULL UNIQUE,
          type_name VARCHAR(100) NOT NULL,
          description TEXT,
          has_roof BOOLEAN DEFAULT true,
          has_walls BOOLEAN DEFAULT true,
          is_temperature_controlled BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO container_types (type_code, type_name, description, has_roof, has_walls, is_temperature_controlled)
        VALUES
          ('GP', 'General Purpose', 'Standard dry freight container with closed walls and roof', true, true, false),
          ('HC', 'High Cube', 'Taller standard container with extra height (9''6")', true, true, false),
          ('HT', 'Hard Top', 'Container with removable steel roof for top loading', true, true, false),
          ('OT', 'Open Top', 'Container with removable tarpaulin roof for top loading', false, true, false),
          ('FR', 'Flat Rack', 'Container with collapsible end walls, no roof or side walls', false, false, false),
          ('PL', 'Platform', 'Flat bed container with no walls or roof', false, false, false),
          ('VE', 'Ventilated', 'Container with ventilation openings for air circulation', true, true, false),
          ('RF', 'Refrigerated', 'Temperature-controlled container for perishables', true, true, true),
          ('TK', 'Tank', 'Cylindrical tank in ISO frame for liquids/gases', false, false, false)
      `);
    }

    if (!(await tableExists('container_specifications'))) {
      await queryRunner.query(`
        CREATE TABLE container_specifications (
          id SERIAL PRIMARY KEY,
          iso_size_type VARCHAR(10) NOT NULL UNIQUE,
          container_type_id INTEGER REFERENCES container_types(id),
          size_feet INTEGER NOT NULL,
          height_category VARCHAR(20) NOT NULL,
          internal_length_mm INTEGER NOT NULL,
          internal_width_mm INTEGER NOT NULL,
          internal_height_mm INTEGER NOT NULL,
          door_width_mm INTEGER,
          door_height_mm INTEGER,
          roof_opening_length_mm INTEGER,
          roof_opening_width_mm INTEGER,
          capacity_m3 DECIMAL(6,1) NOT NULL,
          max_gross_weight_kg INTEGER NOT NULL,
          tare_weight_kg INTEGER NOT NULL,
          max_payload_kg INTEGER NOT NULL,
          temperature_min_c INTEGER,
          temperature_max_c INTEGER,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO container_specifications
          (iso_size_type, container_type_id, size_feet, height_category, internal_length_mm, internal_width_mm, internal_height_mm, door_width_mm, door_height_mm, roof_opening_length_mm, roof_opening_width_mm, capacity_m3, max_gross_weight_kg, tare_weight_kg, max_payload_kg, temperature_min_c, temperature_max_c, notes)
        VALUES
          ('22G1', (SELECT id FROM container_types WHERE type_code = 'GP'), 20, 'Standard 8''6"', 5898, 2352, 2393, 2340, 2280, NULL, NULL, 33.2, 30480, 2230, 28250, NULL, NULL, '20'' Standard General Purpose'),
          ('42G1', (SELECT id FROM container_types WHERE type_code = 'GP'), 40, 'Standard 8''6"', 12032, 2352, 2393, 2340, 2280, NULL, NULL, 67.7, 30480, 3740, 26740, NULL, NULL, '40'' Standard General Purpose'),
          ('45G1', (SELECT id FROM container_types WHERE type_code = 'HC'), 40, 'High Cube 9''6"', 12032, 2352, 2698, 2340, 2585, NULL, NULL, 76.4, 30480, 3940, 26540, NULL, NULL, '40'' High Cube General Purpose'),
          ('L5G1', (SELECT id FROM container_types WHERE type_code = 'HC'), 45, 'High Cube 9''6"', 13556, 2352, 2698, 2340, 2585, NULL, NULL, 86.1, 30480, 4590, 25890, NULL, NULL, '45'' High Cube General Purpose'),
          ('22U1-HT', (SELECT id FROM container_types WHERE type_code = 'HT'), 20, 'Standard 8''6"', 5888, 2345, 2381, 2335, 2263, 5445, 2199, 32.9, 30480, 2630, 27850, NULL, NULL, '20'' Hard Top Container'),
          ('42U1-HT', (SELECT id FROM container_types WHERE type_code = 'HT'), 40, 'High Cube 9''6"', 12022, 2345, 2686, 2335, 2568, 11585, 2195, 75.8, 30480, 4350, 26130, NULL, NULL, '40'' Hard Top High Cube'),
          ('22U1-OT', (SELECT id FROM container_types WHERE type_code = 'OT'), 20, 'Standard 8''6"', 5893, 2346, 2385, 2338, 2274, 5493, 2184, 32.9, 30480, 2330, 28150, NULL, NULL, '20'' Open Top Container'),
          ('42U1-OT', (SELECT id FROM container_types WHERE type_code = 'OT'), 40, 'Standard 8''6"', 12024, 2346, 2385, 2338, 2274, 11584, 2184, 67.3, 30480, 3900, 26580, NULL, NULL, '40'' Open Top Container'),
          ('22P1', (SELECT id FROM container_types WHERE type_code = 'FR'), 20, 'Standard 8''6"', 5620, 2200, 2233, NULL, NULL, NULL, NULL, 27.6, 30480, 2740, 27740, NULL, NULL, '20'' Flat Rack Collapsible'),
          ('42P1', (SELECT id FROM container_types WHERE type_code = 'FR'), 40, 'Standard 8''6"', 11784, 2200, 2014, NULL, NULL, NULL, NULL, 52.2, 40000, 5200, 34800, NULL, NULL, '40'' Flat Rack Collapsible'),
          ('45P8', (SELECT id FROM container_types WHERE type_code = 'FR'), 40, 'High Cube 9''6"', 12064, 2374, 2100, NULL, NULL, NULL, NULL, 60.2, 50000, 6560, 43440, NULL, NULL, '40'' High Cube Flat Rack'),
          ('22P0', (SELECT id FROM container_types WHERE type_code = 'PL'), 20, 'Platform', 6058, 2438, 0, NULL, NULL, NULL, NULL, 0.0, 30480, 2460, 28020, NULL, NULL, '20'' Platform / Flat Bed'),
          ('42P0', (SELECT id FROM container_types WHERE type_code = 'PL'), 40, 'Platform', 12192, 2438, 0, NULL, NULL, NULL, NULL, 0.0, 40000, 5100, 34900, NULL, NULL, '40'' Platform / Flat Bed'),
          ('22V2', (SELECT id FROM container_types WHERE type_code = 'VE'), 20, 'Standard 8''6"', 5898, 2352, 2385, 2340, 2274, NULL, NULL, 33.1, 30480, 2330, 28150, NULL, NULL, '20'' Ventilated Container'),
          ('22R1', (SELECT id FROM container_types WHERE type_code = 'RF'), 20, 'Standard 8''6"', 5455, 2294, 2263, 2294, 2215, NULL, NULL, 28.3, 30480, 3080, 27400, -35, 30, '20'' Refrigerated Container'),
          ('45R1', (SELECT id FROM container_types WHERE type_code = 'RF'), 40, 'High Cube 9''6"', 11577, 2294, 2557, 2294, 2509, NULL, NULL, 67.9, 30480, 4800, 25680, -35, 30, '40'' High Cube Refrigerated'),
          ('22T1', (SELECT id FROM container_types WHERE type_code = 'TK'), 20, 'Standard 8''6"', 6058, 2438, 2438, NULL, NULL, NULL, NULL, 24.0, 36000, 4000, 32000, NULL, NULL, '20'' Tank Container (21,000-26,000 litres)')
      `);
    }

    if (!(await tableExists('container_load_limits'))) {
      await queryRunner.query(`
        CREATE TABLE container_load_limits (
          id SERIAL PRIMARY KEY,
          size_feet INTEGER NOT NULL,
          concentrated_load_tonnes_per_m DECIMAL(4,1) NOT NULL,
          max_axle_load_kg INTEGER NOT NULL,
          fork_pocket_centres_mm INTEGER NOT NULL,
          max_stack_weight_kg INTEGER,
          max_stack_height INTEGER,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO container_load_limits (size_feet, concentrated_load_tonnes_per_m, max_axle_load_kg, fork_pocket_centres_mm, max_stack_weight_kg, max_stack_height, notes)
        VALUES
          (20, 4.0, 5460, 2050, 192000, 6, '20'' containers - 4 tonnes/metre longitudinal concentrated load'),
          (40, 3.0, 5460, 2050, 192000, 6, '40'' containers - 3 tonnes/metre longitudinal concentrated load'),
          (45, 3.0, 5460, 2050, 192000, 6, '45'' containers - 3 tonnes/metre longitudinal concentrated load')
      `);
    }

    if (!(await tableExists('container_iso_codes'))) {
      await queryRunner.query(`
        CREATE TABLE container_iso_codes (
          id SERIAL PRIMARY KEY,
          position INTEGER NOT NULL,
          code VARCHAR(5) NOT NULL,
          meaning VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await queryRunner.query(`
        INSERT INTO container_iso_codes (position, code, meaning, description)
        VALUES
          (1, '2', '20 feet', 'Container length 6,058 mm'),
          (1, '4', '40 feet', 'Container length 12,192 mm'),
          (1, 'L', '45 feet', 'Container length 13,716 mm'),
          (2, '2', 'Standard 8''6"', 'Container height 2,591 mm'),
          (2, '5', 'High Cube 9''6"', 'Container height 2,896 mm (40'' HC)'),
          (2, '9', 'High Cube 9''6"', 'Container height 2,896 mm (45'' HC)'),
          (3, 'G', 'General Purpose', 'Standard dry freight container'),
          (3, 'R', 'Refrigerated', 'Temperature-controlled container'),
          (3, 'U', 'Open/Hard Top', 'Container with roof opening'),
          (3, 'P', 'Platform/Flat', 'Flat rack or platform container'),
          (3, 'T', 'Tank', 'Tank container for liquids/gases'),
          (3, 'V', 'Ventilated', 'Container with ventilation'),
          (4, '0', 'Platform', 'No end walls'),
          (4, '1', 'Standard', 'Standard subtype'),
          (4, '2', 'Ventilated', 'With passive vents'),
          (4, '8', 'Super High Cube', 'Extra height variant')
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS container_iso_codes`);
    await queryRunner.query(`DROP TABLE IF EXISTS container_load_limits`);
    await queryRunner.query(`DROP TABLE IF EXISTS container_specifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS container_types`);
  }
}
