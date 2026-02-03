import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { NixController } from './nix.controller';
import { NixService } from './nix.service';
import { NixExtraction } from './entities/nix-extraction.entity';
import { NixLearning } from './entities/nix-learning.entity';
import { NixUserPreference } from './entities/nix-user-preference.entity';
import { NixClarification } from './entities/nix-clarification.entity';
import { NixExtractionRegion } from './entities/nix-extraction-region.entity';
import { ExcelExtractorService } from './services/excel-extractor.service';
import { PdfExtractorService } from './services/pdf-extractor.service';
import { WordExtractorService } from './services/word-extractor.service';
import { AiExtractionService } from './ai-providers/ai-extraction.service';
import { RegistrationDocumentVerifierService } from './services/registration-document-verifier.service';
import { DocumentVerificationService } from './services/document-verification.service';
import { AutoApprovalService } from './services/auto-approval.service';
import { DocumentAnnotationService } from './services/document-annotation.service';
import { SecureDocumentsModule } from '../secure-documents/secure-documents.module';
import { AdminModule } from '../admin/admin.module';
import { StorageModule } from '../storage/storage.module';
import { CustomerDocument } from '../customer/entities/customer-document.entity';
import { CustomerProfile } from '../customer/entities/customer-profile.entity';
import { CustomerOnboarding } from '../customer/entities/customer-onboarding.entity';
import { SupplierDocument } from '../supplier/entities/supplier-document.entity';
import { SupplierProfile } from '../supplier/entities/supplier-profile.entity';
import { SupplierOnboarding } from '../supplier/entities/supplier-onboarding.entity';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NixExtraction,
      NixLearning,
      NixUserPreference,
      NixClarification,
      NixExtractionRegion,
      CustomerDocument,
      CustomerProfile,
      CustomerOnboarding,
      SupplierDocument,
      SupplierProfile,
      SupplierOnboarding,
    ]),
    MulterModule.register({
      dest: './uploads/nix',
      limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB for tender documents
      },
    }),
    forwardRef(() => SecureDocumentsModule),
    AdminModule,
    StorageModule,
    EmailModule,
    AuditModule,
  ],
  controllers: [NixController],
  providers: [
    DocumentAnnotationService,
    NixService,
    ExcelExtractorService,
    PdfExtractorService,
    WordExtractorService,
    AiExtractionService,
    RegistrationDocumentVerifierService,
    DocumentVerificationService,
    AutoApprovalService,
  ],
  exports: [
    NixService,
    AiExtractionService,
    RegistrationDocumentVerifierService,
    DocumentVerificationService,
    AutoApprovalService,
    DocumentAnnotationService,
  ],
})
export class NixModule {}
