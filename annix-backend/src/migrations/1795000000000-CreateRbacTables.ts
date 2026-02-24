import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRbacTables1795000000000 implements MigrationInterface {
  name = "CreateRbacTables1795000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "apps" (
        "id" SERIAL PRIMARY KEY,
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "icon" VARCHAR(50),
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "display_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_apps_code" ON "apps" ("code")`);

    await queryRunner.query(`
      CREATE TABLE "app_permissions" (
        "id" SERIAL PRIMARY KEY,
        "app_id" INT NOT NULL REFERENCES "apps"("id") ON DELETE CASCADE,
        "code" VARCHAR(100) NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "category" VARCHAR(50),
        "display_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE ("app_id", "code")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_app_permissions_code" ON "app_permissions" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_app_permissions_app_id" ON "app_permissions" ("app_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "app_roles" (
        "id" SERIAL PRIMARY KEY,
        "app_id" INT NOT NULL REFERENCES "apps"("id") ON DELETE CASCADE,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "is_default" BOOLEAN NOT NULL DEFAULT false,
        "display_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE ("app_id", "code")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_app_roles_code" ON "app_roles" ("code")`);
    await queryRunner.query(`CREATE INDEX "IDX_app_roles_app_id" ON "app_roles" ("app_id")`);

    await queryRunner.query(`
      CREATE TABLE "app_role_permissions" (
        "id" SERIAL PRIMARY KEY,
        "app_role_id" INT NOT NULL REFERENCES "app_roles"("id") ON DELETE CASCADE,
        "app_permission_id" INT NOT NULL REFERENCES "app_permissions"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE ("app_role_id", "app_permission_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_app_role_permissions_role_id" ON "app_role_permissions" ("app_role_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_app_role_permissions_permission_id" ON "app_role_permissions" ("app_permission_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "user_app_access" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "app_id" INT NOT NULL REFERENCES "apps"("id") ON DELETE CASCADE,
        "app_role_id" INT REFERENCES "app_roles"("id") ON DELETE SET NULL,
        "use_custom_permissions" BOOLEAN NOT NULL DEFAULT false,
        "granted_by" INT REFERENCES "user"("id") ON DELETE SET NULL,
        "expires_at" TIMESTAMPTZ,
        "granted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE ("user_id", "app_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_app_access_user_id" ON "user_app_access" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_app_access_app_id" ON "user_app_access" ("app_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_app_access_role_id" ON "user_app_access" ("app_role_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "user_app_permissions" (
        "id" SERIAL PRIMARY KEY,
        "user_app_access_id" INT NOT NULL REFERENCES "user_app_access"("id") ON DELETE CASCADE,
        "app_permission_id" INT NOT NULL REFERENCES "app_permissions"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE ("user_app_access_id", "app_permission_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_app_permissions_access_id" ON "user_app_permissions" ("user_app_access_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_app_permissions_permission_id" ON "user_app_permissions" ("app_permission_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_app_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_app_access"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "apps"`);
  }
}
