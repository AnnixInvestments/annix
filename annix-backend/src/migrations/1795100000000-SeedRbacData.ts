import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedRbacData1795100000000 implements MigrationInterface {
  name = "SeedRbacData1795100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const apps = [
      {
        code: "rfq-platform",
        name: "RFQ Platform",
        description: "Request for Quote management system for piping fabrication",
        icon: "file-text",
        displayOrder: 1,
      },
      {
        code: "au-rubber",
        name: "AU Rubber",
        description: "Rubber lining orders and tracking",
        icon: "circle",
        displayOrder: 2,
      },
      {
        code: "voice-filter",
        name: "Voice Filter",
        description: "AI voice transcription and filtering",
        icon: "mic",
        displayOrder: 3,
      },
      {
        code: "annix-rep",
        name: "Annix Rep",
        description: "Field sales CRM and prospect management",
        icon: "briefcase",
        displayOrder: 4,
      },
      {
        code: "stock-control",
        name: "Stock Control",
        description: "Inventory and job card management",
        icon: "package",
        displayOrder: 5,
      },
      {
        code: "cv-assistant",
        name: "CV Assistant",
        description: "Candidate recruitment and reference checking",
        icon: "users",
        displayOrder: 6,
      },
    ];

    for (const app of apps) {
      await queryRunner.query(
        `INSERT INTO "apps" ("code", "name", "description", "icon", "display_order")
         VALUES ($1, $2, $3, $4, $5)`,
        [app.code, app.name, app.description, app.icon, app.displayOrder],
      );
    }

    const permissionsByApp: Record<string, { code: string; name: string; category: string; order: number }[]> = {
      "rfq-platform": [
        { code: "rfq:view", name: "View RFQs", category: "RFQ Management", order: 1 },
        { code: "rfq:create", name: "Create RFQs", category: "RFQ Management", order: 2 },
        { code: "rfq:edit", name: "Edit RFQs", category: "RFQ Management", order: 3 },
        { code: "rfq:delete", name: "Delete RFQs", category: "RFQ Management", order: 4 },
        { code: "rfq:approve", name: "Approve RFQs", category: "RFQ Management", order: 5 },
        { code: "boq:view", name: "View BOQs", category: "BOQ Management", order: 6 },
        { code: "boq:distribute", name: "Distribute BOQs", category: "BOQ Management", order: 7 },
        { code: "boq:pricing", name: "Manage Pricing", category: "BOQ Management", order: 8 },
        { code: "customers:view", name: "View Customers", category: "Customers", order: 9 },
        { code: "customers:manage", name: "Manage Customers", category: "Customers", order: 10 },
        { code: "suppliers:view", name: "View Suppliers", category: "Suppliers", order: 11 },
        { code: "suppliers:manage", name: "Manage Suppliers", category: "Suppliers", order: 12 },
        { code: "drawings:view", name: "View Drawings", category: "Drawings", order: 13 },
        { code: "drawings:upload", name: "Upload Drawings", category: "Drawings", order: 14 },
        { code: "settings:manage", name: "Manage Settings", category: "Administration", order: 15 },
      ],
      "au-rubber": [
        { code: "orders:view", name: "View Orders", category: "Orders", order: 1 },
        { code: "orders:create", name: "Create Orders", category: "Orders", order: 2 },
        { code: "orders:edit", name: "Edit Orders", category: "Orders", order: 3 },
        { code: "orders:delete", name: "Delete Orders", category: "Orders", order: 4 },
        { code: "tracking:view", name: "View Tracking", category: "Tracking", order: 5 },
        { code: "tracking:update", name: "Update Tracking", category: "Tracking", order: 6 },
        { code: "reports:view", name: "View Reports", category: "Reports", order: 7 },
        { code: "settings:manage", name: "Manage Settings", category: "Administration", order: 8 },
      ],
      "voice-filter": [
        { code: "transcripts:view", name: "View Transcripts", category: "Transcripts", order: 1 },
        { code: "transcripts:create", name: "Create Transcripts", category: "Transcripts", order: 2 },
        { code: "transcripts:edit", name: "Edit Transcripts", category: "Transcripts", order: 3 },
        { code: "transcripts:delete", name: "Delete Transcripts", category: "Transcripts", order: 4 },
        { code: "filters:manage", name: "Manage Filters", category: "Filters", order: 5 },
        { code: "settings:manage", name: "Manage Settings", category: "Administration", order: 6 },
      ],
      "annix-rep": [
        { code: "prospects:view", name: "View Prospects", category: "Prospects", order: 1 },
        { code: "prospects:create", name: "Create Prospects", category: "Prospects", order: 2 },
        { code: "prospects:edit", name: "Edit Prospects", category: "Prospects", order: 3 },
        { code: "prospects:delete", name: "Delete Prospects", category: "Prospects", order: 4 },
        { code: "activities:view", name: "View Activities", category: "Activities", order: 5 },
        { code: "activities:create", name: "Create Activities", category: "Activities", order: 6 },
        { code: "goals:view", name: "View Goals", category: "Goals", order: 7 },
        { code: "goals:manage", name: "Manage Goals", category: "Goals", order: 8 },
        { code: "team:view", name: "View Team", category: "Team", order: 9 },
        { code: "team:manage", name: "Manage Team", category: "Team", order: 10 },
        { code: "reports:view", name: "View Reports", category: "Reports", order: 11 },
        { code: "settings:manage", name: "Manage Settings", category: "Administration", order: 12 },
      ],
      "stock-control": [
        { code: "stock:view", name: "View Stock", category: "Stock", order: 1 },
        { code: "stock:create", name: "Create Stock Items", category: "Stock", order: 2 },
        { code: "stock:edit", name: "Edit Stock Items", category: "Stock", order: 3 },
        { code: "stock:delete", name: "Delete Stock Items", category: "Stock", order: 4 },
        { code: "jobs:view", name: "View Job Cards", category: "Job Cards", order: 5 },
        { code: "jobs:create", name: "Create Job Cards", category: "Job Cards", order: 6 },
        { code: "jobs:manage", name: "Manage Job Cards", category: "Job Cards", order: 7 },
        { code: "requisitions:view", name: "View Requisitions", category: "Requisitions", order: 8 },
        { code: "requisitions:manage", name: "Manage Requisitions", category: "Requisitions", order: 9 },
        { code: "reports:view", name: "View Reports", category: "Reports", order: 10 },
        { code: "reports:export", name: "Export Reports", category: "Reports", order: 11 },
        { code: "settings:manage", name: "Manage Settings", category: "Administration", order: 12 },
      ],
      "cv-assistant": [
        { code: "candidates:view", name: "View Candidates", category: "Candidates", order: 1 },
        { code: "candidates:create", name: "Create Candidates", category: "Candidates", order: 2 },
        { code: "candidates:edit", name: "Edit Candidates", category: "Candidates", order: 3 },
        { code: "candidates:delete", name: "Delete Candidates", category: "Candidates", order: 4 },
        { code: "jobs:view", name: "View Jobs", category: "Jobs", order: 5 },
        { code: "jobs:create", name: "Create Jobs", category: "Jobs", order: 6 },
        { code: "jobs:manage", name: "Manage Jobs", category: "Jobs", order: 7 },
        { code: "references:view", name: "View References", category: "References", order: 8 },
        { code: "references:send", name: "Send References", category: "References", order: 9 },
        { code: "reports:view", name: "View Reports", category: "Reports", order: 10 },
        { code: "settings:manage", name: "Manage Settings", category: "Administration", order: 11 },
      ],
    };

    for (const [appCode, permissions] of Object.entries(permissionsByApp)) {
      const appResult = await queryRunner.query(
        `SELECT id FROM "apps" WHERE code = $1`,
        [appCode],
      );
      const appId = appResult[0].id;

      for (const perm of permissions) {
        await queryRunner.query(
          `INSERT INTO "app_permissions" ("app_id", "code", "name", "category", "display_order")
           VALUES ($1, $2, $3, $4, $5)`,
          [appId, perm.code, perm.name, perm.category, perm.order],
        );
      }
    }

    const roleDefinitions = [
      { code: "viewer", name: "Viewer", description: "Read-only access", order: 1 },
      { code: "editor", name: "Editor", description: "Can view and edit content", order: 2 },
      { code: "manager", name: "Manager", description: "Full access except settings", order: 3 },
      { code: "administrator", name: "Administrator", description: "Full access including settings", order: 4, isDefault: false },
    ];

    const rolePermissionPatterns: Record<string, (code: string) => boolean> = {
      viewer: (code) => code.endsWith(":view"),
      editor: (code) => code.endsWith(":view") || code.endsWith(":create") || code.endsWith(":edit"),
      manager: (code) => !code.startsWith("settings:"),
      administrator: () => true,
    };

    const appRows = await queryRunner.query(`SELECT id, code FROM "apps"`);

    for (const app of appRows) {
      for (const role of roleDefinitions) {
        await queryRunner.query(
          `INSERT INTO "app_roles" ("app_id", "code", "name", "description", "is_default", "display_order")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [app.id, role.code, role.name, role.description, role.code === "viewer", role.order],
        );
      }

      const roleRows = await queryRunner.query(
        `SELECT id, code FROM "app_roles" WHERE app_id = $1`,
        [app.id],
      );

      const permissionRows = await queryRunner.query(
        `SELECT id, code FROM "app_permissions" WHERE app_id = $1`,
        [app.id],
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "app_role_permissions"`);
    await queryRunner.query(`DELETE FROM "app_roles"`);
    await queryRunner.query(`DELETE FROM "app_permissions"`);
    await queryRunner.query(`DELETE FROM "apps"`);
  }
}
