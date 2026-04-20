import type { MigrationInterface, QueryRunner } from "typeorm";

export class SeedScSpecificRbacRoles1820100000017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const appResult = await queryRunner.query(`SELECT id FROM "apps" WHERE code = 'stock-control'`);
    if (appResult.length === 0) {
      return;
    }
    const appId = appResult[0].id;

    const scRoles = [
      {
        code: "storeman",
        name: "Storeman",
        description: "Warehouse and stock operations",
        order: 10,
        targetType: null as string | null,
      },
      {
        code: "receiving-clerk",
        name: "Receiving Clerk",
        description: "Delivery receiving and job card printing",
        order: 11,
        targetType: null as string | null,
      },
      {
        code: "accounts",
        name: "Accounts",
        description: "Invoice processing, certificates, and financial operations",
        order: 12,
        targetType: null as string | null,
      },
      {
        code: "quality",
        name: "Quality Inspector",
        description: "QC measurements, certificates, and PosiTector operations",
        order: 13,
        targetType: null as string | null,
      },
    ];

    for (const role of scRoles) {
      await queryRunner.query(
        `INSERT INTO "app_roles" ("app_id", "code", "name", "description", "display_order", "target_type")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [appId, role.code, role.name, role.description, role.order, role.targetType],
      );
    }

    const scPermissions = [
      { code: "deliveries:view", name: "View Deliveries", category: "Deliveries", order: 13 },
      { code: "deliveries:manage", name: "Manage Deliveries", category: "Deliveries", order: 14 },
      { code: "invoices:view", name: "View Invoices", category: "Invoices", order: 15 },
      { code: "invoices:approve", name: "Approve Invoices", category: "Invoices", order: 16 },
      { code: "invoices:sage-export", name: "Sage Export", category: "Invoices", order: 17 },
      { code: "qc:view", name: "View QC Data", category: "Quality Control", order: 18 },
      { code: "qc:manage", name: "Manage QC Measurements", category: "Quality Control", order: 19 },
      { code: "certificates:view", name: "View Certificates", category: "Certificates", order: 20 },
      {
        code: "certificates:upload",
        name: "Upload Certificates",
        category: "Certificates",
        order: 21,
      },
      { code: "positector:manage", name: "Manage PosiTector", category: "PosiTector", order: 22 },
      { code: "staff:view", name: "View Staff", category: "Staff", order: 23 },
      { code: "staff:manage", name: "Manage Staff", category: "Staff", order: 24 },
      { code: "issuance:manage", name: "Manage Issuance", category: "Issuance", order: 25 },
    ];

    for (const perm of scPermissions) {
      await queryRunner.query(
        `INSERT INTO "app_permissions" ("app_id", "code", "name", "category", "display_order")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [appId, perm.code, perm.name, perm.category, perm.order],
      );
    }

    const rolePermissionMap: Record<string, string[]> = {
      storeman: [
        "stock:view",
        "deliveries:view",
        "certificates:view",
        "certificates:upload",
        "issuance:manage",
        "qc:view",
      ],
      "receiving-clerk": [
        "stock:view",
        "deliveries:view",
        "certificates:view",
        "issuance:manage",
        "jobs:view",
      ],
      accounts: [
        "stock:view",
        "stock:edit",
        "deliveries:view",
        "deliveries:manage",
        "invoices:view",
        "invoices:approve",
        "certificates:view",
        "certificates:upload",
        "jobs:view",
        "issuance:manage",
        "qc:view",
      ],
      quality: [
        "stock:view",
        "deliveries:view",
        "certificates:view",
        "certificates:upload",
        "qc:view",
        "qc:manage",
        "positector:manage",
        "jobs:view",
      ],
    };

    for (const [roleCode, permCodes] of Object.entries(rolePermissionMap)) {
      const roleResult = await queryRunner.query(
        `SELECT id FROM "app_roles" WHERE app_id = $1 AND code = $2`,
        [appId, roleCode],
      );
      if (roleResult.length === 0) {
        continue;
      }
      const roleId = roleResult[0].id;

      for (const permCode of permCodes) {
        const permResult = await queryRunner.query(
          `SELECT id FROM "app_permissions" WHERE app_id = $1 AND code = $2`,
          [appId, permCode],
        );
        if (permResult.length === 0) {
          continue;
        }
        const permId = permResult[0].id;

        await queryRunner.query(
          `INSERT INTO "app_role_permissions" ("app_role_id", "app_permission_id")
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [roleId, permId],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const appResult = await queryRunner.query(`SELECT id FROM "apps" WHERE code = 'stock-control'`);
    if (appResult.length === 0) {
      return;
    }
    const appId = appResult[0].id;

    const roleCodes = ["storeman", "receiving-clerk", "accounts", "quality"];
    for (const code of roleCodes) {
      await queryRunner.query(`DELETE FROM "app_roles" WHERE app_id = $1 AND code = $2`, [
        appId,
        code,
      ]);
    }

    const permCodes = [
      "deliveries:view",
      "deliveries:manage",
      "invoices:view",
      "invoices:approve",
      "invoices:sage-export",
      "qc:view",
      "qc:manage",
      "certificates:view",
      "certificates:upload",
      "positector:manage",
      "staff:view",
      "staff:manage",
      "issuance:manage",
    ];
    for (const code of permCodes) {
      await queryRunner.query(`DELETE FROM "app_permissions" WHERE app_id = $1 AND code = $2`, [
        appId,
        code,
      ]);
    }
  }
}
