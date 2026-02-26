import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/entities/user.entity";
import { UserSyncController } from "./user-sync.controller";
import { UserSyncService } from "./user-sync.service";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserSyncController],
  providers: [UserSyncService],
  exports: [UserSyncService],
})
export class UserSyncModule {}
