import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { UserRoleSchema } from "../user-roles/schemas/user-role.schema";
import { UserRoleRepository } from "../user-roles/user-roles.repository";
import { MongoUserRoleRepository } from "../user-roles/user-roles.repository.mongo";
import { UserSchema } from "./schemas/user.schema";
import { UserController } from "./user.controller";
import { UserRepository } from "./user.repository";
import { MongoUserRepository } from "./user.repository.mongo";
import { UserService } from "./user.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "User", schema: UserSchema },
      { name: "UserRole", schema: UserRoleSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(UserRoleRepository, MongoUserRoleRepository),
  ],
})
export class UserModule {}
