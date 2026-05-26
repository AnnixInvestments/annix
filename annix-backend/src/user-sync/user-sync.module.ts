import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { UserSyncController } from "./user-sync.controller";
import { UserSyncService } from "./user-sync.service";

@Module({
  imports: [
    ...(isMongoDriver() ? [MongooseModule.forFeature([{ name: "User", schema: UserSchema }])] : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([User])]),
  ],
  controllers: [UserSyncController],
  providers: [
    UserSyncService,
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
  ],
  exports: [UserSyncService],
})
export class UserSyncModule {}
