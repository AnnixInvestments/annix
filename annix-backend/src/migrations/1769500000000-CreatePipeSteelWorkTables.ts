import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePipeSteelWorkTables1769500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE pipe_steel_work_type AS ENUM (
        'pipe_support',
        'reinforcement_pad',
        'saddle_support',
        'shoe_support'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE bracket_type AS ENUM (
        'clevis_hanger',
        'three_bolt_clamp',
        'welded_bracket',
        'pipe_saddle',
        'u_bolt',
        'band_hanger',
        'roller_support',
        'slide_plate'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE support_standard AS ENUM (
        'MSS_SP_58',
        'ASME_B31_3',
        'SANS_10160'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE pipe_support_spacing (
        id SERIAL PRIMARY KEY,
        nb_mm INT NOT NULL,
        nps VARCHAR(10) NOT NULL,
        schedule VARCHAR(20) NOT NULL,
        water_filled_span_m DECIMAL(5,2) NOT NULL,
        vapor_gas_span_m DECIMAL(5,2) NOT NULL,
        rod_size_mm INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE bracket_types (
        id SERIAL PRIMARY KEY,
        type_code VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        min_nb_mm INT NOT NULL,
        max_nb_mm INT NOT NULL,
        weight_factor DECIMAL(8,4) DEFAULT 1.0,
        base_cost_per_unit DECIMAL(10,2),
        insulated_suitable BOOLEAN DEFAULT FALSE,
        allows_expansion BOOLEAN DEFAULT FALSE,
        is_anchor_type BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      ALTER TYPE rfq_items_item_type_enum ADD VALUE IF NOT EXISTS 'pipe_steel_work'
    `);

    await queryRunner.query(`
      CREATE TABLE pipe_steel_work_rfqs (
        id SERIAL PRIMARY KEY,
        work_type pipe_steel_work_type NOT NULL,
        nominal_diameter_mm DECIMAL(10,2) NOT NULL,
        outside_diameter_mm DECIMAL(10,2),
        wall_thickness_mm DECIMAL(10,2),
        schedule_number VARCHAR(50),
        bracket_type bracket_type,
        support_standard support_standard DEFAULT 'MSS_SP_58',
        support_spacing_m DECIMAL(10,2),
        pipeline_length_m DECIMAL(10,2),
        number_of_supports INT,
        working_pressure_bar DECIMAL(10,2),
        working_temperature_c DECIMAL(10,2),
        branch_diameter_mm DECIMAL(10,2),
        header_diameter_mm DECIMAL(10,2),
        pad_outer_diameter_mm DECIMAL(10,2),
        pad_thickness_mm DECIMAL(10,2),
        steel_specification_id INT,
        quantity_value DECIMAL(10,2) DEFAULT 1,
        quantity_type VARCHAR(50) DEFAULT 'number_of_items',
        weight_per_unit_kg DECIMAL(10,3),
        total_weight_kg DECIMAL(10,3),
        unit_cost DECIMAL(12,2),
        total_cost DECIMAL(12,2),
        notes TEXT,
        calculation_data JSONB,
        rfq_item_id INT REFERENCES rfq_items(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.seedSupportSpacingData(queryRunner);
    await this.seedBracketTypeData(queryRunner);
  }

  private async seedSupportSpacingData(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const spacingData = [
      { nb: 15, nps: '1/2"', water: 2.1, vapor: 2.7, rod: 10 },
      { nb: 20, nps: '3/4"', water: 2.4, vapor: 3.0, rod: 10 },
      { nb: 25, nps: '1"', water: 2.7, vapor: 3.4, rod: 10 },
      { nb: 32, nps: '1-1/4"', water: 3.0, vapor: 3.7, rod: 10 },
      { nb: 40, nps: '1-1/2"', water: 3.0, vapor: 3.7, rod: 10 },
      { nb: 50, nps: '2"', water: 3.4, vapor: 4.3, rod: 10 },
      { nb: 65, nps: '2-1/2"', water: 3.7, vapor: 4.6, rod: 10 },
      { nb: 80, nps: '3"', water: 3.7, vapor: 4.6, rod: 10 },
      { nb: 100, nps: '4"', water: 4.3, vapor: 5.2, rod: 12 },
      { nb: 125, nps: '5"', water: 4.6, vapor: 5.5, rod: 12 },
      { nb: 150, nps: '6"', water: 4.9, vapor: 5.8, rod: 16 },
      { nb: 200, nps: '8"', water: 5.2, vapor: 6.4, rod: 16 },
      { nb: 250, nps: '10"', water: 5.8, vapor: 7.0, rod: 20 },
      { nb: 300, nps: '12"', water: 6.4, vapor: 7.6, rod: 20 },
      { nb: 350, nps: '14"', water: 6.7, vapor: 7.9, rod: 24 },
      { nb: 400, nps: '16"', water: 7.0, vapor: 8.2, rod: 24 },
      { nb: 450, nps: '18"', water: 7.3, vapor: 8.5, rod: 24 },
      { nb: 500, nps: '20"', water: 7.6, vapor: 8.8, rod: 30 },
      { nb: 600, nps: '24"', water: 7.9, vapor: 9.1, rod: 30 },
      { nb: 750, nps: '30"', water: 8.5, vapor: 9.8, rod: 36 },
      { nb: 900, nps: '36"', water: 9.1, vapor: 10.4, rod: 36 },
    ];

    for (const data of spacingData) {
      await queryRunner.query(`
        INSERT INTO pipe_support_spacing (nb_mm, nps, schedule, water_filled_span_m, vapor_gas_span_m, rod_size_mm)
        VALUES (${data.nb}, '${data.nps}', 'Std', ${data.water}, ${data.vapor}, ${data.rod})
      `);
    }
  }

  private async seedBracketTypeData(queryRunner: QueryRunner): Promise<void> {
    const bracketData = [
      {
        typeCode: 'CLEVIS_HANGER',
        displayName: 'Clevis Hanger',
        description: 'For suspended pipelines, allows slight movement',
        minNb: 15,
        maxNb: 600,
        weightFactor: 0.8,
        baseCost: 150,
        insulatedSuitable: false,
        allowsExpansion: true,
        isAnchorType: false,
      },
      {
        typeCode: 'THREE_BOLT_CLAMP',
        displayName: 'Three-Bolt Pipe Clamp',
        description: 'Heavy-duty support for larger pipes',
        minNb: 100,
        maxNb: 900,
        weightFactor: 1.5,
        baseCost: 250,
        insulatedSuitable: true,
        allowsExpansion: false,
        isAnchorType: false,
      },
      {
        typeCode: 'WELDED_BRACKET',
        displayName: 'Welded Bracket',
        description: 'Fixed support welded to structure',
        minNb: 15,
        maxNb: 900,
        weightFactor: 2.0,
        baseCost: 180,
        insulatedSuitable: false,
        allowsExpansion: false,
        isAnchorType: true,
      },
      {
        typeCode: 'PIPE_SADDLE',
        displayName: 'Pipe Saddle',
        description: 'Base-mounted support with curved cradle',
        minNb: 150,
        maxNb: 900,
        weightFactor: 2.5,
        baseCost: 280,
        insulatedSuitable: true,
        allowsExpansion: true,
        isAnchorType: false,
      },
      {
        typeCode: 'U_BOLT',
        displayName: 'U-Bolt Clamp',
        description: 'Simple, economical support for smaller pipes',
        minNb: 15,
        maxNb: 150,
        weightFactor: 0.5,
        baseCost: 80,
        insulatedSuitable: false,
        allowsExpansion: false,
        isAnchorType: false,
      },
      {
        typeCode: 'ROLLER_SUPPORT',
        displayName: 'Roller Support',
        description: 'Allows axial thermal expansion movement',
        minNb: 50,
        maxNb: 900,
        weightFactor: 3.0,
        baseCost: 450,
        insulatedSuitable: true,
        allowsExpansion: true,
        isAnchorType: false,
      },
      {
        typeCode: 'SLIDE_PLATE',
        displayName: 'Slide Plate',
        description: 'Low-friction support for thermal expansion',
        minNb: 200,
        maxNb: 900,
        weightFactor: 2.5,
        baseCost: 350,
        insulatedSuitable: true,
        allowsExpansion: true,
        isAnchorType: false,
      },
    ];

    for (const data of bracketData) {
      await queryRunner.query(`
        INSERT INTO bracket_types (
          type_code, display_name, description, min_nb_mm, max_nb_mm,
          weight_factor, base_cost_per_unit, insulated_suitable, allows_expansion, is_anchor_type
        )
        VALUES (
          '${data.typeCode}', '${data.displayName}', '${data.description}',
          ${data.minNb}, ${data.maxNb}, ${data.weightFactor}, ${data.baseCost},
          ${data.insulatedSuitable}, ${data.allowsExpansion}, ${data.isAnchorType}
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS pipe_steel_work_rfqs`);
    await queryRunner.query(`DROP TABLE IF EXISTS bracket_types`);
    await queryRunner.query(`DROP TABLE IF EXISTS pipe_support_spacing`);
    await queryRunner.query(`DROP TYPE IF EXISTS support_standard`);
    await queryRunner.query(`DROP TYPE IF EXISTS bracket_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS pipe_steel_work_type`);
  }
}
