import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameFieldFlowRepProfileIndexes1807000000026 implements MigrationInterface {
  name = "RenameFieldFlowRepProfileIndexes1807000000026";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_fieldflow_rep_profiles_industry') THEN
          ALTER INDEX "IDX_fieldflow_rep_profiles_industry" RENAME TO "IDX_annix_rep_rep_profiles_industry";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_fieldflow_rep_profiles_setup') THEN
          ALTER INDEX "IDX_fieldflow_rep_profiles_setup" RENAME TO "IDX_annix_rep_rep_profiles_setup";
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_annix_rep_rep_profiles_industry') THEN
          ALTER INDEX "IDX_annix_rep_rep_profiles_industry" RENAME TO "IDX_fieldflow_rep_profiles_industry";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_annix_rep_rep_profiles_setup') THEN
          ALTER INDEX "IDX_annix_rep_rep_profiles_setup" RENAME TO "IDX_fieldflow_rep_profiles_setup";
        END IF;
      END $$;
    `);
  }
}
