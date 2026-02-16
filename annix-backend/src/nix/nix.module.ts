import { forwardRef, Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { memoryStorage } from "multer";
import { AdminModule } from "../admin/admin.module";
import { AuditModule } from "../audit/audit.module";
import { AnyUserAuthGuard } from "../auth/guards/any-user-auth.guard";
import { CustomerModule } from "../customer/customer.module";
import { CustomerDocument } from "../customer/entities/customer-document.entity";
import { CustomerOnboarding } from "../customer/entities/customer-onboarding.entity";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { EmailModule } from "../email/email.module";
import { SecureDocumentsModule } from "../secure-documents/secure-documents.module";
import { StorageModule } from "../storage/storage.module";
import { SupplierDocument } from "../supplier/entities/supplier-document.entity";
import { SupplierOnboarding } from "../supplier/entities/supplier-onboarding.entity";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { SupplierModule } from "../supplier/supplier.module";
import { AiExtractionService } from "./ai-providers/ai-extraction.service";
import { NixChatController } from "./controllers/nix-chat.controller";
import { CustomFieldValue } from "./entities/custom-field-value.entity";
import { NixChatMessage } from "./entities/nix-chat-message.entity";
import { NixChatSession } from "./entities/nix-chat-session.entity";
import { NixClarification } from "./entities/nix-clarification.entity";
import { NixExtraction } from "./entities/nix-extraction.entity";
import { NixExtractionRegion } from "./entities/nix-extraction-region.entity";
import { NixLearning } from "./entities/nix-learning.entity";
import { NixUserPreference } from "./entities/nix-user-preference.entity";
import { NixController } from "./nix.controller";
import { NixService } from "./nix.service";
import { AutoApprovalService } from "./services/auto-approval.service";
import { CustomFieldService } from "./services/custom-field.service";
import { DocumentAnnotationService } from "./services/document-annotation.service";
import { DocumentVerificationService } from "./services/document-verification.service";
import { ExcelExtractorService } from "./services/excel-extractor.service";
import { NixChatService } from "./services/nix-chat.service";
import { NixItemParserService } from "./services/nix-item-parser.service";
import { NixValidationService } from "./services/nix-validation.service";
import { PdfExtractorService } from "./services/pdf-extractor.service";
import { RegistrationDocumentVerifierService } from "./services/registration-document-verifier.service";
import { WordExtractorService } from "./services/word-extractor.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NixExtraction,
      NixLearning,
      NixUserPreference,
      NixClarification,
      NixExtractionRegion,
      NixChatSession,
      NixChatMessage,
      CustomFieldValue,
      CustomerDocument,
      CustomerProfile,
      CustomerOnboarding,
      SupplierDocument,
      SupplierProfile,
      SupplierOnboarding,
    ]),
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB for tender documents
      },
    }),
    forwardRef(() => SecureDocumentsModule),
    forwardRef(() => AdminModule),
    forwardRef(() => CustomerModule),
    forwardRef(() => SupplierModule),
    StorageModule,
    EmailModule,
    AuditModule,
  ],
  controllers: [NixController, NixChatController],
  providers: [
    DocumentAnnotationService,
    CustomFieldService,
    NixService,
    NixChatService,
    NixItemParserService,
    NixValidationService,
    ExcelExtractorService,
    PdfExtractorService,
    WordExtractorService,
    AiExtractionService,
    RegistrationDocumentVerifierService,
    DocumentVerificationService,
    AutoApprovalService,
    AnyUserAuthGuard,
  ],
  exports: [
    NixService,
    NixChatService,
    NixValidationService,
    AiExtractionService,
    RegistrationDocumentVerifierService,
    DocumentVerificationService,
    AutoApprovalService,
    DocumentAnnotationService,
    CustomFieldService,
  ],
})
export class NixModule {}
