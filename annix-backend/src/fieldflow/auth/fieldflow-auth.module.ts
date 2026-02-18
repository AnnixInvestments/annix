import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../../user/entities/user.entity";
import { UserRole } from "../../user-roles/entities/user-role.entity";
import { RepProfile } from "../rep-profile/rep-profile.entity";
import { AnnixRepSession } from "./entities";
import { AnnixRepAuthController } from "./fieldflow-auth.controller";
import { AnnixRepAuthService } from "./fieldflow-auth.service";
import { AnnixRepAuthGuard } from "./guards";

@Module({
  imports: [TypeOrmModule.forFeature([AnnixRepSession, User, UserRole, RepProfile])],
  controllers: [AnnixRepAuthController],
  providers: [AnnixRepAuthService, AnnixRepAuthGuard],
  exports: [AnnixRepAuthService, AnnixRepAuthGuard],
})
export class AnnixRepAuthModule {}
