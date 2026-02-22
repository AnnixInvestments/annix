import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../../user/entities/user.entity";
import { UserRole } from "../../user-roles/entities/user-role.entity";
import { TeamMember } from "../entities/team-member.entity";
import { RepProfile } from "../rep-profile/rep-profile.entity";
import { TeamService } from "../services/team.service";
import { AnnixRepSession } from "./entities";
import { AnnixRepAuthController } from "./fieldflow-auth.controller";
import { AnnixRepAuthService } from "./fieldflow-auth.service";
import { AnnixRepAuthGuard, TeamRoleGuard } from "./guards";
import { OAuthLoginProvider } from "./oauth-login.provider";

@Module({
  imports: [TypeOrmModule.forFeature([AnnixRepSession, User, UserRole, RepProfile, TeamMember])],
  controllers: [AnnixRepAuthController],
  providers: [
    AnnixRepAuthService,
    AnnixRepAuthGuard,
    TeamService,
    TeamRoleGuard,
    OAuthLoginProvider,
  ],
  exports: [AnnixRepAuthService, AnnixRepAuthGuard, TeamService, TeamRoleGuard],
})
export class AnnixRepAuthModule {}
