import * as os from "node:os";
import * as path from "node:path";
import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { diskStorage } from "multer";
import { AdminModule } from "../admin/admin.module";
import { AuditModule } from "../audit/audit.module";
import { AnyUserAuthGuard } from "../auth/guards/any-user-auth.guard";
import { CustomerModule } from "../customer/customer.module";
import { CustomerDocumentRepository } from "../customer/customer-document.repository";
import { MongoCustomerDocumentRepository } from "../customer/customer-document.repository.mongo";
import { PostgresCustomerDocumentRepository } from "../customer/customer-document.repository.postgres";
import { CustomerOnboardingRepository } from "../customer/customer-onboarding.repository";
import { MongoCustomerOnboardingRepository } from "../customer/customer-onboarding.repository.mongo";
import { PostgresCustomerOnboardingRepository } from "../customer/customer-onboarding.repository.postgres";
import { CustomerProfileRepository } from "../customer/customer-profile.repository";
import { MongoCustomerProfileRepository } from "../customer/customer-profile.repository.mongo";
import { PostgresCustomerProfileRepository } from "../customer/customer-profile.repository.postgres";
import { CustomerDocument } from "../customer/entities/customer-document.entity";
import { CustomerOnboarding } from "../customer/entities/customer-onboarding.entity";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { CustomerDocumentSchema } from "../customer/schemas/customer-document.schema";
import { CustomerOnboardingSchema } from "../customer/schemas/customer-onboarding.schema";
import { CustomerProfileSchema } from "../customer/schemas/customer-profile.schema";
import { EmailModule } from "../email/email.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MetricsModule } from "../metrics/metrics.module";
import { SaMine } from "../mines/entities/sa-mine.entity";
import { MinesModule } from "../mines/mines.module";
import { SaMineRepository } from "../mines/sa-mine.repository";
import { MongoSaMineRepository } from "../mines/sa-mine.repository.mongo";
import { PostgresSaMineRepository } from "../mines/sa-mine.repository.postgres";
import { SaMineSchema } from "../mines/schemas/sa-mine.schema";
import { CompanyRepository } from "../platform/company.repository";
import { MongoCompanyRepository } from "../platform/company.repository.mongo";
import { PostgresCompanyRepository } from "../platform/company.repository.postgres";
import { Company } from "../platform/entities/company.entity";
import { CompanySchema } from "../platform/schemas/company.schema";
import { RfqModule } from "../rfq/rfq.module";
import { SecureDocumentsModule } from "../secure-documents/secure-documents.module";
import { JobCard } from "../stock-control/entities/job-card.entity";
import { JobCardLineItem } from "../stock-control/entities/job-card-line-item.entity";
import { StockControlCompany } from "../stock-control/entities/stock-control-company.entity";
import { StockControlCompanyRepository } from "../stock-control/repositories/stock-control-company.repository";
import { MongoStockControlCompanyRepository } from "../stock-control/repositories/stock-control-company.repository.mongo";
import { PostgresStockControlCompanyRepository } from "../stock-control/repositories/stock-control-company.repository.postgres";
import { StockControlCompanySchema } from "../stock-control/schemas/stock-control-company.schema";
import { CompanyEmailService } from "../stock-control/services/company-email.service";
import { StorageModule } from "../storage/storage.module";
import { SupplierDocument } from "../supplier/entities/supplier-document.entity";
import { SupplierOnboarding } from "../supplier/entities/supplier-onboarding.entity";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { SupplierDocumentSchema } from "../supplier/schemas/supplier-document.schema";
import { SupplierOnboardingSchema } from "../supplier/schemas/supplier-onboarding.schema";
import { SupplierProfileSchema } from "../supplier/schemas/supplier-profile.schema";
import { SupplierModule } from "../supplier/supplier.module";
import { SupplierDocumentRepository } from "../supplier/supplier-document.repository";
import { MongoSupplierDocumentRepository } from "../supplier/supplier-document.repository.mongo";
import { PostgresSupplierDocumentRepository } from "../supplier/supplier-document.repository.postgres";
import { SupplierOnboardingRepository } from "../supplier/supplier-onboarding.repository";
import { MongoSupplierOnboardingRepository } from "../supplier/supplier-onboarding.repository.mongo";
import { PostgresSupplierOnboardingRepository } from "../supplier/supplier-onboarding.repository.postgres";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { MongoSupplierProfileRepository } from "../supplier/supplier-profile.repository.mongo";
import { PostgresSupplierProfileRepository } from "../supplier/supplier-profile.repository.postgres";
import { UserSchema } from "../user/schemas/user.schema";
import { AiChatService } from "./ai-providers/ai-chat.service";
import { AiExtractionService } from "./ai-providers/ai-extraction.service";
import {
  NixAppRouterService,
  NixCapabilityRegistry,
  NixGuideLoader,
  WalkthroughEngine,
} from "./capabilities";
import { NixCapabilitiesController } from "./controllers/nix-capabilities.controller";
import { NixChatController } from "./controllers/nix-chat.controller";
import { NixWalkthroughController } from "./controllers/nix-walkthrough.controller";
import { CustomFieldValueRepository } from "./custom-field-value.repository";
import { MongoCustomFieldValueRepository } from "./custom-field-value.repository.mongo";
import { PostgresCustomFieldValueRepository } from "./custom-field-value.repository.postgres";
import { CustomFieldValue } from "./entities/custom-field-value.entity";
import { NixChatMessage } from "./entities/nix-chat-message.entity";
import { NixChatSession } from "./entities/nix-chat-session.entity";
import { NixClarification } from "./entities/nix-clarification.entity";
import { NixExtraction } from "./entities/nix-extraction.entity";
import { NixExtractionRegion } from "./entities/nix-extraction-region.entity";
import { NixExtractionSession } from "./entities/nix-extraction-session.entity";
import { NixLearning } from "./entities/nix-learning.entity";
import { NixUserPreference } from "./entities/nix-user-preference.entity";
import { ProductDataSheet } from "./entities/product-data-sheet.entity";
import { MineInferenceService } from "./mine-inference.service";
import { MineLibraryController } from "./mine-library/mine-library.controller";
import { MineLibraryService } from "./mine-library/mine-library.service";
import { NixController } from "./nix.controller";
import { NixService } from "./nix.service";
import { NixChatMessageRepository } from "./nix-chat-message.repository";
import { MongoNixChatMessageRepository } from "./nix-chat-message.repository.mongo";
import { PostgresNixChatMessageRepository } from "./nix-chat-message.repository.postgres";
import { NixChatSessionRepository } from "./nix-chat-session.repository";
import { MongoNixChatSessionRepository } from "./nix-chat-session.repository.mongo";
import { PostgresNixChatSessionRepository } from "./nix-chat-session.repository.postgres";
import { NixClarificationRepository } from "./nix-clarification.repository";
import { MongoNixClarificationRepository } from "./nix-clarification.repository.mongo";
import { PostgresNixClarificationRepository } from "./nix-clarification.repository.postgres";
import { NixExtractionRepository } from "./nix-extraction.repository";
import { MongoNixExtractionRepository } from "./nix-extraction.repository.mongo";
import { PostgresNixExtractionRepository } from "./nix-extraction.repository.postgres";
import { NixExtractionRegionRepository } from "./nix-extraction-region.repository";
import { MongoNixExtractionRegionRepository } from "./nix-extraction-region.repository.mongo";
import { PostgresNixExtractionRegionRepository } from "./nix-extraction-region.repository.postgres";
import { NixExtractionSessionRepository } from "./nix-extraction-session.repository";
import { MongoNixExtractionSessionRepository } from "./nix-extraction-session.repository.mongo";
import { PostgresNixExtractionSessionRepository } from "./nix-extraction-session.repository.postgres";
import { NixLearningRepository } from "./nix-learning.repository";
import { MongoNixLearningRepository } from "./nix-learning.repository.mongo";
import { PostgresNixLearningRepository } from "./nix-learning.repository.postgres";
import { NixUserPreferenceRepository } from "./nix-user-preference.repository";
import { MongoNixUserPreferenceRepository } from "./nix-user-preference.repository.mongo";
import { PostgresNixUserPreferenceRepository } from "./nix-user-preference.repository.postgres";
import { ProductDataSheetRepository } from "./product-data-sheet.repository";
import { MongoProductDataSheetRepository } from "./product-data-sheet.repository.mongo";
import { PostgresProductDataSheetRepository } from "./product-data-sheet.repository.postgres";
import { ProductDataSheetsController } from "./product-data-sheets/product-data-sheets.controller";
import { ProductDataSheetsService } from "./product-data-sheets/product-data-sheets.service";
import { NixExtractionProfileRegistry, RfqPipingProfileHandler } from "./profiles";
import { RevisionTrackingService } from "./revision-tracking.service";
import { CustomFieldValueSchema } from "./schemas/custom-field-value.schema";
import { NixChatMessageSchema } from "./schemas/nix-chat-message.schema";
import { NixChatSessionSchema } from "./schemas/nix-chat-session.schema";
import { NixClarificationSchema } from "./schemas/nix-clarification.schema";
import { NixExtractionSchema } from "./schemas/nix-extraction.schema";
import { NixExtractionRegionSchema } from "./schemas/nix-extraction-region.schema";
import { NixExtractionSessionSchema } from "./schemas/nix-extraction-session.schema";
import { NixLearningSchema } from "./schemas/nix-learning.schema";
import { NixUserPreferenceSchema } from "./schemas/nix-user-preference.schema";
import { ProductDataSheetSchema } from "./schemas/product-data-sheet.schema";
import { AutoApprovalService } from "./services/auto-approval.service";
import { CustomFieldService } from "./services/custom-field.service";
import { DocumentAnnotationService } from "./services/document-annotation.service";
import { DocumentVerificationService } from "./services/document-verification.service";
import { ExcelExtractorService } from "./services/excel-extractor.service";
import { NixChatService } from "./services/nix-chat.service";
import { NixChatItemService } from "./services/nix-chat-item.service";
import { NixExtractionSessionService } from "./services/nix-extraction-session.service";
import { NixItemParserService } from "./services/nix-item-parser.service";
import { NixValidationService } from "./services/nix-validation.service";
import { PdfExtractorService } from "./services/pdf-extractor.service";
import { QuotePdfService } from "./services/quote-pdf.service";
import { QuoteToJobCardService } from "./services/quote-to-job-card.service";
import { RegistrationDocumentVerifierService } from "./services/registration-document-verifier.service";
import { RoleClassifierService } from "./services/role-classifier.service";
import { WordExtractorService } from "./services/word-extractor.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "NixExtraction", schema: NixExtractionSchema },
            { name: "NixExtractionSession", schema: NixExtractionSessionSchema },
            { name: "NixLearning", schema: NixLearningSchema },
            { name: "NixUserPreference", schema: NixUserPreferenceSchema },
            { name: "NixClarification", schema: NixClarificationSchema },
            { name: "NixExtractionRegion", schema: NixExtractionRegionSchema },
            { name: "NixChatSession", schema: NixChatSessionSchema },
            { name: "NixChatMessage", schema: NixChatMessageSchema },
            { name: "CustomFieldValue", schema: CustomFieldValueSchema },
            { name: "ProductDataSheet", schema: ProductDataSheetSchema },
            { name: "SaMine", schema: SaMineSchema },
            { name: "CustomerDocument", schema: CustomerDocumentSchema },
            { name: "CustomerProfile", schema: CustomerProfileSchema },
            { name: "CustomerOnboarding", schema: CustomerOnboardingSchema },
            { name: "SupplierDocument", schema: SupplierDocumentSchema },
            { name: "SupplierProfile", schema: SupplierProfileSchema },
            { name: "SupplierOnboarding", schema: SupplierOnboardingSchema },
            { name: "StockControlCompany", schema: StockControlCompanySchema },
            { name: "Company", schema: CompanySchema },
            { name: "User", schema: UserSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            NixExtraction,
            NixExtractionSession,
            NixLearning,
            NixUserPreference,
            NixClarification,
            NixExtractionRegion,
            NixChatSession,
            NixChatMessage,
            CustomFieldValue,
            ProductDataSheet,
            CustomerDocument,
            CustomerProfile,
            CustomerOnboarding,
            SupplierDocument,
            SupplierProfile,
            SupplierOnboarding,
            SaMine,
            StockControlCompany,
            Company,
            JobCard,
            JobCardLineItem,
          ]),
        ]),
    MinesModule,
    MulterModule.register({
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = path.extname(file.originalname);
          cb(null, `nix-${uniqueSuffix}${ext}`);
        },
      }),
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
    MetricsModule,
    forwardRef(() => RfqModule),
  ],
  controllers: [
    NixController,
    NixChatController,
    NixCapabilitiesController,
    NixWalkthroughController,
    MineLibraryController,
    ProductDataSheetsController,
  ],
  providers: [
    DocumentAnnotationService,
    CustomFieldService,
    NixExtractionProfileRegistry,
    NixCapabilityRegistry,
    NixAppRouterService,
    NixGuideLoader,
    WalkthroughEngine,
    RfqPipingProfileHandler,
    MineInferenceService,
    MineLibraryService,
    RevisionTrackingService,
    ProductDataSheetsService,
    NixService,
    NixExtractionSessionService,
    NixChatService,
    NixChatItemService,
    NixItemParserService,
    NixValidationService,
    ExcelExtractorService,
    PdfExtractorService,
    QuotePdfService,
    QuoteToJobCardService,
    RoleClassifierService,
    CompanyEmailService,
    WordExtractorService,
    AiChatService,
    AiExtractionService,
    RegistrationDocumentVerifierService,
    DocumentVerificationService,
    AutoApprovalService,
    AnyUserAuthGuard,
    repositoryProvider(
      NixExtractionSessionRepository,
      PostgresNixExtractionSessionRepository,
      MongoNixExtractionSessionRepository,
    ),
    repositoryProvider(
      NixExtractionRepository,
      PostgresNixExtractionRepository,
      MongoNixExtractionRepository,
    ),
    repositoryProvider(
      NixLearningRepository,
      PostgresNixLearningRepository,
      MongoNixLearningRepository,
    ),
    repositoryProvider(
      NixUserPreferenceRepository,
      PostgresNixUserPreferenceRepository,
      MongoNixUserPreferenceRepository,
    ),
    repositoryProvider(
      NixClarificationRepository,
      PostgresNixClarificationRepository,
      MongoNixClarificationRepository,
    ),
    repositoryProvider(
      NixExtractionRegionRepository,
      PostgresNixExtractionRegionRepository,
      MongoNixExtractionRegionRepository,
    ),
    repositoryProvider(
      NixChatSessionRepository,
      PostgresNixChatSessionRepository,
      MongoNixChatSessionRepository,
    ),
    repositoryProvider(
      NixChatMessageRepository,
      PostgresNixChatMessageRepository,
      MongoNixChatMessageRepository,
    ),
    repositoryProvider(
      CustomFieldValueRepository,
      PostgresCustomFieldValueRepository,
      MongoCustomFieldValueRepository,
    ),
    repositoryProvider(
      ProductDataSheetRepository,
      PostgresProductDataSheetRepository,
      MongoProductDataSheetRepository,
    ),
    repositoryProvider(
      CustomerDocumentRepository,
      PostgresCustomerDocumentRepository,
      MongoCustomerDocumentRepository,
    ),
    repositoryProvider(
      CustomerProfileRepository,
      PostgresCustomerProfileRepository,
      MongoCustomerProfileRepository,
    ),
    repositoryProvider(
      CustomerOnboardingRepository,
      PostgresCustomerOnboardingRepository,
      MongoCustomerOnboardingRepository,
    ),
    repositoryProvider(
      SupplierDocumentRepository,
      PostgresSupplierDocumentRepository,
      MongoSupplierDocumentRepository,
    ),
    repositoryProvider(
      SupplierProfileRepository,
      PostgresSupplierProfileRepository,
      MongoSupplierProfileRepository,
    ),
    repositoryProvider(
      SupplierOnboardingRepository,
      PostgresSupplierOnboardingRepository,
      MongoSupplierOnboardingRepository,
    ),
    repositoryProvider(SaMineRepository, PostgresSaMineRepository, MongoSaMineRepository),
    repositoryProvider(
      StockControlCompanyRepository,
      PostgresStockControlCompanyRepository,
      MongoStockControlCompanyRepository,
    ),
    repositoryProvider(CompanyRepository, PostgresCompanyRepository, MongoCompanyRepository),
  ],
  exports: [
    NixAppRouterService,
    NixService,
    NixExtractionSessionService,
    RoleClassifierService,
    NixChatService,
    NixItemParserService,
    NixValidationService,
    AiChatService,
    AiExtractionService,
    RegistrationDocumentVerifierService,
    DocumentVerificationService,
    AutoApprovalService,
    DocumentAnnotationService,
    CustomFieldService,
    NixExtractionProfileRegistry,
    NixCapabilityRegistry,
    NixGuideLoader,
    WalkthroughEngine,
    MineInferenceService,
    RevisionTrackingService,
    NixLearningRepository,
  ],
})
export class NixModule {}
