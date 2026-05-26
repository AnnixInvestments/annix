import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { UserRole } from "../user-roles/entities/user-role.entity";
import { UserRoleSchema } from "../user-roles/schemas/user-role.schema";
import { UserRoleRepository } from "../user-roles/user-roles.repository";
import { MongoUserRoleRepository } from "../user-roles/user-roles.repository.mongo";
import { PostgresUserRoleRepository } from "../user-roles/user-roles.repository.postgres";
import { User } from "./entities/user.entity";
import { UserSchema } from "./schemas/user.schema";
import { UserController } from "./user.controller";
import { UserRepository } from "./user.repository";
import { MongoUserRepository } from "./user.repository.mongo";
import { PostgresUserRepository } from "./user.repository.postgres";
import { UserService } from "./user.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "User", schema: UserSchema },
            { name: "UserRole", schema: UserRoleSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([User, UserRole])]),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
    repositoryProvider(UserRoleRepository, PostgresUserRoleRepository, MongoUserRoleRepository),
  ],
})
export class UserModule {}
