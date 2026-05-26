import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { UserRole } from "./entities/user-role.entity";
import { UserRoleSchema } from "./schemas/user-role.schema";
import { UserRolesController } from "./user-roles.controller";
import { UserRoleRepository } from "./user-roles.repository";
import { MongoUserRoleRepository } from "./user-roles.repository.mongo";
import { PostgresUserRoleRepository } from "./user-roles.repository.postgres";
import { UserRolesService } from "./user-roles.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "UserRole", schema: UserRoleSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([UserRole])]),
  ],
  controllers: [UserRolesController],
  providers: [
    UserRolesService,
    repositoryProvider(UserRoleRepository, PostgresUserRoleRepository, MongoUserRoleRepository),
  ],
  exports: [UserRolesService],
})
export class UserRolesModule {}
