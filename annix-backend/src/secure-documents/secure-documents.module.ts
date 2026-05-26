import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { StorageModule } from "../storage/storage.module";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { SecureDocumentSchema } from "./schemas/secure-document.schema";
import { SecureEntityFolderSchema } from "./schemas/secure-entity-folder.schema";
import { SecureDocument } from "./secure-document.entity";
import { SecureDocumentsController } from "./secure-documents.controller";
import {
  SecureDocumentRepository,
  SecureEntityFolderRepository,
} from "./secure-documents.repository";
import {
  MongoSecureDocumentRepository,
  MongoSecureEntityFolderRepository,
} from "./secure-documents.repository.mongo";
import {
  PostgresSecureDocumentRepository,
  PostgresSecureEntityFolderRepository,
} from "./secure-documents.repository.postgres";
import { SecureDocumentsService } from "./secure-documents.service";
import { SecureDocumentsCleanupService } from "./secure-documents-cleanup.service";
import { SecureEntityFolder } from "./secure-entity-folder.entity";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "SecureDocument", schema: SecureDocumentSchema },
            { name: "SecureEntityFolder", schema: SecureEntityFolderSchema },
            { name: "User", schema: UserSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [TypeOrmModule.forFeature([SecureDocument, SecureEntityFolder, User])]),
    ConfigModule,
    forwardRef(() => AdminModule),
    StorageModule,
  ],
  controllers: [SecureDocumentsController],
  providers: [
    SecureDocumentsService,
    SecureDocumentsCleanupService,
    repositoryProvider(
      SecureDocumentRepository,
      PostgresSecureDocumentRepository,
      MongoSecureDocumentRepository,
    ),
    repositoryProvider(
      SecureEntityFolderRepository,
      PostgresSecureEntityFolderRepository,
      MongoSecureEntityFolderRepository,
    ),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
  ],
  exports: [SecureDocumentsService, SecureDocumentsCleanupService],
})
export class SecureDocumentsModule {}
