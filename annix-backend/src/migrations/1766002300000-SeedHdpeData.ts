import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedHdpeData1766002300000 implements MigrationInterface {
  name = 'SeedHdpeData1766002300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert HDPE standards
    await queryRunner.query(`
      INSERT INTO "hdpe_standards" ("code", "name", "description", "organization", "region", "applicable_to", "display_order") VALUES
      ('ISO_4427', 'ISO 4427', 'For water supply pipes.', 'ISO', 'International', 'pipes', 1),
      ('EN_12201', 'EN 12201', 'For plastic piping systems for water supply.', 'EN', 'EU', 'pipes', 2),
      ('ASTM_F714', 'ASTM F714', 'For polyethylene plastic pipe based on outside diameter.', 'ASTM', 'US', 'pipes', 3),
      ('AWWA_C906', 'AWWA C906', 'For polyethylene pressure pipe and fittings, 4 in. through 65 in.', 'AWWA', 'US', 'pipes,fittings', 4),
      ('ASTM_D3350', 'ASTM D3350', 'Cell classification PE4710 for high-performance HDPE.', 'ASTM', 'US', 'both', 5)
    `);

    // Insert fitting types
    await queryRunner.query(`
      INSERT INTO "hdpe_fitting_types" ("code", "name", "description", "num_buttwelds", "is_molded", "is_fabricated", "category", "display_order") VALUES
      ('straight_pipe', 'Straight Pipe', 'Straight lengths, weight = length * weight_per_m', 0, false, false, 'pipe', 1),
      ('molded_90_elbow', 'Molded 90° Elbow', 'Molded, no welds', 0, true, false, 'elbow', 2),
      ('fab_90_elbow_3seg', 'Fabricated 90° Elbow (3 Segments)', 'Fabricated 3 segments, 2 welds', 2, false, true, 'elbow', 3),
      ('fab_90_elbow_5seg', 'Fabricated 90° Elbow (5 Segments)', 'Fabricated 5 segments, 4 welds', 4, false, true, 'elbow', 4),
      ('fab_45_elbow_2seg', 'Fabricated 45° Elbow (2 Segments)', 'Fabricated 2 segments, 1 weld', 1, false, true, 'elbow', 5),
      ('fab_45_elbow_3seg', 'Fabricated 45° Elbow (3 Segments)', 'Fabricated 3 segments, 2 welds', 2, false, true, 'elbow', 6),
      ('molded_tee', 'Molded Tee', 'Molded tee', 0, true, false, 'tee', 7),
      ('fab_tee', 'Fabricated Tee', 'Fabricated tee, typically 1 weld for branch', 1, false, true, 'tee', 8),
      ('reducer', 'Reducer', 'Molded or fabricated reducer, 0 welds if molded', 0, true, false, 'reducer', 9),
      ('fab_reducer', 'Fabricated Reducer', 'Fabricated reducer, 1 weld', 1, false, true, 'reducer', 10),
      ('end_cap', 'End Cap', 'End cap, no welds', 0, true, false, 'cap', 11),
      ('stub_end', 'Stub End', 'Stub for flange, no welds', 0, true, false, 'stub', 12)
    `);

    // Insert fitting weights for molded_90_elbow
    await queryRunner.query(`
      INSERT INTO "hdpe_fitting_weights" ("fitting_type_id", "nominal_bore", "weight_kg") VALUES
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 20, 0.1),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 25, 0.15),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 32, 0.2),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 40, 0.3),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 50, 0.4),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 63, 0.6),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 75, 0.8),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 90, 1.2),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 110, 1.8),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 125, 2.3),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 140, 2.9),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 160, 3.8),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 180, 4.8),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 200, 6.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 225, 7.6),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 250, 9.4),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 280, 11.8),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 315, 15.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 355, 19.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 400, 24.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 450, 30.5),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 500, 37.6),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 560, 47.2),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 630, 59.8),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 710, 76.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 800, 96.5),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 900, 122.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 1000, 150.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'molded_90_elbow'), 1200, 216.0)
    `);

    // Insert fitting weights for fab_90_elbow_3seg (1.5x molded weight)
    await queryRunner.query(`
      INSERT INTO "hdpe_fitting_weights" ("fitting_type_id", "nominal_bore", "weight_kg") VALUES
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 20, 0.15),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 25, 0.2),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 32, 0.3),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 40, 0.45),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 50, 0.6),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 63, 0.9),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 75, 1.2),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 90, 1.8),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 110, 2.7),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 125, 3.5),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 140, 4.4),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 160, 5.7),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 180, 7.2),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 200, 9.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 225, 11.4),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 250, 14.1),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 280, 17.7),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 315, 22.5),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 355, 28.5),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 400, 36.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 450, 45.8),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 500, 56.4),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 560, 70.8),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 630, 89.7),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 710, 114.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 800, 144.8),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 900, 183.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 1000, 225.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'fab_90_elbow_3seg'), 1200, 324.0)
    `);

    // Insert fitting weights for stub_end (0.5x molded weight)
    await queryRunner.query(`
      INSERT INTO "hdpe_fitting_weights" ("fitting_type_id", "nominal_bore", "weight_kg") VALUES
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 20, 0.05),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 25, 0.07),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 32, 0.1),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 40, 0.15),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 50, 0.2),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 63, 0.3),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 75, 0.4),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 90, 0.6),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 110, 0.9),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 125, 1.15),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 140, 1.45),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 160, 1.9),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 180, 2.4),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 200, 3.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 225, 3.8),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 250, 4.7),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 280, 5.9),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 315, 7.5),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 355, 9.5),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 400, 12.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 450, 15.3),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 500, 18.8),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 560, 23.6),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 630, 29.9),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 710, 38.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 800, 48.3),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 900, 61.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 1000, 75.0),
      ((SELECT id FROM hdpe_fitting_types WHERE code = 'stub_end'), 1200, 108.0)
    `);

    // Continue in next part...
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete all seed data
    await queryRunner.query(`DELETE FROM "hdpe_fitting_weights"`);
    await queryRunner.query(`DELETE FROM "hdpe_fitting_types"`);
    await queryRunner.query(`DELETE FROM "hdpe_standards"`);
  }
}
