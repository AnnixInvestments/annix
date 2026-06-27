import * as os from "node:os";
import * as path from "node:path";
import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { AdminModule } from "../admin/admin.module";
import { AuditModule } from "../audit/audit.module";
import { AnyUserAuthGuard } from "../auth/guards/any-user-auth.guard";
import { CustomerModule } from "../customer/customer.module";
import { CustomerDocumentRepository } from "../customer/customer-document.repository";
import { MongoCustomerDocumentRepository } from "../customer/customer-document.repository.mongo";
import { CustomerOnboardingRepository } from "../customer/customer-onboarding.repository";
import { MongoCustomerOnboardingRepository } from "../customer/customer-onboarding.repository.mongo";
import { CustomerProfileRepository } from "../customer/customer-profile.repository";
import { MongoCustomerProfileRepository } from "../customer/customer-profile.repository.mongo";
import { CustomerDocumentSchema } from "../customer/schemas/customer-document.schema";
import { CustomerOnboardingSchema } from "../customer/schemas/customer-onboarding.schema";
import { CustomerProfileSchema } from "../customer/schemas/customer-profile.schema";
import { EmailModule } from "../email/email.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MetricsModule } from "../metrics/metrics.module";
import { MinesModule } from "../mines/mines.module";
import { SaMineRepository } from "../mines/sa-mine.repository";
import { MongoSaMineRepository } from "../mines/sa-mine.repository.mongo";
import { SaMineSchema } from "../mines/schemas/sa-mine.schema";
import { CompanyRepository } from "../platform/company.repository";
import { MongoCompanyRepository } from "../platform/company.repository.mongo";
import { CompanySchema } from "../platform/schemas/company.schema";
import { RfqModule } from "../rfq/rfq.module";
import { SecureDocumentsModule } from "../secure-documents/secure-documents.module";
import { JobCardRepository } from "../stock-control/repositories/job-card.repository";
import { MongoJobCardRepository } from "../stock-control/repositories/job-card.repository.mongo";
import { JobCardLineItemRepository } from "../stock-control/repositories/job-card-line-item.repository";
import { MongoJobCardLineItemRepository } from "../stock-control/repositories/job-card-line-item.repository.mongo";
import { StockControlCompanyRepository } from "../stock-control/repositories/stock-control-company.repository";
import { MongoStockControlCompanyRepository } from "../stock-control/repositories/stock-control-company.repository.mongo";
import { JobCardSchema } from "../stock-control/schemas/job-card.schema";
import { JobCardLineItemSchema } from "../stock-control/schemas/job-card-line-item.schema";
import { StockControlCompanySchema } from "../stock-control/schemas/stock-control-company.schema";
import { CompanyEmailService } from "../stock-control/services/company-email.service";
import { StorageModule } from "../storage/storage.module";
import { SupplierDocumentSchema } from "../supplier/schemas/supplier-document.schema";
import { SupplierOnboardingSchema } from "../supplier/schemas/supplier-onboarding.schema";
import { SupplierProfileSchema } from "../supplier/schemas/supplier-profile.schema";
import { SupplierModule } from "../supplier/supplier.module";
import { SupplierDocumentRepository } from "../supplier/supplier-document.repository";
import { MongoSupplierDocumentRepository } from "../supplier/supplier-document.repository.mongo";
import { SupplierOnboardingRepository } from "../supplier/supplier-onboarding.repository";
import { MongoSupplierOnboardingRepository } from "../supplier/supplier-onboarding.repository.mongo";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { MongoSupplierProfileRepository } from "../supplier/supplier-profile.repository.mongo";
import { UserSchema } from "../user/schemas/user.schema";
import { UserModule } from "../user/user.module";
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
import { MineInferenceService } from "./mine-inference.service";
import { MineLibraryController } from "./mine-library/mine-library.controller";
import { MineLibraryService } from "./mine-library/mine-library.service";
import { NixController } from "./nix.controller";
import { NixService } from "./nix.service";
import { NixChatMessageRepository } from "./nix-chat-message.repository";
import { MongoNixChatMessageRepository } from "./nix-chat-message.repository.mongo";
import { NixChatSessionRepository } from "./nix-chat-session.repository";
import { MongoNixChatSessionRepository } from "./nix-chat-session.repository.mongo";
import { NixClarificationRepository } from "./nix-clarification.repository";
import { MongoNixClarificationRepository } from "./nix-clarification.repository.mongo";
import { NixExtractionRepository } from "./nix-extraction.repository";
import { MongoNixExtractionRepository } from "./nix-extraction.repository.mongo";
import { NixExtractionRegionRepository } from "./nix-extraction-region.repository";
import { MongoNixExtractionRegionRepository } from "./nix-extraction-region.repository.mongo";
import { NixExtractionSessionRepository } from "./nix-extraction-session.repository";
import { MongoNixExtractionSessionRepository } from "./nix-extraction-session.repository.mongo";
import { NixLearningRepository } from "./nix-learning.repository";
import { MongoNixLearningRepository } from "./nix-learning.repository.mongo";
import { NixUserPreferenceRepository } from "./nix-user-preference.repository";
import { MongoNixUserPreferenceRepository } from "./nix-user-preference.repository.mongo";
import { ProductDataSheetRepository } from "./product-data-sheet.repository";
import { MongoProductDataSheetRepository } from "./product-data-sheet.repository.mongo";
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
      { name: "JobCard", schema: JobCardSchema },
      { name: "JobCardLineItem", schema: JobCardLineItemSchema },
      { name: "Company", schema: CompanySchema },
      { name: "User", schema: UserSchema },
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
        fileSize: Number(process.env.NIX_MAX_UPLOAD_BYTES) || 40 * 1024 * 1024,
      },
    }),
    forwardRef(() => SecureDocumentsModule),
    forwardRef(() => AdminModule),
    forwardRef(() => CustomerModule),
    forwardRef(() => SupplierModule),
    UserModule,
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
    repositoryProvider(NixExtractionSessionRepository, MongoNixExtractionSessionRepository),
    repositoryProvider(NixExtractionRepository, MongoNixExtractionRepository),
    repositoryProvider(NixLearningRepository, MongoNixLearningRepository),
    repositoryProvider(NixUserPreferenceRepository, MongoNixUserPreferenceRepository),
    repositoryProvider(NixClarificationRepository, MongoNixClarificationRepository),
    repositoryProvider(NixExtractionRegionRepository, MongoNixExtractionRegionRepository),
    repositoryProvider(NixChatSessionRepository, MongoNixChatSessionRepository),
    repositoryProvider(NixChatMessageRepository, MongoNixChatMessageRepository),
    repositoryProvider(CustomFieldValueRepository, MongoCustomFieldValueRepository),
    repositoryProvider(ProductDataSheetRepository, MongoProductDataSheetRepository),
    repositoryProvider(CustomerDocumentRepository, MongoCustomerDocumentRepository),
    repositoryProvider(CustomerProfileRepository, MongoCustomerProfileRepository),
    repositoryProvider(CustomerOnboardingRepository, MongoCustomerOnboardingRepository),
    repositoryProvider(SupplierDocumentRepository, MongoSupplierDocumentRepository),
    repositoryProvider(SupplierProfileRepository, MongoSupplierProfileRepository),
    repositoryProvider(SupplierOnboardingRepository, MongoSupplierOnboardingRepository),
    repositoryProvider(SaMineRepository, MongoSaMineRepository),
    repositoryProvider(StockControlCompanyRepository, MongoStockControlCompanyRepository),
    repositoryProvider(CompanyRepository, MongoCompanyRepository),
    repositoryProvider(JobCardRepository, MongoJobCardRepository),
    repositoryProvider(JobCardLineItemRepository, MongoJobCardLineItemRepository),
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
