import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAppRoleProducts1798200000000 implements MigrationInterface {
  name = "CreateAppRoleProducts1798200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "app_role_products" (
        "id" SERIAL NOT NULL,
        "role_id" integer NOT NULL,
        "product_key" varchar(100) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_role_products" PRIMARY KEY ("id"),
        CONSTRAINT "FK_app_role_products_role" FOREIGN KEY ("role_id")
          REFERENCES "app_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_app_role_products_role_product"
      ON "app_role_products" ("role_id", "product_key")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_app_role_products_product_key"
      ON "app_role_products" ("product_key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_app_role_products_product_key"`);
    await queryRunner.query(`DROP INDEX "IDX_app_role_products_role_product"`);
    await queryRunner.query(`DROP TABLE "app_role_products"`);
  }
}
