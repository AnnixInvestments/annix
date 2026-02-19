import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTeamFeaturesTables1790000000000 implements MigrationInterface {
  name = "CreateTeamFeaturesTables1790000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "annix_rep_organization_plan_enum" AS ENUM (
        'free',
        'team',
        'enterprise'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "annix_rep_organizations" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "owner_id" integer NOT NULL,
        "plan" "annix_rep_organization_plan_enum" NOT NULL DEFAULT 'free',
        "max_members" integer NOT NULL DEFAULT 5,
        "industry" character varying(100),
        "logo_url" character varying(500),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_annix_rep_organizations_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_annix_rep_organizations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "annix_rep_team_role_enum" AS ENUM (
        'admin',
        'manager',
        'rep'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "annix_rep_team_member_status_enum" AS ENUM (
        'active',
        'inactive',
        'suspended'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "annix_rep_team_members" (
        "id" SERIAL NOT NULL,
        "organization_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "role" "annix_rep_team_role_enum" NOT NULL DEFAULT 'rep',
        "status" "annix_rep_team_member_status_enum" NOT NULL DEFAULT 'active',
        "reports_to_id" integer,
        "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_annix_rep_team_members_org_user" UNIQUE ("organization_id", "user_id"),
        CONSTRAINT "PK_annix_rep_team_members" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "annix_rep_territories" (
        "id" SERIAL NOT NULL,
        "organization_id" integer NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "provinces" text,
        "cities" text,
        "bounds" json,
        "assigned_to_id" integer,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_annix_rep_territories" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "annix_rep_team_invitation_status_enum" AS ENUM (
        'pending',
        'accepted',
        'expired',
        'cancelled',
        'declined'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "annix_rep_team_invitations" (
        "id" SERIAL NOT NULL,
        "organization_id" integer NOT NULL,
        "invited_by_id" integer NOT NULL,
        "email" character varying(255) NOT NULL,
        "invitee_name" character varying(255),
        "token" character varying(255) NOT NULL,
        "role" "annix_rep_team_role_enum" NOT NULL DEFAULT 'rep',
        "territory_id" integer,
        "status" "annix_rep_team_invitation_status_enum" NOT NULL DEFAULT 'pending',
        "message" text,
        "expires_at" TIMESTAMP NOT NULL,
        "accepted_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_annix_rep_team_invitations_token" UNIQUE ("token"),
        CONSTRAINT "PK_annix_rep_team_invitations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "annix_rep_team_activity_type_enum" AS ENUM (
        'member_joined',
        'member_left',
        'prospect_created',
        'prospect_status_changed',
        'prospect_handoff',
        'meeting_completed',
        'deal_won',
        'deal_lost',
        'territory_assigned',
        'note_shared'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "annix_rep_team_activities" (
        "id" SERIAL NOT NULL,
        "organization_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "activity_type" "annix_rep_team_activity_type_enum" NOT NULL,
        "entity_type" character varying(50) NOT NULL,
        "entity_id" integer,
        "metadata" json,
        "description" text,
        "is_visible_to_team" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_annix_rep_team_activities" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_prospects"
      ADD COLUMN "organization_id" integer,
      ADD COLUMN "territory_id" integer,
      ADD COLUMN "is_shared_with_team" boolean NOT NULL DEFAULT false,
      ADD COLUMN "shared_notes_visible" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_meetings"
      ADD COLUMN "organization_id" integer,
      ADD COLUMN "notes_visible_to_team" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_rep_profiles"
      ADD COLUMN "organization_id" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_organizations"
      ADD CONSTRAINT "FK_annix_rep_organizations_owner"
      FOREIGN KEY ("owner_id")
      REFERENCES "user"("id")
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_team_members"
      ADD CONSTRAINT "FK_annix_rep_team_members_organization"
      FOREIGN KEY ("organization_id")
      REFERENCES "annix_rep_organizations"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_team_members"
      ADD CONSTRAINT "FK_annix_rep_team_members_user"
      FOREIGN KEY ("user_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_team_members"
      ADD CONSTRAINT "FK_annix_rep_team_members_reports_to"
      FOREIGN KEY ("reports_to_id")
      REFERENCES "user"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_territories"
      ADD CONSTRAINT "FK_annix_rep_territories_organization"
      FOREIGN KEY ("organization_id")
      REFERENCES "annix_rep_organizations"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_territories"
      ADD CONSTRAINT "FK_annix_rep_territories_assigned_to"
      FOREIGN KEY ("assigned_to_id")
      REFERENCES "user"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_team_invitations"
      ADD CONSTRAINT "FK_annix_rep_team_invitations_organization"
      FOREIGN KEY ("organization_id")
      REFERENCES "annix_rep_organizations"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_team_invitations"
      ADD CONSTRAINT "FK_annix_rep_team_invitations_invited_by"
      FOREIGN KEY ("invited_by_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_team_invitations"
      ADD CONSTRAINT "FK_annix_rep_team_invitations_territory"
      FOREIGN KEY ("territory_id")
      REFERENCES "annix_rep_territories"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_team_activities"
      ADD CONSTRAINT "FK_annix_rep_team_activities_organization"
      FOREIGN KEY ("organization_id")
      REFERENCES "annix_rep_organizations"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_team_activities"
      ADD CONSTRAINT "FK_annix_rep_team_activities_user"
      FOREIGN KEY ("user_id")
      REFERENCES "user"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_prospects"
      ADD CONSTRAINT "FK_annix_rep_prospects_organization"
      FOREIGN KEY ("organization_id")
      REFERENCES "annix_rep_organizations"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_prospects"
      ADD CONSTRAINT "FK_annix_rep_prospects_territory"
      FOREIGN KEY ("territory_id")
      REFERENCES "annix_rep_territories"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_meetings"
      ADD CONSTRAINT "FK_annix_rep_meetings_organization"
      FOREIGN KEY ("organization_id")
      REFERENCES "annix_rep_organizations"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "annix_rep_rep_profiles"
      ADD CONSTRAINT "FK_annix_rep_rep_profiles_organization"
      FOREIGN KEY ("organization_id")
      REFERENCES "annix_rep_organizations"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_annix_rep_organizations_owner" ON "annix_rep_organizations" ("owner_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_annix_rep_team_members_organization" ON "annix_rep_team_members" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_annix_rep_team_members_user" ON "annix_rep_team_members" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_annix_rep_territories_organization" ON "annix_rep_territories" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_annix_rep_territories_assigned_to" ON "annix_rep_territories" ("assigned_to_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_annix_rep_team_invitations_organization" ON "annix_rep_team_invitations" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_annix_rep_team_invitations_email" ON "annix_rep_team_invitations" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_annix_rep_team_activities_organization" ON "annix_rep_team_activities" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_annix_rep_team_activities_user" ON "annix_rep_team_activities" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_annix_rep_team_activities_created_at" ON "annix_rep_team_activities" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_annix_rep_prospects_organization" ON "annix_rep_prospects" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_annix_rep_prospects_territory" ON "annix_rep_prospects" ("territory_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_annix_rep_meetings_organization" ON "annix_rep_meetings" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_annix_rep_rep_profiles_organization" ON "annix_rep_rep_profiles" ("organization_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_rep_profiles_organization"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_meetings_organization"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_prospects_territory"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_prospects_organization"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_team_activities_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_team_activities_user"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_team_activities_organization"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_team_invitations_email"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_team_invitations_organization"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_territories_assigned_to"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_territories_organization"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_team_members_user"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_team_members_organization"`);
    await queryRunner.query(`DROP INDEX "IDX_annix_rep_organizations_owner"`);

    await queryRunner.query(
      `ALTER TABLE "annix_rep_rep_profiles" DROP CONSTRAINT "FK_annix_rep_rep_profiles_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_meetings" DROP CONSTRAINT "FK_annix_rep_meetings_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_prospects" DROP CONSTRAINT "FK_annix_rep_prospects_territory"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_prospects" DROP CONSTRAINT "FK_annix_rep_prospects_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_team_activities" DROP CONSTRAINT "FK_annix_rep_team_activities_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_team_activities" DROP CONSTRAINT "FK_annix_rep_team_activities_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_team_invitations" DROP CONSTRAINT "FK_annix_rep_team_invitations_territory"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_team_invitations" DROP CONSTRAINT "FK_annix_rep_team_invitations_invited_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_team_invitations" DROP CONSTRAINT "FK_annix_rep_team_invitations_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_territories" DROP CONSTRAINT "FK_annix_rep_territories_assigned_to"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_territories" DROP CONSTRAINT "FK_annix_rep_territories_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_team_members" DROP CONSTRAINT "FK_annix_rep_team_members_reports_to"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_team_members" DROP CONSTRAINT "FK_annix_rep_team_members_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_team_members" DROP CONSTRAINT "FK_annix_rep_team_members_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "annix_rep_organizations" DROP CONSTRAINT "FK_annix_rep_organizations_owner"`,
    );

    await queryRunner.query(`ALTER TABLE "annix_rep_rep_profiles" DROP COLUMN "organization_id"`);
    await queryRunner.query(`ALTER TABLE "annix_rep_meetings" DROP COLUMN "notes_visible_to_team"`);
    await queryRunner.query(`ALTER TABLE "annix_rep_meetings" DROP COLUMN "organization_id"`);
    await queryRunner.query(`ALTER TABLE "annix_rep_prospects" DROP COLUMN "shared_notes_visible"`);
    await queryRunner.query(`ALTER TABLE "annix_rep_prospects" DROP COLUMN "is_shared_with_team"`);
    await queryRunner.query(`ALTER TABLE "annix_rep_prospects" DROP COLUMN "territory_id"`);
    await queryRunner.query(`ALTER TABLE "annix_rep_prospects" DROP COLUMN "organization_id"`);

    await queryRunner.query(`DROP TABLE "annix_rep_team_activities"`);
    await queryRunner.query(`DROP TYPE "annix_rep_team_activity_type_enum"`);
    await queryRunner.query(`DROP TABLE "annix_rep_team_invitations"`);
    await queryRunner.query(`DROP TYPE "annix_rep_team_invitation_status_enum"`);
    await queryRunner.query(`DROP TABLE "annix_rep_territories"`);
    await queryRunner.query(`DROP TABLE "annix_rep_team_members"`);
    await queryRunner.query(`DROP TYPE "annix_rep_team_member_status_enum"`);
    await queryRunner.query(`DROP TYPE "annix_rep_team_role_enum"`);
    await queryRunner.query(`DROP TABLE "annix_rep_organizations"`);
    await queryRunner.query(`DROP TYPE "annix_rep_organization_plan_enum"`);
  }
}
