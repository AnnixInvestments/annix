import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { AppRepository, AppRoleRepository, UserAppAccessRepository } from "./rbac.repository";
import {
  MongoAppRepository,
  MongoAppRoleRepository,
  MongoUserAppAccessRepository,
} from "./rbac.repository.mongo";
import { RbacBridgeService } from "./rbac-bridge.service";
import { AppSchema } from "./schemas/app.schema";
import { AppRoleSchema } from "./schemas/app-role.schema";
import { UserAppAccessSchema } from "./schemas/user-app-access.schema";

/**
 * Minimal cycle-free module exposing only {@link RbacBridgeService} —
 * the idempotent app-access grant primitive (issue #311 step 4.1).
 *
 * Per-portal auth modules (Annix Pulse, Teacher Assistant) import this
 * to anchor freshly-registered users into universal RBAC without
 * pulling in the full RbacModule (which depends on AdminModule and
 * would create import cycles).
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "App", schema: AppSchema },
      { name: "AppRole", schema: AppRoleSchema },
      { name: "UserAppAccess", schema: UserAppAccessSchema },
    ]),
  ],
  providers: [
    RbacBridgeService,
    repositoryProvider(AppRepository, MongoAppRepository),
    repositoryProvider(AppRoleRepository, MongoAppRoleRepository),
    repositoryProvider(UserAppAccessRepository, MongoUserAppAccessRepository),
  ],
  exports: [RbacBridgeService],
})
export class RbacBridgeModule {}
