import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedAuRubberPagePermissions1795300000000 implements MigrationInterface {
  name = "SeedAuRubberPagePermissions1795300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const appResult = await queryRunner.query(`SELECT id FROM "apps" WHERE code = $1`, [
      "au-rubber",
    ]);

    if (appResult.length === 0) {
      return;
    }

    const appId = appResult[0].id;

    const pagePermissions = [
      { code: "products:view", name: "View Products", category: "Products", order: 10 },
      { code: "codings:view", name: "View Product Codings", category: "Products", order: 11 },
      { code: "supplier-cocs:view", name: "View Supplier CoCs", category: "Documents", order: 20 },
      {
        code: "delivery-notes:view",
        name: "View Delivery Notes",
        category: "Documents",
        order: 21,
      },
      { code: "roll-stock:view", name: "View Roll Stock", category: "Documents", order: 22 },
      { code: "au-cocs:view", name: "View AU Certificates", category: "Documents", order: 23 },
      {
        code: "compound-stocks:view",
        name: "View Compound Inventory",
        category: "Stock Control",
        order: 30,
      },
      {
        code: "compound-orders:view",
        name: "View Compound Orders",
        category: "Stock Control",
        order: 31,
      },
      { code: "productions:view", name: "View Production", category: "Stock Control", order: 32 },
      {
        code: "stock-movements:view",
        name: "View Movement History",
        category: "Stock Control",
        order: 33,
      },
      {
        code: "stock-locations:view",
        name: "View Stock Locations",
        category: "Stock Control",
        order: 34,
      },
      {
        code: "purchase-requisitions:view",
        name: "View Purchase Requisitions",
        category: "Stock Control",
        order: 35,
      },
      { code: "pricing-tiers:view", name: "View Pricing Tiers", category: "Prices", order: 40 },
      { code: "companies:view", name: "View Companies", category: "Prices", order: 41 },
    ];

    for (const perm of pagePermissions) {
      await queryRunner.query(
        `INSERT INTO "app_permissions" ("app_id", "code", "name", "category", "display_order")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("app_id", "code") DO NOTHING`,
        [appId, perm.code, perm.name, perm.category, perm.order],
      );
    }

    const supplierResult = await queryRunner.query(
      `SELECT id FROM "app_roles" WHERE app_id = $1 AND code = $2`,
      [appId, "supplier"],
    );

    const supplierRoleId =
      supplierResult.length > 0
        ? supplierResult[0].id
        : (
            await queryRunner.query(
              `INSERT INTO "app_roles" ("app_id", "code", "name", "description", "is_default", "display_order")
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
              [appId, "supplier", "Supplier", "Access for rubber suppliers", false, 5],
            )
          )[0].id;

    const customerResult = await queryRunner.query(
      `SELECT id FROM "app_roles" WHERE app_id = $1 AND code = $2`,
      [appId, "customer"],
    );

    const customerRoleId =
      customerResult.length > 0
        ? customerResult[0].id
        : (
            await queryRunner.query(
              `INSERT INTO "app_roles" ("app_id", "code", "name", "description", "is_default", "display_order")
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
              [appId, "customer", "Customer", "Access for rubber customers", false, 6],
            )
          )[0].id;

    const supplierPermissions = [
      "dashboard:view",
      "orders:view",
      "supplier-cocs:view",
      "delivery-notes:view",
    ];

    const customerPermissions = [
      "dashboard:view",
      "orders:view",
      "au-cocs:view",
      "roll-stock:view",
    ];

    for (const permCode of supplierPermissions) {
      const permResult = await queryRunner.query(
        `SELECT id FROM "app_permissions" WHERE app_id = $1 AND code = $2`,
        [appId, permCode],
      );
      if (permResult.length > 0) {
        await queryRunner.query(
          `INSERT INTO "app_role_permissions" ("app_role_id", "app_permission_id")
           VALUES ($1, $2)
           ON CONFLICT ("app_role_id", "app_permission_id") DO NOTHING`,
          [supplierRoleId, permResult[0].id],
        );
      }
    }

    for (const permCode of customerPermissions) {
      const permResult = await queryRunner.query(
        `SELECT id FROM "app_permissions" WHERE app_id = $1 AND code = $2`,
        [appId, permCode],
      );
      if (permResult.length > 0) {
        await queryRunner.query(
          `INSERT INTO "app_role_permissions" ("app_role_id", "app_permission_id")
           VALUES ($1, $2)
           ON CONFLICT ("app_role_id", "app_permission_id") DO NOTHING`,
          [customerRoleId, permResult[0].id],
        );
      }
    }

    const adminRoleResult = await queryRunner.query(
      `SELECT id FROM "app_roles" WHERE app_id = $1 AND code = $2`,
      [appId, "administrator"],
    );

    if (adminRoleResult.length > 0) {
      const adminRoleId = adminRoleResult[0].id;
      const allPermissions = await queryRunner.query(
        `SELECT id FROM "app_permissions" WHERE app_id = $1`,
        [appId],
      );

      for (const perm of allPermissions) {
        await queryRunner.query(
          `INSERT INTO "app_role_permissions" ("app_role_id", "app_permission_id")
           VALUES ($1, $2)
           ON CONFLICT ("app_role_id", "app_permission_id") DO NOTHING`,
          [adminRoleId, perm.id],
        );
      }
    }

    const managerRoleResult = await queryRunner.query(
      `SELECT id FROM "app_roles" WHERE app_id = $1 AND code = $2`,
      [appId, "manager"],
    );

    if (managerRoleResult.length > 0) {
      const managerRoleId = managerRoleResult[0].id;
      const nonSettingsPermissions = await queryRunner.query(
        `SELECT id FROM "app_permissions" WHERE app_id = $1 AND code NOT LIKE 'settings:%'`,
        [appId],
      );

      for (const perm of nonSettingsPermissions) {
        await queryRunner.query(
          `INSERT INTO "app_role_permissions" ("app_role_id", "app_permission_id")
           VALUES ($1, $2)
           ON CONFLICT ("app_role_id", "app_permission_id") DO NOTHING`,
          [managerRoleId, perm.id],
        );
      }
    }

    const viewerRoleResult = await queryRunner.query(
      `SELECT id FROM "app_roles" WHERE app_id = $1 AND code = $2`,
      [appId, "viewer"],
    );

    if (viewerRoleResult.length > 0) {
      const viewerRoleId = viewerRoleResult[0].id;
      const viewPermissions = await queryRunner.query(
        `SELECT id FROM "app_permissions" WHERE app_id = $1 AND code LIKE '%:view'`,
        [appId],
      );

      for (const perm of viewPermissions) {
        await queryRunner.query(
          `INSERT INTO "app_role_permissions" ("app_role_id", "app_permission_id")
           VALUES ($1, $2)
           ON CONFLICT ("app_role_id", "app_permission_id") DO NOTHING`,
          [viewerRoleId, perm.id],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const appResult = await queryRunner.query(`SELECT id FROM "apps" WHERE code = $1`, [
      "au-rubber",
    ]);

    if (appResult.length === 0) {
      return;
    }

    const appId = appResult[0].id;

    const permissionCodes = [
      "products:view",
      "codings:view",
      "supplier-cocs:view",
      "delivery-notes:view",
      "roll-stock:view",
      "au-cocs:view",
      "compound-stocks:view",
      "compound-orders:view",
      "productions:view",
      "stock-movements:view",
      "stock-locations:view",
      "purchase-requisitions:view",
      "pricing-tiers:view",
      "companies:view",
    ];

    for (const code of permissionCodes) {
      await queryRunner.query(`DELETE FROM "app_permissions" WHERE app_id = $1 AND code = $2`, [
        appId,
        code,
      ]);
    }

    await queryRunner.query(`DELETE FROM "app_roles" WHERE app_id = $1 AND code IN ($2, $3)`, [
      appId,
      "supplier",
      "customer",
    ]);
  }
}
