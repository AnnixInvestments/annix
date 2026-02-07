import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/user/entities/user.entity";
import { UserRole } from "./entities/user-role.entity";
import { UserRolesController } from "./user-roles.controller";
import { UserRolesService } from "./user-roles.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserRole, User])],
  controllers: [UserRolesController],
  providers: [UserRolesService],
  exports: [UserRolesService],
})
export class UserRolesModule {}
