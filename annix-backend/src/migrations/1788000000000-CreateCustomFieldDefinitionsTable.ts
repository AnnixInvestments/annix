import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCustomFieldDefinitionsTable1788000000000 implements MigrationInterface {
  name = "CreateCustomFieldDefinitionsTable1788000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "annix_rep_custom_field_type_enum" AS ENUM (
        'text',
        'number',
        'date',
        'select',
        'multiselect',
        'boolean'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "annix_rep_custom_field_definitions" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "name" varchar(100) NOT NULL,
        "field_key" varchar(50) NOT NULL,
        "field_type" "annix_rep_custom_field_type_enum" NOT NULL DEFAULT 'text',
        "is_required" boolean NOT NULL DEFAULT false,
        "options" text,
        "display_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_annix_rep_custom_field_definitions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_custom_field_definitions"
      ADD CONSTRAINT "FK_annix_rep_custom_field_definitions_user"
      FOREIGN KEY ("user_id") REFERENCES "user"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_annix_rep_custom_field_definitions_user"
      ON "annix_rep_custom_field_definitions" ("user_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_annix_rep_custom_field_definitions_user_key"
      ON "annix_rep_custom_field_definitions" ("user_id", "field_key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_annix_rep_custom_field_definitions_user_key"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_annix_rep_custom_field_definitions_user"`);
    await queryRunner.query(
      `ALTER TABLE "annix_rep_custom_field_definitions" DROP CONSTRAINT IF EXISTS "FK_annix_rep_custom_field_definitions_user"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "annix_rep_custom_field_definitions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "annix_rep_custom_field_type_enum"`);
  }
}
