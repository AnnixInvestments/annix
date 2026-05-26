import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { AuditLogRepository } from "./audit.repository";
import { MongoAuditLogRepository } from "./audit.repository.mongo";
import { PostgresAuditLogRepository } from "./audit.repository.postgres";
import { AuditService } from "./audit.service";
import { AuditLog } from "./entities/audit-log.entity";
import { AuditLogSchema } from "./schemas/audit-log.schema";

@Global()
@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "AuditLog", schema: AuditLogSchema },
            { name: "User", schema: UserSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([AuditLog, User])]),
  ],
  providers: [
    AuditService,
    repositoryProvider(AuditLogRepository, PostgresAuditLogRepository, MongoAuditLogRepository),
  ],
  exports: [AuditService],
})
export class AuditModule {}
