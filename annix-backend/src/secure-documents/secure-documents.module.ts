import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { StorageModule } from "../storage/storage.module";
import { User } from "../user/entities/user.entity";
import { SecureDocument } from "./secure-document.entity";
import { SecureDocumentsController } from "./secure-documents.controller";
import { SecureDocumentsService } from "./secure-documents.service";
import { SecureDocumentsCleanupService } from "./secure-documents-cleanup.service";
import { SecureEntityFolder } from "./secure-entity-folder.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([SecureDocument, SecureEntityFolder, User]),
    ConfigModule,
    forwardRef(() => AdminModule),
    StorageModule,
  ],
  controllers: [SecureDocumentsController],
  providers: [SecureDocumentsService, SecureDocumentsCleanupService],
  exports: [SecureDocumentsService, SecureDocumentsCleanupService],
})
export class SecureDocumentsModule {}
