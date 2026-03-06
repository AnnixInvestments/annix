import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRubberFieldsToStockItems1801200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stock_items"
        ADD COLUMN IF NOT EXISTS "thickness_mm" decimal(6,2),
        ADD COLUMN IF NOT EXISTS "width_mm" decimal(8,2),
        ADD COLUMN IF NOT EXISTS "length_m" decimal(10,2),
        ADD COLUMN IF NOT EXISTS "color" varchar(50),
        ADD COLUMN IF NOT EXISTS "compound_code" varchar(50)
    `);

    await queryRunner.query(`
      UPDATE "stock_items"
      SET
        "thickness_mm" = sub.thickness,
        "width_mm" = sub.width,
        "length_m" = sub.length,
        "color" = sub.color
      FROM (
        SELECT
          id,
          (regexp_matches("name", '^(d+(?:.d+)?)MMs*Xs*(d+(?:.d+)?)MMs*Xs*(d+(?:.d+)?)M(?:s*((w+)))?', 'i'))[1]::decimal AS thickness,
          (regexp_matches("name", '^(d+(?:.d+)?)MMs*Xs*(d+(?:.d+)?)MMs*Xs*(d+(?:.d+)?)M(?:s*((w+)))?', 'i'))[2]::decimal AS width,
          (regexp_matches("name", '^(d+(?:.d+)?)MMs*Xs*(d+(?:.d+)?)MMs*Xs*(d+(?:.d+)?)M(?:s*((w+)))?', 'i'))[3]::decimal AS length,
          (regexp_matches("name", '^(d+(?:.d+)?)MMs*Xs*(d+(?:.d+)?)MMs*Xs*(d+(?:.d+)?)M(?:s*((w+)))?', 'i'))[4] AS color
        FROM "stock_items"
        WHERE "name" ~ '^d+(?:.d+)?MMs*Xs*d+(?:.d+)?MMs*Xs*d+(?:.d+)?M'
          AND "thickness_mm" IS NULL
      ) AS sub
      WHERE "stock_items"."id" = sub.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stock_items"
        DROP COLUMN IF EXISTS "thickness_mm",
        DROP COLUMN IF EXISTS "width_mm",
        DROP COLUMN IF EXISTS "length_m",
        DROP COLUMN IF EXISTS "color",
        DROP COLUMN IF EXISTS "compound_code"
    `);
  }
}
