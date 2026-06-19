import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { UserSchema } from "../user/schemas/user.schema";
import { AuditLogRepository } from "./audit.repository";
import { MongoAuditLogRepository } from "./audit.repository.mongo";
import { AuditService } from "./audit.service";
import { AuditLogSchema } from "./schemas/audit-log.schema";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "AuditLog", schema: AuditLogSchema },
      { name: "User", schema: UserSchema },
    ]),
  ],
  providers: [AuditService, repositoryProvider(AuditLogRepository, MongoAuditLogRepository)],
  exports: [AuditService],
})
export class AuditModule {}
