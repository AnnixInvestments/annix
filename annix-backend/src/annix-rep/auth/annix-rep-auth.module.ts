import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { RbacBridgeModule } from "../../rbac/rbac-bridge.module";
import { UserSchema } from "../../user/schemas/user.schema";
import { UserRepository } from "../../user/user.repository";
import { MongoUserRepository } from "../../user/user.repository.mongo";
import { UserRoleSchema } from "../../user-roles/schemas/user-role.schema";
import { UserRoleRepository } from "../../user-roles/user-roles.repository";
import { MongoUserRoleRepository } from "../../user-roles/user-roles.repository.mongo";
import { RepProfileRepository } from "../rep-profile/rep-profile.repository";
import { MongoRepProfileRepository } from "../rep-profile/rep-profile.repository.mongo";
import { RepProfileSchema } from "../rep-profile/schemas/rep-profile.schema";
import { TeamMemberSchema } from "../schemas/team-member.schema";
import { TeamService } from "../services/team.service";
import { TeamMemberRepository } from "../team-member.repository";
import { MongoTeamMemberRepository } from "../team-member.repository.mongo";
import { AnnixRepAuthController } from "./annix-rep-auth.controller";
import { AnnixRepAuthService } from "./annix-rep-auth.service";
import { AnnixRepSessionRepository } from "./annix-rep-session.repository";
import { MongoAnnixRepSessionRepository } from "./annix-rep-session.repository.mongo";
import { AnnixRepAuthGuard, TeamRoleGuard } from "./guards";
import { OAuthLoginProvider } from "./oauth-login.provider";
import { AnnixRepSessionSchema } from "./schemas/annix-rep-session.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "AnnixRepSession", schema: AnnixRepSessionSchema },
      { name: "RepProfile", schema: RepProfileSchema },
      { name: "TeamMember", schema: TeamMemberSchema },
      { name: "User", schema: UserSchema },
      { name: "UserRole", schema: UserRoleSchema },
    ]),
    RbacBridgeModule,
  ],
  controllers: [AnnixRepAuthController],
  providers: [
    AnnixRepAuthService,
    AnnixRepAuthGuard,
    TeamService,
    TeamRoleGuard,
    OAuthLoginProvider,
    repositoryProvider(AnnixRepSessionRepository, MongoAnnixRepSessionRepository),
    repositoryProvider(RepProfileRepository, MongoRepProfileRepository),
    repositoryProvider(TeamMemberRepository, MongoTeamMemberRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(UserRoleRepository, MongoUserRoleRepository),
  ],
  exports: [AnnixRepAuthService, AnnixRepAuthGuard, TeamService, TeamRoleGuard],
})
export class AnnixRepAuthModule {}
