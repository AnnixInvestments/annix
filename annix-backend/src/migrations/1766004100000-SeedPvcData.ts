import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPvcData1766004100000 implements MigrationInterface {
  name = 'SeedPvcData1766004100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert PVC standards
    await queryRunner.query(`
      INSERT INTO pvc_standards (name, code, description, pvc_type, region, application, display_order) VALUES
      ('EN 1452', 'EN_1452', 'Plastics piping systems for water supply - Unplasticized poly(vinyl chloride) (PVC-U)', 'PVC-U', 'EU', 'Potable water supply', 1),
      ('ISO 1452', 'ISO_1452', 'Plastics piping systems for water supply and for buried and above-ground drainage and sewerage under pressure - Unplasticized poly(vinyl chloride) (PVC-U)', 'PVC-U', 'International', 'Water supply, drainage, sewerage', 2),
      ('SABS 966', 'SABS_966', 'South African standard for uPVC pressure pipes', 'PVC-U', 'South Africa', 'Pressure piping', 3),
      ('ASTM D1785', 'ASTM_D1785', 'Standard Specification for Poly(Vinyl Chloride) (PVC) Plastic Pipe, Schedules 40, 80, and 120', 'PVC-U', 'USA', 'Industrial and plumbing', 4),
      ('ASTM F441', 'ASTM_F441', 'Standard Specification for Chlorinated Poly(Vinyl Chloride) (CPVC) Plastic Pipe', 'CPVC', 'USA', 'Hot water, industrial', 5),
      ('ISO 16422', 'ISO_16422', 'Pipes and joints made of oriented unplasticized poly(vinyl chloride) (PVC-O) for the conveyance of water under pressure', 'PVC-O', 'International', 'High pressure water supply', 6)
    `);

    // Insert PVC fitting types
    await queryRunner.query(`
      INSERT INTO pvc_fitting_types (name, code, description, num_joints, is_socket, is_flanged, is_threaded, category, angle_degrees, display_order) VALUES
      ('90° Elbow', 'elbow_90', 'Socket-weld 90 degree elbow', 2, true, false, false, 'elbow', 90, 1),
      ('45° Elbow', 'elbow_45', 'Socket-weld 45 degree elbow', 2, true, false, false, 'elbow', 45, 2),
      ('Equal Tee', 'tee_equal', 'Socket-weld equal tee', 3, true, false, false, 'tee', NULL, 3),
      ('Reducing Tee', 'tee_reducing', 'Socket-weld reducing tee', 3, true, false, false, 'tee', NULL, 4),
      ('Coupling', 'coupling', 'Socket coupling for joining two pipes', 2, true, false, false, 'coupling', NULL, 5),
      ('Reducer', 'reducer', 'Concentric reducer', 2, true, false, false, 'reducer', NULL, 6),
      ('End Cap', 'end_cap', 'Socket end cap', 1, true, false, false, 'cap', NULL, 7),
      ('Union', 'union', 'Union for easy disconnection', 2, true, false, false, 'union', NULL, 8),
      ('Flange Adapter', 'flange_adapter', 'Socket x flange adapter', 1, true, true, false, 'flange', NULL, 9),
      ('Threaded Adapter (Male)', 'adapter_male', 'Socket x male thread adapter', 1, true, false, true, 'adapter', NULL, 10),
      ('Threaded Adapter (Female)', 'adapter_female', 'Socket x female thread adapter', 1, true, false, true, 'adapter', NULL, 11),
      ('Y-Junction', 'y_junction', 'Socket-weld Y junction for drainage', 3, true, false, false, 'junction', 45, 12),
      ('Cross', 'cross', 'Socket-weld cross fitting', 4, true, false, false, 'cross', NULL, 13),
      ('Ball Valve', 'ball_valve', 'PVC ball valve with socket ends', 2, true, false, false, 'valve', NULL, 14),
      ('Gate Valve', 'gate_valve', 'PVC gate valve with socket ends', 2, true, false, false, 'valve', NULL, 15),
      ('Check Valve', 'check_valve', 'PVC check valve (non-return)', 2, true, false, false, 'valve', NULL, 16),
      ('Saddle Clamp', 'saddle_clamp', 'Saddle clamp for branch connections', 1, true, false, false, 'saddle', NULL, 17),
      ('Repair Coupling', 'repair_coupling', 'Slip-on repair coupling', 2, true, false, false, 'repair', NULL, 18)
    `);

    // Insert cement prices (default pricing)
    await queryRunner.query(`
      INSERT INTO pvc_cement_prices (nominal_diameter, price_per_joint, cement_volume_ml) VALUES
      (20, 2.50, 5),
      (25, 3.00, 8),
      (32, 3.50, 12),
      (40, 4.00, 18),
      (50, 5.00, 25),
      (63, 6.00, 35),
      (75, 7.50, 50),
      (90, 9.00, 70),
      (110, 12.00, 100),
      (125, 15.00, 130),
      (140, 18.00, 160),
      (160, 22.00, 200),
      (180, 28.00, 250),
      (200, 35.00, 300),
      (225, 45.00, 380),
      (250, 55.00, 470),
      (280, 70.00, 590),
      (315, 90.00, 750),
      (355, 115.00, 950),
      (400, 145.00, 1200)
    `);

    // Insert sample fitting weights for common sizes (DN 20-110, PN 10)
    // These are approximate weights - actual weights should come from manufacturer catalogs
    await queryRunner.query(`
      INSERT INTO pvc_fitting_weights (fitting_type_id, nominal_diameter, pressure_rating, weight_kg) VALUES
      -- 90° Elbows (fitting_type_id = 1)
      (1, 20, 10, 0.015),
      (1, 25, 10, 0.020),
      (1, 32, 10, 0.035),
      (1, 40, 10, 0.055),
      (1, 50, 10, 0.085),
      (1, 63, 10, 0.140),
      (1, 75, 10, 0.200),
      (1, 90, 10, 0.320),
      (1, 110, 10, 0.480),
      -- 45° Elbows (fitting_type_id = 2)
      (2, 20, 10, 0.012),
      (2, 25, 10, 0.016),
      (2, 32, 10, 0.028),
      (2, 40, 10, 0.044),
      (2, 50, 10, 0.068),
      (2, 63, 10, 0.112),
      (2, 75, 10, 0.160),
      (2, 90, 10, 0.256),
      (2, 110, 10, 0.384),
      -- Equal Tees (fitting_type_id = 3)
      (3, 20, 10, 0.022),
      (3, 25, 10, 0.030),
      (3, 32, 10, 0.052),
      (3, 40, 10, 0.082),
      (3, 50, 10, 0.128),
      (3, 63, 10, 0.210),
      (3, 75, 10, 0.300),
      (3, 90, 10, 0.480),
      (3, 110, 10, 0.720),
      -- Couplings (fitting_type_id = 5)
      (5, 20, 10, 0.010),
      (5, 25, 10, 0.014),
      (5, 32, 10, 0.024),
      (5, 40, 10, 0.038),
      (5, 50, 10, 0.058),
      (5, 63, 10, 0.096),
      (5, 75, 10, 0.137),
      (5, 90, 10, 0.220),
      (5, 110, 10, 0.330),
      -- End Caps (fitting_type_id = 7)
      (7, 20, 10, 0.008),
      (7, 25, 10, 0.011),
      (7, 32, 10, 0.019),
      (7, 40, 10, 0.030),
      (7, 50, 10, 0.046),
      (7, 63, 10, 0.076),
      (7, 75, 10, 0.109),
      (7, 90, 10, 0.175),
      (7, 110, 10, 0.262)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM pvc_fitting_weights');
    await queryRunner.query('DELETE FROM pvc_cement_prices');
    await queryRunner.query('DELETE FROM pvc_fitting_types');
    await queryRunner.query('DELETE FROM pvc_standards');
  }
}
