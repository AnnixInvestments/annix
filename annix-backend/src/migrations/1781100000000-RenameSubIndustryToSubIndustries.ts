import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameSubIndustryToSubIndustries1781100000000 implements MigrationInterface {
  name = "RenameSubIndustryToSubIndustries1781100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fieldflow_rep_profiles" RENAME COLUMN "sub_industry" TO "sub_industries"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fieldflow_rep_profiles" RENAME COLUMN "sub_industries" TO "sub_industry"`,
    );
  }
}
