import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { NixController } from './nix.controller';
import { NixService } from './nix.service';
import { NixExtraction } from './entities/nix-extraction.entity';
import { NixLearning } from './entities/nix-learning.entity';
import { NixUserPreference } from './entities/nix-user-preference.entity';
import { NixClarification } from './entities/nix-clarification.entity';
import { ExcelExtractorService } from './services/excel-extractor.service';
import { PdfExtractorService } from './services/pdf-extractor.service';
import { AiExtractionService } from './ai-providers/ai-extraction.service';
import { RegistrationDocumentVerifierService } from './services/registration-document-verifier.service';
import { SecureDocumentsModule } from '../secure-documents/secure-documents.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NixExtraction,
      NixLearning,
      NixUserPreference,
      NixClarification,
    ]),
    MulterModule.register({
      dest: './uploads/nix',
      limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB for tender documents
      },
    }),
    forwardRef(() => SecureDocumentsModule),
    AdminModule,
  ],
  controllers: [NixController],
  providers: [
    NixService,
    ExcelExtractorService,
    PdfExtractorService,
    AiExtractionService,
    RegistrationDocumentVerifierService,
  ],
  exports: [NixService, AiExtractionService, RegistrationDocumentVerifierService],
})
export class NixModule {}
