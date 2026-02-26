import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserAccessProducts1799200000000 implements MigrationInterface {
  name = "CreateUserAccessProducts1799200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_access_products" (
        "id" SERIAL NOT NULL,
        "user_app_access_id" integer NOT NULL,
        "product_key" varchar(100) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_access_products" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_access_products_access" FOREIGN KEY ("user_app_access_id")
          REFERENCES "user_app_access"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_user_access_products_access_product"
      ON "user_access_products" ("user_app_access_id", "product_key")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_access_products_product_key"
      ON "user_access_products" ("product_key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_user_access_products_product_key"`);
    await queryRunner.query(`DROP INDEX "IDX_user_access_products_access_product"`);
    await queryRunner.query(`DROP TABLE "user_access_products"`);
  }
}
