import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SecureDocument } from './secure-document.entity';
import { SecureEntityFolder } from './secure-entity-folder.entity';
import { SecureDocumentsService } from './secure-documents.service';
import { SecureDocumentsCleanupService } from './secure-documents-cleanup.service';
import { SecureDocumentsController } from './secure-documents.controller';
import { User } from '../user/entities/user.entity';
import { AdminModule } from '../admin/admin.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SecureDocument, SecureEntityFolder, User]),
    ConfigModule,
    AdminModule,
    StorageModule,
  ],
  controllers: [SecureDocumentsController],
  providers: [SecureDocumentsService, SecureDocumentsCleanupService],
  exports: [SecureDocumentsService, SecureDocumentsCleanupService],
})
export class SecureDocumentsModule {}
