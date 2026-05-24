import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * FuturePath adds Student / Parent / Teacher roles to the EXISTING Annix Orbit
 * RBAC app (it is NOT a new app — issue #304). Employer/admin roles already
 * exist (viewer/editor/manager/administrator). Idempotent.
 */
export class AddOrbitEducationRoles1820100002200 implements MigrationInterface {
  private readonly APP_CODE = "annix-orbit";

  private readonly ROLES: { code: string; name: string; description: string; order: number }[] = [
    {
      code: "student",
      name: "Student",
      description:
        "FuturePath learner — manages their own education profile, results, applications and AI mentor.",
      order: 20,
    },
    {
      code: "parent",
      name: "Parent / Guardian",
      description:
        "Guardian of a minor learner — grants consent and views the linked student's progress.",
      order: 21,
    },
    {
      code: "teacher",
      name: "Teacher",
      description: "Educator — views cohort readiness and supports students (Phase 3).",
      order: 22,
    },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const apps: { id: number }[] = await queryRunner.query("SELECT id FROM apps WHERE code = $1", [
      this.APP_CODE,
    ]);
    const appId = apps[0]?.id;
    if (!appId) return;

    for (const role of this.ROLES) {
      await queryRunner.query(
        `INSERT INTO app_roles (app_id, code, name, description, is_default, display_order)
         VALUES ($1, $2, $3, $4, false, $5)
         ON CONFLICT DO NOTHING`,
        [appId, role.code, role.name, role.description, role.order],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM app_roles
       WHERE code = ANY($2)
         AND app_id = (SELECT id FROM apps WHERE code = $1)`,
      [this.APP_CODE, this.ROLES.map((r) => r.code)],
    );
  }
}
