import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SecureDocument } from './secure-document.entity';
import { SecureDocumentsService } from './secure-documents.service';
import { SecureDocumentsController } from './secure-documents.controller';
import { User } from '../user/entities/user.entity';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SecureDocument, User]),
    ConfigModule,
    AdminModule,
  ],
  controllers: [SecureDocumentsController],
  providers: [SecureDocumentsService],
  exports: [SecureDocumentsService],
})
export class SecureDocumentsModule {}
