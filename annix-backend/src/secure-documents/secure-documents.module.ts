import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { StorageModule } from "../storage/storage.module";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { SecureDocumentSchema } from "./schemas/secure-document.schema";
import { SecureEntityFolderSchema } from "./schemas/secure-entity-folder.schema";
import { SecureDocumentsController } from "./secure-documents.controller";
import {
  SecureDocumentRepository,
  SecureEntityFolderRepository,
} from "./secure-documents.repository";
import {
  MongoSecureDocumentRepository,
  MongoSecureEntityFolderRepository,
} from "./secure-documents.repository.mongo";
import { SecureDocumentsService } from "./secure-documents.service";
import { SecureDocumentsCleanupService } from "./secure-documents-cleanup.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "SecureDocument", schema: SecureDocumentSchema },
      { name: "SecureEntityFolder", schema: SecureEntityFolderSchema },
      { name: "User", schema: UserSchema },
    ]),
    ConfigModule,
    forwardRef(() => AdminModule),
    StorageModule,
  ],
  controllers: [SecureDocumentsController],
  providers: [
    SecureDocumentsService,
    SecureDocumentsCleanupService,
    repositoryProvider(SecureDocumentRepository, MongoSecureDocumentRepository),
    repositoryProvider(SecureEntityFolderRepository, MongoSecureEntityFolderRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
  ],
  exports: [SecureDocumentsService, SecureDocumentsCleanupService],
})
export class SecureDocumentsModule {}
