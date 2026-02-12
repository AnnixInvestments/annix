import { MigrationInterface, QueryRunner } from 'typeorm';

export class PopulateWeldTypesAndPipeEndConfigurationsData1699375000000 implements MigrationInterface {
  name = 'PopulateWeldTypesAndPipeEndConfigurationsData1699375000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if weld_types table exists and create if it doesn't
    const weldTypesExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'weld_types'
      );
    `);

    if (!weldTypesExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "weld_types" (
          "id" SERIAL NOT NULL,
          "weld_code" character varying(50) NOT NULL,
          "weld_name" character varying(200) NOT NULL,
          "category" character varying(100),
          "description" text,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_weld_types" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_weld_types_code" UNIQUE ("weld_code")
        )
      `);
    }

    // Check if pipe_end_configurations table exists and create if it doesn't
    const pipeEndConfigExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pipe_end_configurations'
      );
    `);

    if (!pipeEndConfigExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "pipe_end_configurations" (
          "id" SERIAL NOT NULL,
          "config_code" character varying(20) NOT NULL,
          "config_name" character varying(100) NOT NULL,
          "weld_count" integer NOT NULL DEFAULT 0,
          "description" text,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          "weld_type_id" integer,
          CONSTRAINT "PK_pipe_end_configurations" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_pipe_end_configurations_code" UNIQUE ("config_code"),
          CONSTRAINT "FK_pipe_end_configurations_weld_type" 
          FOREIGN KEY ("weld_type_id") REFERENCES "weld_types"("id") ON DELETE SET NULL
        )
      `);
    }

    // Insert weld types data (ignore if already exists)
    await queryRunner.query(`
      INSERT INTO "weld_types" ("code", "description") VALUES
      ('FW_STR', 'Flange weld for straight pipe connections'),
      ('FW_FIT', 'Flange weld for fitting connections'),
      ('BW_NO_XRAY', 'Butt weld without X-ray inspection'),
      ('BW_XRAY', 'Butt weld with X-ray inspection'),
      ('MW', 'Mitre weld for angular connections'),
      ('BRW_90', 'Branch weld at 90 degree angle'),
      ('LW_LT45', 'Lateral weld at less than 45 degrees'),
      ('LW_45_UP', 'Lateral weld at 45 degrees and above'),
      ('GST_BEND', 'Gusset and sweep tee bend welds'),
      ('GRL', 'Grinding preparation for rubber lining'),
      ('YP', 'Y-piece branch connection weld')
      ON CONFLICT ("code") DO NOTHING;
    `);

    // Insert pipe end configurations data (ignore if already exists)
    await queryRunner.query(`
      INSERT INTO "pipe_end_configurations" ("config_code", "config_name", "weld_count", "description", "weld_type_id") VALUES
      ('PE', 'Plain Ended', 0, 'Plain ended pipe - no welds required', NULL),
      ('FOE', 'Flanged One End', 0, 'Flanged one end - no additional welds', NULL),
      ('FBE', 'Flanged Both Ends', 2, 'Flanged both ends - 2 flange welds required', (SELECT id FROM weld_types WHERE code = 'FW_STR' LIMIT 1)),
      ('FOE_LF', 'FOE + Loose Flange', 1, 'FOE with loose flange - 1 flange weld', (SELECT id FROM weld_types WHERE code = 'FW_STR' LIMIT 1)),
      ('FOE_RF', 'FOE + Rotating Flange', 2, 'FOE with rotating flange - 2 flange welds', (SELECT id FROM weld_types WHERE code = 'FW_STR' LIMIT 1)),
      ('2X_RF', '2x Rotating Flanges', 2, '2 rotating flanges - 2 flange welds', (SELECT id FROM weld_types WHERE code = 'FW_STR' LIMIT 1))
      ON CONFLICT ("config_code") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete the data we inserted
    await queryRunner.query(`DELETE FROM "pipe_end_configurations" WHERE "config_code" IN ('PE', 'FOE', 'FBE', 'FOE_LF', 'FOE_RF', '2X_RF')`);
    await queryRunner.query(`DELETE FROM "weld_types" WHERE "code" IN ('FW_STR', 'FW_FIT', 'BW_NO_XRAY', 'BW_XRAY', 'MW', 'BRW_90', 'LW_LT45', 'LW_45_UP', 'GST_BEND', 'GRL', 'YP')`);
  }
}