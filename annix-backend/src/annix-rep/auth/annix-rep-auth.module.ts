import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../../lib/persistence/database-driver";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { RbacBridgeModule } from "../../rbac/rbac-bridge.module";
import { User } from "../../user/entities/user.entity";
import { UserSchema } from "../../user/schemas/user.schema";
import { UserRepository } from "../../user/user.repository";
import { MongoUserRepository } from "../../user/user.repository.mongo";
import { PostgresUserRepository } from "../../user/user.repository.postgres";
import { UserRole } from "../../user-roles/entities/user-role.entity";
import { UserRoleSchema } from "../../user-roles/schemas/user-role.schema";
import { UserRoleRepository } from "../../user-roles/user-roles.repository";
import { MongoUserRoleRepository } from "../../user-roles/user-roles.repository.mongo";
import { PostgresUserRoleRepository } from "../../user-roles/user-roles.repository.postgres";
import { TeamMember } from "../entities/team-member.entity";
import { RepProfile } from "../rep-profile/rep-profile.entity";
import { RepProfileRepository } from "../rep-profile/rep-profile.repository";
import { MongoRepProfileRepository } from "../rep-profile/rep-profile.repository.mongo";
import { PostgresRepProfileRepository } from "../rep-profile/rep-profile.repository.postgres";
import { RepProfileSchema } from "../rep-profile/schemas/rep-profile.schema";
import { TeamMemberSchema } from "../schemas/team-member.schema";
import { TeamService } from "../services/team.service";
import { TeamMemberRepository } from "../team-member.repository";
import { MongoTeamMemberRepository } from "../team-member.repository.mongo";
import { PostgresTeamMemberRepository } from "../team-member.repository.postgres";
import { AnnixRepAuthController } from "./annix-rep-auth.controller";
import { AnnixRepAuthService } from "./annix-rep-auth.service";
import { AnnixRepSessionRepository } from "./annix-rep-session.repository";
import { MongoAnnixRepSessionRepository } from "./annix-rep-session.repository.mongo";
import { PostgresAnnixRepSessionRepository } from "./annix-rep-session.repository.postgres";
import { AnnixRepSession } from "./entities";
import { AnnixRepAuthGuard, TeamRoleGuard } from "./guards";
import { OAuthLoginProvider } from "./oauth-login.provider";
import { AnnixRepSessionSchema } from "./schemas/annix-rep-session.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "AnnixRepSession", schema: AnnixRepSessionSchema },
            { name: "RepProfile", schema: RepProfileSchema },
            { name: "TeamMember", schema: TeamMemberSchema },
            { name: "User", schema: UserSchema },
            { name: "UserRole", schema: UserRoleSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [TypeOrmModule.forFeature([AnnixRepSession, User, UserRole, RepProfile, TeamMember])]),
    RbacBridgeModule,
  ],
  controllers: [AnnixRepAuthController],
  providers: [
    AnnixRepAuthService,
    AnnixRepAuthGuard,
    TeamService,
    TeamRoleGuard,
    OAuthLoginProvider,
    repositoryProvider(
      AnnixRepSessionRepository,
      PostgresAnnixRepSessionRepository,
      MongoAnnixRepSessionRepository,
    ),
    repositoryProvider(
      RepProfileRepository,
      PostgresRepProfileRepository,
      MongoRepProfileRepository,
    ),
    repositoryProvider(
      TeamMemberRepository,
      PostgresTeamMemberRepository,
      MongoTeamMemberRepository,
    ),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
    repositoryProvider(UserRoleRepository, PostgresUserRoleRepository, MongoUserRoleRepository),
  ],
  exports: [AnnixRepAuthService, AnnixRepAuthGuard, TeamService, TeamRoleGuard],
})
export class AnnixRepAuthModule {}
