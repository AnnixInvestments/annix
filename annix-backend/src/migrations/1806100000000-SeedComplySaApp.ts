import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedComplySaApp1806100000000 implements MigrationInterface {
  name = "SeedComplySaApp1806100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "apps" ("code", "name", "description", "icon", "display_order")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("code") DO NOTHING`,
      [
        "comply-sa",
        "Comply SA",
        "SA SME compliance dashboard with B-BBEE, tax tools, document templates, and regulatory tracking",
        "clipboard-check",
        7,
      ],
    );

    const appResult = await queryRunner.query(`SELECT id FROM "apps" WHERE code = $1`, [
      "comply-sa",
    ]);

    if (appResult.length === 0) {
      return;
    }

    const appId = appResult[0].id;

    const permissions = [
      { code: "dashboard:view", name: "View Dashboard", category: "Dashboard", order: 1 },
      { code: "companies:view", name: "View Companies", category: "Companies", order: 2 },
      { code: "companies:create", name: "Create Companies", category: "Companies", order: 3 },
      { code: "companies:edit", name: "Edit Companies", category: "Companies", order: 4 },
      { code: "companies:delete", name: "Delete Companies", category: "Companies", order: 5 },
      { code: "compliance:view", name: "View Compliance", category: "Compliance", order: 6 },
      { code: "compliance:manage", name: "Manage Compliance", category: "Compliance", order: 7 },
      { code: "documents:view", name: "View Documents", category: "Documents", order: 8 },
      { code: "documents:upload", name: "Upload Documents", category: "Documents", order: 9 },
      { code: "documents:delete", name: "Delete Documents", category: "Documents", order: 10 },
      { code: "templates:view", name: "View Templates", category: "Templates", order: 11 },
      { code: "templates:generate", name: "Generate Templates", category: "Templates", order: 12 },
      { code: "bbee:view", name: "View B-BBEE", category: "B-BBEE", order: 13 },
      { code: "bbee:calculate", name: "Calculate B-BBEE", category: "B-BBEE", order: 14 },
      { code: "tax:view", name: "View Tax Tools", category: "Tax Tools", order: 15 },
      { code: "tax:calculate", name: "Calculate Tax", category: "Tax Tools", order: 16 },
      { code: "advisor:view", name: "View Advisor Dashboard", category: "Advisor", order: 17 },
      { code: "advisor:manage", name: "Manage Clients", category: "Advisor", order: 18 },
      {
        code: "subscriptions:view",
        name: "View Subscriptions",
        category: "Subscriptions",
        order: 19,
      },
      {
        code: "subscriptions:manage",
        name: "Manage Subscriptions",
        category: "Subscriptions",
        order: 20,
      },
      { code: "settings:manage", name: "Manage Settings", category: "Administration", order: 21 },
    ];

    for (const perm of permissions) {
      await queryRunner.query(
        `INSERT INTO "app_permissions" ("app_id", "code", "name", "category", "display_order")
         VALUES ($1, $2, $3, $4, $5)`,
        [appId, perm.code, perm.name, perm.category, perm.order],
      );
    }

    const roleDefinitions = [
      { code: "viewer", name: "Viewer", description: "Read-only access", order: 1 },
      { code: "editor", name: "Editor", description: "Can view and edit content", order: 2 },
      { code: "manager", name: "Manager", description: "Full access except settings", order: 3 },
      {
        code: "administrator",
        name: "Administrator",
        description: "Full access including settings",
        order: 4,
      },
    ];

    const rolePermissionPatterns: Record<string, (code: string) => boolean> = {
      viewer: (code) => code.endsWith(":view"),
      editor: (code) =>
        code.endsWith(":view") ||
        code.endsWith(":create") ||
        code.endsWith(":edit") ||
        code.endsWith(":upload") ||
        code.endsWith(":calculate") ||
        code.endsWith(":generate"),
      manager: (code) => !code.startsWith("settings:"),
      administrator: () => true,
    };

    for (const role of roleDefinitions) {
      await queryRunner.query(
        `INSERT INTO "app_roles" ("app_id", "code", "name", "description", "is_default", "display_order")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [appId, role.code, role.name, role.description, role.code === "viewer", role.order],
      );
    }

    const roleRows = await queryRunner.query(`SELECT id, code FROM "app_roles" WHERE app_id = $1`, [
      appId,
    ]);

    const permissionRows = await queryRunner.query(
      `SELECT id, code FROM "app_permissions" WHERE app_id = $1`,
      [appId],
    );

    for (const role of roleRows) {
      const pattern = rolePermissionPatterns[role.code];
      const matchingPermissions = permissionRows.filter((p: { code: string }) => pattern(p.code));

      for (const perm of matchingPermissions) {
        await queryRunner.query(
          `INSERT INTO "app_role_permissions" ("app_role_id", "app_permission_id")
           VALUES ($1, $2)`,
          [role.id, perm.id],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const appResult = await queryRunner.query(`SELECT id FROM "apps" WHERE code = $1`, [
      "comply-sa",
    ]);

    if (appResult.length === 0) {
      return;
    }

    const appId = appResult[0].id;

    const roleIds = await queryRunner.query(`SELECT id FROM "app_roles" WHERE app_id = $1`, [
      appId,
    ]);

    for (const role of roleIds) {
      await queryRunner.query(`DELETE FROM "app_role_permissions" WHERE app_role_id = $1`, [
        role.id,
      ]);
    }

    await queryRunner.query(`DELETE FROM "app_roles" WHERE app_id = $1`, [appId]);
    await queryRunner.query(`DELETE FROM "app_permissions" WHERE app_id = $1`, [appId]);
    await queryRunner.query(`DELETE FROM "apps" WHERE id = $1`, [appId]);
  }
}
