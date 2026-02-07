import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/entities/user.entity";
import { AuditService } from "./audit.service";
import { AuditLog } from "./entities/audit-log.entity";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, User])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
