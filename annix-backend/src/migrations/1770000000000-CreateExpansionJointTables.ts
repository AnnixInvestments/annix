import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExpansionJointTables1770000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE expansion_joint_type AS ENUM (
        'bought_in_bellows',
        'fabricated_loop'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE bellows_joint_type AS ENUM (
        'axial',
        'universal',
        'hinged',
        'gimbal',
        'tied_universal'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE bellows_material AS ENUM (
        'stainless_steel_304',
        'stainless_steel_316',
        'rubber_epdm',
        'rubber_neoprene',
        'ptfe',
        'fabric_reinforced'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE fabricated_loop_type AS ENUM (
        'full_loop',
        'horseshoe_lyre',
        'z_offset',
        'l_offset'
      )
    `);

    await queryRunner.query(`
      ALTER TYPE rfq_items_item_type_enum ADD VALUE IF NOT EXISTS 'expansion_joint'
    `);

    await queryRunner.query(`
      CREATE TABLE expansion_joint_rfqs (
        id SERIAL PRIMARY KEY,
        expansion_joint_type expansion_joint_type NOT NULL,
        nominal_diameter_mm DECIMAL(10,2) NOT NULL,
        schedule_number VARCHAR(50),
        wall_thickness_mm DECIMAL(10,2),
        outside_diameter_mm DECIMAL(10,2),
        quantity_value DECIMAL(10,2) DEFAULT 1,

        -- Bought-in bellows fields
        bellows_joint_type bellows_joint_type,
        bellows_material bellows_material,
        axial_movement_mm DECIMAL(10,2),
        lateral_movement_mm DECIMAL(10,2),
        angular_movement_deg DECIMAL(10,2),
        supplier_reference VARCHAR(255),
        catalog_number VARCHAR(255),
        unit_cost_from_supplier DECIMAL(12,2),
        markup_percentage DECIMAL(5,2) DEFAULT 15.0,

        -- Fabricated loop fields
        loop_type fabricated_loop_type,
        loop_height_mm DECIMAL(10,2),
        loop_width_mm DECIMAL(10,2),
        pipe_length_total_mm DECIMAL(10,2),
        number_of_elbows INT,
        end_configuration VARCHAR(50),

        -- Calculated fields (both types)
        total_weight_kg DECIMAL(10,3),
        pipe_weight_kg DECIMAL(10,3),
        elbow_weight_kg DECIMAL(10,3),
        flange_weight_kg DECIMAL(10,3),

        -- Weld calculations (fabricated only)
        number_of_butt_welds INT,
        total_butt_weld_length_m DECIMAL(10,3),
        number_of_flange_welds INT,
        flange_weld_length_m DECIMAL(10,3),

        -- Pricing
        unit_cost DECIMAL(12,2),
        total_cost DECIMAL(12,2),

        -- Metadata
        notes TEXT,
        calculation_data JSONB,
        rfq_item_id INT REFERENCES rfq_items(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS expansion_joint_rfqs`);
    await queryRunner.query(`DROP TYPE IF EXISTS fabricated_loop_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS bellows_material`);
    await queryRunner.query(`DROP TYPE IF EXISTS bellows_joint_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS expansion_joint_type`);
  }
}
