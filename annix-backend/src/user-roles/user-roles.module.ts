import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { UserRoleSchema } from "./schemas/user-role.schema";
import { UserRolesController } from "./user-roles.controller";
import { UserRoleRepository } from "./user-roles.repository";
import { MongoUserRoleRepository } from "./user-roles.repository.mongo";
import { UserRolesService } from "./user-roles.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: "UserRole", schema: UserRoleSchema }])],
  controllers: [UserRolesController],
  providers: [UserRolesService, repositoryProvider(UserRoleRepository, MongoUserRoleRepository)],
  exports: [UserRolesService],
})
export class UserRolesModule {}
