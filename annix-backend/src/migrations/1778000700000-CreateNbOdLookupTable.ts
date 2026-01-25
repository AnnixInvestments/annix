import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNbOdLookupTable1778000700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE nb_od_lookup (
        id SERIAL PRIMARY KEY,
        nominal_bore_mm INTEGER NOT NULL UNIQUE,
        outside_diameter_mm DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_nb_od_lookup_nb
      ON nb_od_lookup(nominal_bore_mm)
    `);

    await queryRunner.query(`
      INSERT INTO nb_od_lookup (nominal_bore_mm, outside_diameter_mm)
      VALUES
      (15, 21.3), (20, 26.7), (25, 33.4), (32, 42.2), (40, 48.3), (50, 60.3), (65, 73.0), (80, 88.9),
      (100, 114.3), (125, 139.7), (150, 168.3), (200, 219.1), (250, 273.0), (300, 323.9),
      (350, 355.6), (400, 406.4), (450, 457.2), (500, 508.0), (600, 609.6), (700, 711.2),
      (750, 762.0), (800, 812.8), (900, 914.4), (1000, 1016.0), (1050, 1066.8), (1200, 1219.2),
      (1400, 1422.4), (1500, 1524.0), (1600, 1625.6), (1800, 1828.8), (2000, 2032.0),
      (2200, 2235.2), (2400, 2438.4), (2500, 2540.0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS nb_od_lookup`);
  }
}
