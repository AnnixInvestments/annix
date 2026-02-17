import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../../user/entities/user.entity";
import { UserRole } from "../../user-roles/entities/user-role.entity";
import { RepProfile } from "../rep-profile/rep-profile.entity";
import { FieldFlowSession } from "./entities";
import { FieldFlowAuthController } from "./fieldflow-auth.controller";
import { FieldFlowAuthService } from "./fieldflow-auth.service";
import { FieldFlowAuthGuard } from "./guards";

@Module({
  imports: [TypeOrmModule.forFeature([FieldFlowSession, User, UserRole, RepProfile])],
  controllers: [FieldFlowAuthController],
  providers: [FieldFlowAuthService, FieldFlowAuthGuard],
  exports: [FieldFlowAuthService, FieldFlowAuthGuard],
})
export class FieldFlowAuthModule {}
