import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { EmailModule } from "../../email/email.module";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AppRepository, UserAppAccessRepository } from "../../rbac/rbac.repository";
import { MongoAppRepository, MongoUserAppAccessRepository } from "../../rbac/rbac.repository.mongo";
import { AppSchema } from "../../rbac/schemas/app.schema";
import { UserAppAccessSchema } from "../../rbac/schemas/user-app-access.schema";
import { SharedModule } from "../../shared/shared.module";
import { StorageModule } from "../../storage/storage.module";
import { UserSchema } from "../../user/schemas/user.schema";
import { UserRepository } from "../../user/user.repository";
import { MongoUserRepository } from "../../user/user.repository.mongo";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlOnboardingGuard } from "../guards/stock-control-onboarding.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { JobCardCoatingAnalysisRepository } from "../repositories/coating-analysis.repository";
import { MongoJobCardCoatingAnalysisRepository } from "../repositories/coating-analysis.repository.mongo";
import { DeliveryNoteRepository } from "../repositories/delivery-note.repository";
import { MongoDeliveryNoteRepository } from "../repositories/delivery-note.repository.mongo";
import { DeliveryNoteItemRepository } from "../repositories/delivery-note-item.repository";
import { MongoDeliveryNoteItemRepository } from "../repositories/delivery-note-item.repository.mongo";
import { JobCardRepository } from "../repositories/job-card.repository";
import { MongoJobCardRepository } from "../repositories/job-card.repository.mongo";
import { JobCardApprovalRepository } from "../repositories/job-card-approval.repository";
import { MongoJobCardApprovalRepository } from "../repositories/job-card-approval.repository.mongo";
import { JobCardExtractionCorrectionRepository } from "../repositories/job-card-extraction-correction.repository";
import { MongoJobCardExtractionCorrectionRepository } from "../repositories/job-card-extraction-correction.repository.mongo";
import { JobCardJobFileRepository } from "../repositories/job-card-job-file.repository";
import { MongoJobCardJobFileRepository } from "../repositories/job-card-job-file.repository.mongo";
import { JobCardLineItemRepository } from "../repositories/job-card-line-item.repository";
import { MongoJobCardLineItemRepository } from "../repositories/job-card-line-item.repository.mongo";
import { PushSubscriptionRepository } from "../repositories/push-subscription.repository";
import { MongoPushSubscriptionRepository } from "../repositories/push-subscription.repository.mongo";
import { StaffMemberRepository } from "../repositories/staff-member.repository";
import { MongoStaffMemberRepository } from "../repositories/staff-member.repository.mongo";
import { StockAllocationRepository } from "../repositories/stock-allocation.repository";
import { MongoStockAllocationRepository } from "../repositories/stock-allocation.repository.mongo";
import { StockControlActionPermissionRepository } from "../repositories/stock-control-action-permission.repository";
import { MongoStockControlActionPermissionRepository } from "../repositories/stock-control-action-permission.repository.mongo";
import { StockControlAdminTransferRepository } from "../repositories/stock-control-admin-transfer.repository";
import { MongoStockControlAdminTransferRepository } from "../repositories/stock-control-admin-transfer.repository.mongo";
import { StockControlCompanyRepository } from "../repositories/stock-control-company.repository";
import { MongoStockControlCompanyRepository } from "../repositories/stock-control-company.repository.mongo";
import { StockControlCompanyRoleRepository } from "../repositories/stock-control-company-role.repository";
import { MongoStockControlCompanyRoleRepository } from "../repositories/stock-control-company-role.repository.mongo";
import { StockControlInvitationRepository } from "../repositories/stock-control-invitation.repository";
import { MongoStockControlInvitationRepository } from "../repositories/stock-control-invitation.repository.mongo";
import { StockControlProfileRepository } from "../repositories/stock-control-profile.repository";
import { MongoStockControlProfileRepository } from "../repositories/stock-control-profile.repository.mongo";
import { StockControlRbacConfigRepository } from "../repositories/stock-control-rbac-config.repository";
import { MongoStockControlRbacConfigRepository } from "../repositories/stock-control-rbac-config.repository.mongo";
import { StockControlUserRepository } from "../repositories/stock-control-user.repository";
import { MongoStockControlUserRepository } from "../repositories/stock-control-user.repository.mongo";
import { StockIssuanceRepository } from "../repositories/stock-issuance.repository";
import { MongoStockIssuanceRepository } from "../repositories/stock-issuance.repository.mongo";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { MongoStockItemRepository } from "../repositories/stock-item.repository.mongo";
import { StockMovementRepository } from "../repositories/stock-movement.repository";
import { MongoStockMovementRepository } from "../repositories/stock-movement.repository.mongo";
import { StockPriceHistoryRepository } from "../repositories/stock-price-history.repository";
import { MongoStockPriceHistoryRepository } from "../repositories/stock-price-history.repository.mongo";
import { SupplierInvoiceRepository } from "../repositories/supplier-invoice.repository";
import { MongoSupplierInvoiceRepository } from "../repositories/supplier-invoice.repository.mongo";
import { UserLocationAssignmentRepository } from "../repositories/user-location-assignment.repository";
import { MongoUserLocationAssignmentRepository } from "../repositories/user-location-assignment.repository.mongo";
import { WorkflowNotificationRepository } from "../repositories/workflow-notification.repository";
import { MongoWorkflowNotificationRepository } from "../repositories/workflow-notification.repository.mongo";
import { WorkflowStepAssignmentRepository } from "../repositories/workflow-step-assignment.repository";
import { MongoWorkflowStepAssignmentRepository } from "../repositories/workflow-step-assignment.repository.mongo";
import { DeliveryNoteSchema } from "../schemas/delivery-note.schema";
import { DeliveryNoteItemSchema } from "../schemas/delivery-note-item.schema";
import { JobCardSchema } from "../schemas/job-card.schema";
import { JobCardApprovalSchema } from "../schemas/job-card-approval.schema";
import { JobCardCoatingAnalysisSchema } from "../schemas/job-card-coating-analysis.schema";
import { JobCardExtractionCorrectionSchema } from "../schemas/job-card-extraction-correction.schema";
import { JobCardJobFileSchema } from "../schemas/job-card-job-file.schema";
import { JobCardLineItemSchema } from "../schemas/job-card-line-item.schema";
import { PushSubscriptionSchema } from "../schemas/push-subscription.schema";
import { StaffMemberSchema } from "../schemas/staff-member.schema";
import { StockAllocationSchema } from "../schemas/stock-allocation.schema";
import { StockControlActionPermissionSchema } from "../schemas/stock-control-action-permission.schema";
import { StockControlAdminTransferSchema } from "../schemas/stock-control-admin-transfer.schema";
import { StockControlCompanySchema } from "../schemas/stock-control-company.schema";
import { StockControlCompanyRoleSchema } from "../schemas/stock-control-company-role.schema";
import { StockControlInvitationSchema } from "../schemas/stock-control-invitation.schema";
import { StockControlProfileSchema } from "../schemas/stock-control-profile.schema";
import { StockControlRbacConfigSchema } from "../schemas/stock-control-rbac-config.schema";
import { StockControlUserSchema } from "../schemas/stock-control-user.schema";
import { StockIssuanceSchema } from "../schemas/stock-issuance.schema";
import { StockItemSchema } from "../schemas/stock-item.schema";
import { StockMovementSchema } from "../schemas/stock-movement.schema";
import { StockPriceHistorySchema } from "../schemas/stock-price-history.schema";
import { SupplierInvoiceSchema } from "../schemas/supplier-invoice.schema";
import { UserLocationAssignmentSchema } from "../schemas/user-location-assignment.schema";
import { WorkflowNotificationSchema } from "../schemas/workflow-notification.schema";
import { WorkflowStepAssignmentSchema } from "../schemas/workflow-step-assignment.schema";
import { ActionPermissionService } from "../services/action-permission.service";
import { StockControlAuthService } from "../services/auth.service";
import { CompanyRoleService } from "../services/company-role.service";
import { PublicBrandingService } from "../services/public-branding.service";
import { RbacConfigService } from "../services/rbac-config.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "StaffMember", schema: StaffMemberSchema },
      { name: "PushSubscription", schema: PushSubscriptionSchema },
      {
        name: "StockControlActionPermission",
        schema: StockControlActionPermissionSchema,
      },
      {
        name: "StockControlAdminTransfer",
        schema: StockControlAdminTransferSchema,
      },
      { name: "StockControlCompany", schema: StockControlCompanySchema },
      { name: "StockControlCompanyRole", schema: StockControlCompanyRoleSchema },
      { name: "StockControlInvitation", schema: StockControlInvitationSchema },
      { name: "StockControlProfile", schema: StockControlProfileSchema },
      { name: "StockControlRbacConfig", schema: StockControlRbacConfigSchema },
      { name: "StockControlUser", schema: StockControlUserSchema },
      { name: "UserLocationAssignment", schema: UserLocationAssignmentSchema },
      { name: "WorkflowNotification", schema: WorkflowNotificationSchema },
      { name: "WorkflowStepAssignment", schema: WorkflowStepAssignmentSchema },
      { name: "User", schema: UserSchema },
      { name: "App", schema: AppSchema },
      { name: "UserAppAccess", schema: UserAppAccessSchema },
      { name: "JobCard", schema: JobCardSchema },
      { name: "JobCardApproval", schema: JobCardApprovalSchema },
      { name: "JobCardJobFile", schema: JobCardJobFileSchema },
      { name: "JobCardCoatingAnalysis", schema: JobCardCoatingAnalysisSchema },
      {
        name: "JobCardExtractionCorrection",
        schema: JobCardExtractionCorrectionSchema,
      },
      { name: "JobCardLineItem", schema: JobCardLineItemSchema },
      { name: "StockItem", schema: StockItemSchema },
      { name: "StockMovement", schema: StockMovementSchema },
      { name: "DeliveryNote", schema: DeliveryNoteSchema },
      { name: "DeliveryNoteItem", schema: DeliveryNoteItemSchema },
      { name: "StockAllocation", schema: StockAllocationSchema },
      { name: "StockIssuance", schema: StockIssuanceSchema },
      { name: "StockPriceHistory", schema: StockPriceHistorySchema },
      { name: "SupplierInvoice", schema: SupplierInvoiceSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: "8h" },
      }),
    }),
    EmailModule,
    SharedModule,
    StorageModule,
  ],
  providers: [
    StockControlAuthGuard,
    StockControlRoleGuard,
    StockControlOnboardingGuard,
    StockControlAuthService,
    CompanyRoleService,
    PublicBrandingService,
    ActionPermissionService,
    RbacConfigService,
    repositoryProvider(PushSubscriptionRepository, MongoPushSubscriptionRepository),
    repositoryProvider(StaffMemberRepository, MongoStaffMemberRepository),
    repositoryProvider(
      StockControlActionPermissionRepository,
      MongoStockControlActionPermissionRepository,
    ),
    repositoryProvider(
      StockControlAdminTransferRepository,
      MongoStockControlAdminTransferRepository,
    ),
    repositoryProvider(StockControlCompanyRepository, MongoStockControlCompanyRepository),
    repositoryProvider(StockControlCompanyRoleRepository, MongoStockControlCompanyRoleRepository),
    repositoryProvider(StockControlInvitationRepository, MongoStockControlInvitationRepository),
    repositoryProvider(StockControlProfileRepository, MongoStockControlProfileRepository),
    repositoryProvider(StockControlRbacConfigRepository, MongoStockControlRbacConfigRepository),
    repositoryProvider(StockControlUserRepository, MongoStockControlUserRepository),
    repositoryProvider(UserLocationAssignmentRepository, MongoUserLocationAssignmentRepository),
    repositoryProvider(WorkflowNotificationRepository, MongoWorkflowNotificationRepository),
    repositoryProvider(WorkflowStepAssignmentRepository, MongoWorkflowStepAssignmentRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(AppRepository, MongoAppRepository),
    repositoryProvider(UserAppAccessRepository, MongoUserAppAccessRepository),
    repositoryProvider(JobCardRepository, MongoJobCardRepository),
    repositoryProvider(JobCardApprovalRepository, MongoJobCardApprovalRepository),
    repositoryProvider(JobCardJobFileRepository, MongoJobCardJobFileRepository),
    repositoryProvider(JobCardCoatingAnalysisRepository, MongoJobCardCoatingAnalysisRepository),
    repositoryProvider(
      JobCardExtractionCorrectionRepository,
      MongoJobCardExtractionCorrectionRepository,
    ),
    repositoryProvider(JobCardLineItemRepository, MongoJobCardLineItemRepository),
    repositoryProvider(StockItemRepository, MongoStockItemRepository),
    repositoryProvider(StockMovementRepository, MongoStockMovementRepository),
    repositoryProvider(DeliveryNoteRepository, MongoDeliveryNoteRepository),
    repositoryProvider(DeliveryNoteItemRepository, MongoDeliveryNoteItemRepository),
    repositoryProvider(StockAllocationRepository, MongoStockAllocationRepository),
    repositoryProvider(StockIssuanceRepository, MongoStockIssuanceRepository),
    repositoryProvider(StockPriceHistoryRepository, MongoStockPriceHistoryRepository),
    repositoryProvider(SupplierInvoiceRepository, MongoSupplierInvoiceRepository),
  ],
  exports: [
    JwtModule,
    MongooseModule,
    StockControlAuthGuard,
    StockControlRoleGuard,
    StockControlOnboardingGuard,
    StockControlAuthService,
    CompanyRoleService,
    PublicBrandingService,
    ActionPermissionService,
    RbacConfigService,
    PushSubscriptionRepository,
    StaffMemberRepository,
    StockControlActionPermissionRepository,
    StockControlAdminTransferRepository,
    StockControlCompanyRepository,
    StockControlCompanyRoleRepository,
    StockControlInvitationRepository,
    StockControlProfileRepository,
    StockControlRbacConfigRepository,
    StockControlUserRepository,
    UserLocationAssignmentRepository,
    WorkflowNotificationRepository,
    WorkflowStepAssignmentRepository,
    UserRepository,
    AppRepository,
    UserAppAccessRepository,
    JobCardRepository,
    JobCardApprovalRepository,
    JobCardJobFileRepository,
    JobCardCoatingAnalysisRepository,
    JobCardExtractionCorrectionRepository,
    JobCardLineItemRepository,
    StockItemRepository,
    StockMovementRepository,
    DeliveryNoteRepository,
    DeliveryNoteItemRepository,
    StockAllocationRepository,
    StockIssuanceRepository,
    StockPriceHistoryRepository,
    SupplierInvoiceRepository,
  ],
})
export class StockControlCoreModule {}
