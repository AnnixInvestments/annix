import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOAuthFieldsToUser1740135000000 implements MigrationInterface {
  name = "AddOAuthFieldsToUser1740135000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "oauthProvider" character varying`);
    await queryRunner.query(`ALTER TABLE "user" ADD "oauthId" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "oauthId"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "oauthProvider"`);
  }
}
