import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { UserSyncController } from "./user-sync.controller";
import { UserSyncService } from "./user-sync.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: "User", schema: UserSchema }])],
  controllers: [UserSyncController],
  providers: [UserSyncService, repositoryProvider(UserRepository, MongoUserRepository)],
  exports: [UserSyncService],
})
export class UserSyncModule {}
