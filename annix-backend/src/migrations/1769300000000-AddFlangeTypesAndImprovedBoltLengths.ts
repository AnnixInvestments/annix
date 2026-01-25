import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlangeTypesAndImprovedBoltLengths1769300000000 implements MigrationInterface {
  name = 'AddFlangeTypesAndImprovedBoltLengths1769300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create flange_types table with ASME/industry standard codes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "flange_types" (
        "id" SERIAL PRIMARY KEY,
        "code" VARCHAR(10) NOT NULL UNIQUE,
        "name" VARCHAR(50) NOT NULL,
        "abbreviation" VARCHAR(10) NOT NULL,
        "description" VARCHAR(255),
        "standard_reference" VARCHAR(100)
      )
    `);

    // Insert flange type codes per ASME B16.5 and industry standard
    await queryRunner.query(`
      INSERT INTO "flange_types" ("code", "name", "abbreviation", "description", "standard_reference")
      VALUES
        ('/1', 'Weld Neck', 'WN', 'Long tapered hub for butt welding to pipe. Best stress distribution.', 'ASME B16.5'),
        ('/2', 'Threaded', 'TH', 'Internal threads for threaded pipe connection. No welding required.', 'ASME B16.5'),
        ('/3', 'Slip-On', 'SO', 'Slides over pipe end and is fillet welded inside and outside.', 'ASME B16.5'),
        ('/4', 'Lap Joint', 'LJ', 'Used with stub end for easy alignment and bolt-up. Allows rotation.', 'ASME B16.5'),
        ('/5', 'Socket Weld', 'SW', 'Pipe inserted into socket and fillet welded. For small bore piping.', 'ASME B16.5'),
        ('/6', 'Blind', 'BL', 'Solid flange used to blank off piping, valves, or vessels.', 'ASME B16.5'),
        ('/7', 'Orifice', 'OR', 'Used with orifice plates for flow measurement.', 'ASME B16.36'),
        ('/8', 'Spectacle Blind', 'SB', 'Figure-8 plate for isolation. Rotates between open/closed positions.', 'ASME B16.48'),
        ('/9', 'Reducing', 'RF', 'Connects pipes of different sizes in the same pressure class.', 'ASME B16.5')
    `);

    // Add bolt_length_bl column for blind flange bolt lengths
    await queryRunner.query(`
      ALTER TABLE "flange_bolting"
      ADD COLUMN IF NOT EXISTS "bolt_length_bl" DECIMAL(5,2)
    `);

    // Add bolt_length_rf column for rotating flange bolt lengths (if not exists)
    await queryRunner.query(`
      ALTER TABLE "flange_bolting"
      ADD COLUMN IF NOT EXISTS "bolt_length_rf" DECIMAL(5,2)
    `);

    // Get ASME B16.5 standard ID
    const standards = await queryRunner.query(`
      SELECT id FROM "flange_standards" WHERE code = 'ASME B16.5'
    `);

    if (standards.length > 0) {
      const b165Id = standards[0].id;

      // Update with accurate bolt lengths from ASME B16.5 for all flange types
      // WN (Weld Neck) bolt lengths go in bolt_length_default
      // BL (Blind) bolt lengths - same as SO/SW/TH per ASME (no raised hub)

      // Class 150 WN bolt lengths and BL lengths
      const class150Data = [
        { nps: '0.5', wnLength: 2.5, blLength: 2.25 },
        { nps: '0.75', wnLength: 2.5, blLength: 2.25 },
        { nps: '1', wnLength: 2.5, blLength: 2.25 },
        { nps: '1.25', wnLength: 2.75, blLength: 2.5 },
        { nps: '1.5', wnLength: 2.75, blLength: 2.5 },
        { nps: '2', wnLength: 3.0, blLength: 2.75 },
        { nps: '2.5', wnLength: 3.25, blLength: 3.0 },
        { nps: '3', wnLength: 3.25, blLength: 3.0 },
        { nps: '3.5', wnLength: 3.25, blLength: 3.0 },
        { nps: '4', wnLength: 3.5, blLength: 3.25 },
        { nps: '5', wnLength: 3.75, blLength: 3.5 },
        { nps: '6', wnLength: 3.75, blLength: 3.5 },
        { nps: '8', wnLength: 4.25, blLength: 4.0 },
        { nps: '10', wnLength: 4.5, blLength: 4.25 },
        { nps: '12', wnLength: 4.75, blLength: 4.5 },
        { nps: '14', wnLength: 5.25, blLength: 5.0 },
        { nps: '16', wnLength: 5.5, blLength: 5.25 },
        { nps: '18', wnLength: 5.75, blLength: 5.5 },
        { nps: '20', wnLength: 6.0, blLength: 5.75 },
        { nps: '24', wnLength: 6.5, blLength: 6.25 },
      ];

      for (const row of class150Data) {
        await queryRunner.query(`
          UPDATE "flange_bolting"
          SET "bolt_length_default" = ${row.wnLength}, "bolt_length_bl" = ${row.blLength}
          WHERE "standard_id" = ${b165Id} AND "pressure_class" = '150' AND "nps" = '${row.nps}'
        `);
      }

      // Class 300 WN and BL bolt lengths
      const class300Data = [
        { nps: '0.5', wnLength: 2.75, blLength: 2.5 },
        { nps: '0.75', wnLength: 3.0, blLength: 2.75 },
        { nps: '1', wnLength: 3.25, blLength: 3.0 },
        { nps: '1.25', wnLength: 3.25, blLength: 3.0 },
        { nps: '1.5', wnLength: 3.5, blLength: 3.25 },
        { nps: '2', wnLength: 3.75, blLength: 3.5 },
        { nps: '2.5', wnLength: 4.0, blLength: 3.75 },
        { nps: '3', wnLength: 4.25, blLength: 4.0 },
        { nps: '3.5', wnLength: 4.25, blLength: 4.0 },
        { nps: '4', wnLength: 4.5, blLength: 4.25 },
        { nps: '5', wnLength: 4.75, blLength: 4.5 },
        { nps: '6', wnLength: 5.0, blLength: 4.75 },
        { nps: '8', wnLength: 5.75, blLength: 5.5 },
        { nps: '10', wnLength: 6.25, blLength: 6.0 },
        { nps: '12', wnLength: 6.5, blLength: 6.25 },
        { nps: '14', wnLength: 7.0, blLength: 6.75 },
        { nps: '16', wnLength: 7.25, blLength: 7.0 },
        { nps: '18', wnLength: 7.75, blLength: 7.5 },
        { nps: '20', wnLength: 8.25, blLength: 8.0 },
        { nps: '24', wnLength: 9.0, blLength: 8.75 },
      ];

      for (const row of class300Data) {
        await queryRunner.query(`
          UPDATE "flange_bolting"
          SET "bolt_length_default" = ${row.wnLength}, "bolt_length_bl" = ${row.blLength}
          WHERE "standard_id" = ${b165Id} AND "pressure_class" = '300' AND "nps" = '${row.nps}'
        `);
      }

      // Class 400 WN and BL bolt lengths
      const class400Data = [
        { nps: '0.5', wnLength: 3.0, blLength: 2.75 },
        { nps: '0.75', wnLength: 3.25, blLength: 3.0 },
        { nps: '1', wnLength: 3.5, blLength: 3.25 },
        { nps: '1.25', wnLength: 3.5, blLength: 3.25 },
        { nps: '1.5', wnLength: 3.75, blLength: 3.5 },
        { nps: '2', wnLength: 4.0, blLength: 3.75 },
        { nps: '2.5', wnLength: 4.25, blLength: 4.0 },
        { nps: '3', wnLength: 4.5, blLength: 4.25 },
        { nps: '4', wnLength: 4.75, blLength: 4.5 },
        { nps: '5', wnLength: 5.25, blLength: 5.0 },
        { nps: '6', wnLength: 5.5, blLength: 5.25 },
        { nps: '8', wnLength: 6.0, blLength: 5.75 },
        { nps: '10', wnLength: 6.75, blLength: 6.5 },
        { nps: '12', wnLength: 7.25, blLength: 7.0 },
        { nps: '14', wnLength: 7.5, blLength: 7.25 },
        { nps: '16', wnLength: 8.0, blLength: 7.75 },
        { nps: '18', wnLength: 8.5, blLength: 8.25 },
        { nps: '20', wnLength: 9.0, blLength: 8.75 },
        { nps: '24', wnLength: 9.75, blLength: 9.5 },
      ];

      for (const row of class400Data) {
        await queryRunner.query(`
          UPDATE "flange_bolting"
          SET "bolt_length_default" = ${row.wnLength}, "bolt_length_bl" = ${row.blLength}
          WHERE "standard_id" = ${b165Id} AND "pressure_class" = '400' AND "nps" = '${row.nps}'
        `);
      }

      // Class 600 WN and BL bolt lengths
      const class600Data = [
        { nps: '0.5', wnLength: 3.0, blLength: 2.75 },
        { nps: '0.75', wnLength: 3.25, blLength: 3.0 },
        { nps: '1', wnLength: 3.5, blLength: 3.25 },
        { nps: '1.25', wnLength: 3.5, blLength: 3.25 },
        { nps: '1.5', wnLength: 3.75, blLength: 3.5 },
        { nps: '2', wnLength: 4.0, blLength: 3.75 },
        { nps: '2.5', wnLength: 4.25, blLength: 4.0 },
        { nps: '3', wnLength: 4.5, blLength: 4.25 },
        { nps: '4', wnLength: 4.75, blLength: 4.5 },
        { nps: '5', wnLength: 5.25, blLength: 5.0 },
        { nps: '6', wnLength: 5.5, blLength: 5.25 },
        { nps: '8', wnLength: 6.0, blLength: 5.75 },
        { nps: '10', wnLength: 6.75, blLength: 6.5 },
        { nps: '12', wnLength: 7.25, blLength: 7.0 },
        { nps: '14', wnLength: 7.75, blLength: 7.5 },
        { nps: '16', wnLength: 8.25, blLength: 8.0 },
        { nps: '18', wnLength: 8.75, blLength: 8.5 },
        { nps: '20', wnLength: 9.25, blLength: 9.0 },
        { nps: '24', wnLength: 10.25, blLength: 10.0 },
      ];

      for (const row of class600Data) {
        await queryRunner.query(`
          UPDATE "flange_bolting"
          SET "bolt_length_default" = ${row.wnLength}, "bolt_length_bl" = ${row.blLength}
          WHERE "standard_id" = ${b165Id} AND "pressure_class" = '600' AND "nps" = '${row.nps}'
        `);
      }

      // Class 900 WN and BL bolt lengths
      const class900Data = [
        { nps: '0.5', wnLength: 3.5, blLength: 3.25 },
        { nps: '0.75', wnLength: 3.75, blLength: 3.5 },
        { nps: '1', wnLength: 4.0, blLength: 3.75 },
        { nps: '1.5', wnLength: 4.5, blLength: 4.25 },
        { nps: '2', wnLength: 4.75, blLength: 4.5 },
        { nps: '3', wnLength: 5.5, blLength: 5.25 },
        { nps: '4', wnLength: 6.0, blLength: 5.75 },
        { nps: '6', wnLength: 6.75, blLength: 6.5 },
        { nps: '8', wnLength: 7.75, blLength: 7.5 },
        { nps: '10', wnLength: 8.5, blLength: 8.25 },
        { nps: '12', wnLength: 9.0, blLength: 8.75 },
        { nps: '14', wnLength: 9.75, blLength: 9.5 },
        { nps: '16', wnLength: 10.25, blLength: 10.0 },
        { nps: '18', wnLength: 11.0, blLength: 10.75 },
        { nps: '20', wnLength: 11.75, blLength: 11.5 },
        { nps: '24', wnLength: 13.25, blLength: 13.0 },
      ];

      for (const row of class900Data) {
        await queryRunner.query(`
          UPDATE "flange_bolting"
          SET "bolt_length_default" = ${row.wnLength}, "bolt_length_bl" = ${row.blLength}
          WHERE "standard_id" = ${b165Id} AND "pressure_class" = '900' AND "nps" = '${row.nps}'
        `);
      }

      // Class 1500 WN and BL bolt lengths
      const class1500Data = [
        { nps: '0.5', wnLength: 4.0, blLength: 3.75 },
        { nps: '0.75', wnLength: 4.25, blLength: 4.0 },
        { nps: '1', wnLength: 4.5, blLength: 4.25 },
        { nps: '1.5', wnLength: 5.25, blLength: 5.0 },
        { nps: '2', wnLength: 5.75, blLength: 5.5 },
        { nps: '2.5', wnLength: 6.25, blLength: 6.0 },
        { nps: '3', wnLength: 6.75, blLength: 6.5 },
        { nps: '4', wnLength: 7.5, blLength: 7.25 },
        { nps: '5', wnLength: 8.25, blLength: 8.0 },
        { nps: '6', wnLength: 8.75, blLength: 8.5 },
        { nps: '8', wnLength: 10.0, blLength: 9.75 },
        { nps: '10', wnLength: 11.25, blLength: 11.0 },
        { nps: '12', wnLength: 12.25, blLength: 12.0 },
        { nps: '14', wnLength: 13.25, blLength: 13.0 },
        { nps: '16', wnLength: 14.25, blLength: 14.0 },
        { nps: '18', wnLength: 15.25, blLength: 15.0 },
        { nps: '20', wnLength: 16.75, blLength: 16.5 },
        { nps: '24', wnLength: 19.25, blLength: 19.0 },
      ];

      for (const row of class1500Data) {
        await queryRunner.query(`
          UPDATE "flange_bolting"
          SET "bolt_length_default" = ${row.wnLength}, "bolt_length_bl" = ${row.blLength}
          WHERE "standard_id" = ${b165Id} AND "pressure_class" = '1500' AND "nps" = '${row.nps}'
        `);
      }

      // Class 2500 WN and BL bolt lengths
      const class2500Data = [
        { nps: '0.5', wnLength: 4.75, blLength: 4.5 },
        { nps: '0.75', wnLength: 5.0, blLength: 4.75 },
        { nps: '1', wnLength: 5.5, blLength: 5.25 },
        { nps: '1.5', wnLength: 6.25, blLength: 6.0 },
        { nps: '2', wnLength: 7.0, blLength: 6.75 },
        { nps: '2.5', wnLength: 7.75, blLength: 7.5 },
        { nps: '3', wnLength: 8.25, blLength: 8.0 },
        { nps: '4', wnLength: 9.25, blLength: 9.0 },
        { nps: '5', wnLength: 10.5, blLength: 10.25 },
        { nps: '6', wnLength: 11.75, blLength: 11.5 },
        { nps: '8', wnLength: 13.75, blLength: 13.5 },
        { nps: '10', wnLength: 15.75, blLength: 15.5 },
        { nps: '12', wnLength: 18.25, blLength: 18.0 },
      ];

      for (const row of class2500Data) {
        await queryRunner.query(`
          UPDATE "flange_bolting"
          SET "bolt_length_default" = ${row.wnLength}, "bolt_length_bl" = ${row.blLength}
          WHERE "standard_id" = ${b165Id} AND "pressure_class" = '2500' AND "nps" = '${row.nps}'
        `);
      }
    }

    // Create spectacle_blinds table per ASME B16.48
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "spectacle_blinds" (
        "id" SERIAL PRIMARY KEY,
        "nps" VARCHAR(10) NOT NULL,
        "pressure_class" VARCHAR(10) NOT NULL,
        "od_blind" DECIMAL(8,3) NOT NULL,
        "od_spacer" DECIMAL(8,3) NOT NULL,
        "thickness_blind" DECIMAL(6,3) NOT NULL,
        "thickness_spacer" DECIMAL(6,3) NOT NULL,
        "bar_width" DECIMAL(6,3) NOT NULL,
        "bar_thickness" DECIMAL(6,3) NOT NULL,
        "overall_length" DECIMAL(8,3) NOT NULL,
        "handle_length" DECIMAL(6,3),
        "weight_kg" DECIMAL(8,2),
        CONSTRAINT "UQ_spectacle_blind_nps_class" UNIQUE ("nps", "pressure_class")
      )
    `);

    // Insert spectacle blind data per ASME B16.48 (Class 150, 300, 600)
    await queryRunner.query(`
      INSERT INTO "spectacle_blinds"
        ("nps", "pressure_class", "od_blind", "od_spacer", "thickness_blind", "thickness_spacer", "bar_width", "bar_thickness", "overall_length", "handle_length", "weight_kg")
      VALUES
        -- Class 150 Spectacle Blinds
        ('0.5', '150', 2.875, 2.875, 0.188, 0.125, 0.75, 0.188, 6.25, 1.5, 0.5),
        ('0.75', '150', 3.5, 3.5, 0.188, 0.125, 0.75, 0.188, 7.5, 1.5, 0.7),
        ('1', '150', 4.25, 4.25, 0.188, 0.125, 0.875, 0.188, 9.0, 1.5, 0.9),
        ('1.25', '150', 4.625, 4.625, 0.188, 0.125, 0.875, 0.188, 9.75, 1.5, 1.1),
        ('1.5', '150', 5.0, 5.0, 0.188, 0.125, 1.0, 0.188, 10.5, 1.5, 1.3),
        ('2', '150', 6.0, 6.0, 0.188, 0.125, 1.0, 0.188, 12.5, 1.75, 1.8),
        ('2.5', '150', 7.0, 7.0, 0.25, 0.125, 1.125, 0.25, 14.5, 1.75, 2.5),
        ('3', '150', 7.5, 7.5, 0.25, 0.125, 1.125, 0.25, 15.5, 1.75, 2.9),
        ('3.5', '150', 8.5, 8.5, 0.25, 0.125, 1.25, 0.25, 17.5, 2.0, 3.5),
        ('4', '150', 9.0, 9.0, 0.25, 0.125, 1.25, 0.25, 18.5, 2.0, 4.0),
        ('5', '150', 10.0, 10.0, 0.25, 0.125, 1.375, 0.25, 20.5, 2.0, 4.8),
        ('6', '150', 11.0, 11.0, 0.25, 0.125, 1.5, 0.25, 22.5, 2.25, 5.7),
        ('8', '150', 13.5, 13.5, 0.313, 0.125, 1.625, 0.313, 27.5, 2.5, 8.5),
        ('10', '150', 16.0, 16.0, 0.375, 0.125, 1.75, 0.375, 32.5, 2.75, 12.0),
        ('12', '150', 19.0, 19.0, 0.375, 0.125, 2.0, 0.375, 38.5, 3.0, 16.5),
        ('14', '150', 21.0, 21.0, 0.438, 0.125, 2.125, 0.438, 42.5, 3.25, 21.0),
        ('16', '150', 23.5, 23.5, 0.5, 0.125, 2.25, 0.5, 47.5, 3.5, 28.0),
        ('18', '150', 25.0, 25.0, 0.563, 0.125, 2.375, 0.563, 50.5, 3.75, 34.0),
        ('20', '150', 27.5, 27.5, 0.625, 0.125, 2.5, 0.625, 55.5, 4.0, 42.0),
        ('24', '150', 32.0, 32.0, 0.75, 0.125, 2.75, 0.75, 64.5, 4.5, 58.0),

        -- Class 300 Spectacle Blinds
        ('0.5', '300', 2.875, 2.875, 0.25, 0.125, 0.75, 0.25, 6.25, 1.5, 0.6),
        ('0.75', '300', 3.5, 3.5, 0.25, 0.125, 0.75, 0.25, 7.5, 1.5, 0.8),
        ('1', '300', 4.25, 4.25, 0.313, 0.125, 0.875, 0.313, 9.0, 1.5, 1.2),
        ('1.25', '300', 4.625, 4.625, 0.313, 0.125, 0.875, 0.313, 9.75, 1.5, 1.4),
        ('1.5', '300', 5.0, 5.0, 0.313, 0.125, 1.0, 0.313, 10.5, 1.5, 1.7),
        ('2', '300', 6.5, 6.5, 0.375, 0.125, 1.0, 0.375, 13.5, 1.75, 2.8),
        ('2.5', '300', 7.5, 7.5, 0.438, 0.125, 1.125, 0.438, 15.5, 1.75, 3.9),
        ('3', '300', 8.25, 8.25, 0.5, 0.125, 1.125, 0.5, 17.0, 1.75, 4.8),
        ('3.5', '300', 9.0, 9.0, 0.5, 0.125, 1.25, 0.5, 18.5, 2.0, 5.5),
        ('4', '300', 10.0, 10.0, 0.563, 0.125, 1.25, 0.563, 20.5, 2.0, 7.0),
        ('5', '300', 11.0, 11.0, 0.625, 0.125, 1.375, 0.625, 22.5, 2.0, 9.0),
        ('6', '300', 12.5, 12.5, 0.688, 0.125, 1.5, 0.688, 25.5, 2.25, 12.0),
        ('8', '300', 15.0, 15.0, 0.813, 0.125, 1.625, 0.813, 30.5, 2.5, 18.0),
        ('10', '300', 17.5, 17.5, 0.938, 0.125, 1.75, 0.938, 35.5, 2.75, 26.0),
        ('12', '300', 20.5, 20.5, 1.063, 0.125, 2.0, 1.063, 41.5, 3.0, 36.0),
        ('14', '300', 23.0, 23.0, 1.125, 0.125, 2.125, 1.125, 46.5, 3.25, 46.0),
        ('16', '300', 25.5, 25.5, 1.188, 0.125, 2.25, 1.188, 51.5, 3.5, 56.0),
        ('18', '300', 28.0, 28.0, 1.313, 0.125, 2.375, 1.313, 56.5, 3.75, 72.0),
        ('20', '300', 30.5, 30.5, 1.438, 0.125, 2.5, 1.438, 61.5, 4.0, 88.0),
        ('24', '300', 36.0, 36.0, 1.688, 0.125, 2.75, 1.688, 72.5, 4.5, 125.0),

        -- Class 600 Spectacle Blinds
        ('0.5', '600', 2.875, 2.875, 0.375, 0.125, 0.75, 0.375, 6.25, 1.5, 0.8),
        ('0.75', '600', 3.5, 3.5, 0.438, 0.125, 0.75, 0.438, 7.5, 1.5, 1.1),
        ('1', '600', 4.25, 4.25, 0.5, 0.125, 0.875, 0.5, 9.0, 1.5, 1.6),
        ('1.25', '600', 4.625, 4.625, 0.5, 0.125, 0.875, 0.5, 9.75, 1.5, 1.9),
        ('1.5', '600', 5.0, 5.0, 0.563, 0.125, 1.0, 0.563, 10.5, 1.5, 2.3),
        ('2', '600', 6.5, 6.5, 0.625, 0.125, 1.0, 0.625, 13.5, 1.75, 3.8),
        ('2.5', '600', 7.5, 7.5, 0.75, 0.125, 1.125, 0.75, 15.5, 1.75, 5.4),
        ('3', '600', 8.25, 8.25, 0.813, 0.125, 1.125, 0.813, 17.0, 1.75, 6.8),
        ('4', '600', 10.75, 10.75, 0.938, 0.125, 1.25, 0.938, 22.0, 2.0, 11.5),
        ('5', '600', 13.0, 13.0, 1.063, 0.125, 1.375, 1.063, 26.5, 2.0, 17.0),
        ('6', '600', 14.0, 14.0, 1.125, 0.125, 1.5, 1.125, 28.5, 2.25, 21.0),
        ('8', '600', 16.5, 16.5, 1.313, 0.125, 1.625, 1.313, 33.5, 2.5, 32.0),
        ('10', '600', 20.0, 20.0, 1.5, 0.125, 1.75, 1.5, 40.5, 2.75, 50.0),
        ('12', '600', 22.0, 22.0, 1.688, 0.125, 2.0, 1.688, 44.5, 3.0, 64.0),
        ('14', '600', 23.75, 23.75, 1.875, 0.125, 2.125, 1.875, 48.0, 3.25, 78.0),
        ('16', '600', 27.0, 27.0, 2.063, 0.125, 2.25, 2.063, 54.5, 3.5, 108.0),
        ('18', '600', 29.25, 29.25, 2.188, 0.125, 2.375, 2.188, 59.0, 3.75, 130.0),
        ('20', '600', 32.0, 32.0, 2.375, 0.125, 2.5, 2.375, 64.5, 4.0, 162.0),
        ('24', '600', 37.5, 37.5, 2.75, 0.125, 2.75, 2.75, 75.5, 4.5, 225.0)
    `);

    console.warn(
      'Flange types and improved bolt lengths migration completed successfully',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "spectacle_blinds"`);
    await queryRunner.query(`
      ALTER TABLE "flange_bolting"
      DROP COLUMN IF EXISTS "bolt_length_bl"
    `);
    await queryRunner.query(`
      ALTER TABLE "flange_bolting"
      DROP COLUMN IF EXISTS "bolt_length_rf"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "flange_types"`);
  }
}
