import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPipeSteelWorkConfiguration1773500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pipe_steel_work_config (
        id SERIAL PRIMARY KEY,
        config_key VARCHAR(100) NOT NULL UNIQUE,
        config_value VARCHAR(255) NOT NULL,
        value_type VARCHAR(20) DEFAULT 'string',
        description TEXT,
        category VARCHAR(50),
        unit VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const configValues = [
      {
        key: 'STEEL_DENSITY_KG_M3',
        value: '7850',
        type: 'number',
        desc: 'Density of carbon steel',
        cat: 'material',
        unit: 'kg/m³',
      },
      {
        key: 'STEEL_PRICE_PER_KG',
        value: '25',
        type: 'number',
        desc: 'Base steel price per kilogram',
        cat: 'pricing',
        unit: 'ZAR/kg',
      },
      {
        key: 'FABRICATION_FACTOR',
        value: '2.5',
        type: 'number',
        desc: 'Fabrication cost multiplier',
        cat: 'pricing',
        unit: 'x',
      },
      {
        key: 'CLEVIS_HANGER_BASE_COST',
        value: '150',
        type: 'number',
        desc: 'Clevis hanger base unit cost',
        cat: 'bracket_cost',
        unit: 'ZAR',
      },
      {
        key: 'THREE_BOLT_CLAMP_BASE_COST',
        value: '250',
        type: 'number',
        desc: 'Three-bolt clamp base unit cost',
        cat: 'bracket_cost',
        unit: 'ZAR',
      },
      {
        key: 'WELDED_BRACKET_BASE_COST',
        value: '180',
        type: 'number',
        desc: 'Welded bracket base unit cost',
        cat: 'bracket_cost',
        unit: 'ZAR',
      },
      {
        key: 'PIPE_SADDLE_BASE_COST',
        value: '280',
        type: 'number',
        desc: 'Pipe saddle base unit cost',
        cat: 'bracket_cost',
        unit: 'ZAR',
      },
      {
        key: 'U_BOLT_BASE_COST',
        value: '80',
        type: 'number',
        desc: 'U-bolt clamp base unit cost',
        cat: 'bracket_cost',
        unit: 'ZAR',
      },
      {
        key: 'BAND_HANGER_BASE_COST',
        value: '120',
        type: 'number',
        desc: 'Band hanger base unit cost',
        cat: 'bracket_cost',
        unit: 'ZAR',
      },
      {
        key: 'ROLLER_SUPPORT_BASE_COST',
        value: '450',
        type: 'number',
        desc: 'Roller support base unit cost',
        cat: 'bracket_cost',
        unit: 'ZAR',
      },
      {
        key: 'SLIDE_PLATE_BASE_COST',
        value: '350',
        type: 'number',
        desc: 'Slide plate base unit cost',
        cat: 'bracket_cost',
        unit: 'ZAR',
      },
      {
        key: 'SPRING_HANGER_BASE_COST',
        value: '650',
        type: 'number',
        desc: 'Spring hanger base unit cost',
        cat: 'bracket_cost',
        unit: 'ZAR',
      },
      {
        key: 'RISER_CLAMP_BASE_COST',
        value: '200',
        type: 'number',
        desc: 'Riser clamp base unit cost',
        cat: 'bracket_cost',
        unit: 'ZAR',
      },
      {
        key: 'CONSTANT_SUPPORT_BASE_COST',
        value: '850',
        type: 'number',
        desc: 'Constant support hanger base unit cost',
        cat: 'bracket_cost',
        unit: 'ZAR',
      },
      {
        key: 'CORROSION_ALLOWANCE_MM',
        value: '1.6',
        type: 'number',
        desc: 'Default corrosion allowance for reinforcement pad calcs',
        cat: 'calculation',
        unit: 'mm',
      },
      {
        key: 'PAD_MAX_THICKNESS_MM',
        value: '19',
        type: 'number',
        desc: 'Maximum reinforcement pad thickness',
        cat: 'calculation',
        unit: 'mm',
      },
      {
        key: 'LOAD_SAFETY_FACTOR',
        value: '1.25',
        type: 'number',
        desc: 'Safety factor for load calculations',
        cat: 'calculation',
        unit: 'x',
      },
      {
        key: 'HIGH_LOAD_UTILIZATION_THRESHOLD',
        value: '80',
        type: 'number',
        desc: 'Threshold percentage for high load warning',
        cat: 'validation',
        unit: '%',
      },
    ];

    for (const cfg of configValues) {
      await queryRunner.query(
        `
        INSERT INTO pipe_steel_work_config (config_key, config_value, value_type, description, category, unit)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (config_key) DO UPDATE SET
          config_value = EXCLUDED.config_value,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          unit = EXCLUDED.unit,
          updated_at = CURRENT_TIMESTAMP
      `,
        [cfg.key, cfg.value, cfg.type, cfg.desc, cfg.cat, cfg.unit],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS pipe_steel_work_config`);
  }
}
