import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeatureFlagsTable1771500000000
  implements MigrationInterface
{
  name = 'CreateFeatureFlagsTable1771500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "feature_flags" (
        "id" SERIAL NOT NULL,
        "flag_key" varchar(100) NOT NULL,
        "enabled" boolean NOT NULL DEFAULT false,
        "description" varchar(255),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_feature_flags_flag_key" UNIQUE ("flag_key"),
        CONSTRAINT "PK_feature_flags" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "feature_flags" ("flag_key", "enabled", "description") VALUES
        ('REMOTE_ACCESS', false, 'Remote access request system for customer documents'),
        ('RUBBER_PORTAL', false, 'Rubber lining portal module'),
        ('REFERENCE_DATA', false, 'Reference data management module')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "feature_flags"`);
  }
}
