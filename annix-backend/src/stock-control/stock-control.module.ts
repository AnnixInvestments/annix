import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailModule } from "../email/email.module";
import { NbOdLookupModule } from "../nb-od-lookup/nb-od-lookup.module";
import { NixModule } from "../nix/nix.module";
import { PipeScheduleModule } from "../pipe-schedule/pipe-schedule.module";
import { StockControlAuthController } from "./controllers/auth.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { DeliveriesController } from "./controllers/deliveries.controller";
import { ImportController } from "./controllers/import.controller";
import { InventoryController } from "./controllers/inventory.controller";
import { InvitationController } from "./controllers/invitation.controller";
import { InvoicesController } from "./controllers/invoices.controller";
import { IssuanceController } from "./controllers/issuance.controller";
import { JobCardImportController } from "./controllers/job-card-import.controller";
import { JobCardsController } from "./controllers/job-cards.controller";
import { MovementsController } from "./controllers/movements.controller";
import { QrCodeController } from "./controllers/qr-code.controller";
import { ReportsController } from "./controllers/reports.controller";
import { RequisitionsController } from "./controllers/requisitions.controller";
import { SignatureController } from "./controllers/signature.controller";
import { StaffController } from "./controllers/staff.controller";
import { WorkflowController } from "./controllers/workflow.controller";
import { JobCardCoatingAnalysis } from "./entities/coating-analysis.entity";
import { DeliveryNote } from "./entities/delivery-note.entity";
import { DeliveryNoteItem } from "./entities/delivery-note-item.entity";
import { DispatchScan } from "./entities/dispatch-scan.entity";
import { InvoiceClarification } from "./entities/invoice-clarification.entity";
import { JobCard } from "./entities/job-card.entity";
import { JobCardApproval } from "./entities/job-card-approval.entity";
import { JobCardAttachment } from "./entities/job-card-attachment.entity";
import { JobCardDocument } from "./entities/job-card-document.entity";
import { JobCardImportMapping } from "./entities/job-card-import-mapping.entity";
import { JobCardLineItem } from "./entities/job-card-line-item.entity";
import { JobCardVersion } from "./entities/job-card-version.entity";
import { Requisition } from "./entities/requisition.entity";
import { RequisitionItem } from "./entities/requisition-item.entity";
import { StaffMember } from "./entities/staff-member.entity";
import { StaffSignature } from "./entities/staff-signature.entity";
import { StockAllocation } from "./entities/stock-allocation.entity";
import { StockControlCompany } from "./entities/stock-control-company.entity";
import { StockControlDepartment } from "./entities/stock-control-department.entity";
import { StockControlInvitation } from "./entities/stock-control-invitation.entity";
import { StockControlLocation } from "./entities/stock-control-location.entity";
import { StockControlUser } from "./entities/stock-control-user.entity";
import { StockIssuance } from "./entities/stock-issuance.entity";
import { StockItem } from "./entities/stock-item.entity";
import { StockMovement } from "./entities/stock-movement.entity";
import { StockPriceHistory } from "./entities/stock-price-history.entity";
import { SupplierInvoice } from "./entities/supplier-invoice.entity";
import { SupplierInvoiceItem } from "./entities/supplier-invoice-item.entity";
import { WorkflowNotification } from "./entities/workflow-notification.entity";
import { WorkflowStepAssignment } from "./entities/workflow-step-assignment.entity";
import { StockControlAuthGuard } from "./guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "./guards/stock-control-role.guard";
import { StockControlAuthService } from "./services/auth.service";
import { BrandingScraperService } from "./services/branding-scraper.service";
import { CoatingAnalysisService } from "./services/coating-analysis.service";
import { DashboardService } from "./services/dashboard.service";
import { DeliveryService } from "./services/delivery.service";
import { DispatchService } from "./services/dispatch.service";
import { DrawingExtractionService } from "./services/drawing-extraction.service";
import { ImportService } from "./services/import.service";
import { InventoryService } from "./services/inventory.service";
import { StockControlInvitationService } from "./services/invitation.service";
import { InvoiceService } from "./services/invoice.service";
import { InvoiceExtractionService } from "./services/invoice-extraction.service";
import { IssuanceService } from "./services/issuance.service";
import { ItemIdentificationService } from "./services/item-identification.service";
import { JobCardService } from "./services/job-card.service";
import { JobCardImportService } from "./services/job-card-import.service";
import { JobCardPdfService } from "./services/job-card-pdf.service";
import { JobCardVersionService } from "./services/job-card-version.service";
import { JobCardWorkflowService } from "./services/job-card-workflow.service";
import { LookupService } from "./services/lookup.service";
import { M2CalculationService } from "./services/m2-calculation.service";
import { MovementService } from "./services/movement.service";
import { PriceHistoryService } from "./services/price-history.service";
import { QrCodeService } from "./services/qr-code.service";
import { ReportsService } from "./services/reports.service";
import { RequisitionService } from "./services/requisition.service";
import { SignatureService } from "./services/signature.service";
import { StaffService } from "./services/staff.service";
import { WorkflowAssignmentService } from "./services/workflow-assignment.service";
import { WorkflowNotificationService } from "./services/workflow-notification.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockControlUser,
      StockControlCompany,
      StockControlInvitation,
      StockControlDepartment,
      StockControlLocation,
      StockItem,
      JobCard,
      StockAllocation,
      JobCardImportMapping,
      JobCardLineItem,
      DeliveryNote,
      DeliveryNoteItem,
      StockMovement,
      JobCardCoatingAnalysis,
      Requisition,
      RequisitionItem,
      StaffMember,
      JobCardApproval,
      JobCardDocument,
      JobCardVersion,
      JobCardAttachment,
      WorkflowNotification,
      WorkflowStepAssignment,
      DispatchScan,
      StaffSignature,
      StockIssuance,
      SupplierInvoice,
      SupplierInvoiceItem,
      InvoiceClarification,
      StockPriceHistory,
    ]),
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET", "stock-control-jwt-secret"),
        signOptions: { expiresIn: "1h" },
      }),
    }),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
    NixModule,
    NbOdLookupModule,
    PipeScheduleModule,
  ],
  controllers: [
    StockControlAuthController,
    InventoryController,
    JobCardsController,
    DeliveriesController,
    MovementsController,
    ImportController,
    IssuanceController,
    JobCardImportController,
    DashboardController,
    ReportsController,
    InvitationController,
    QrCodeController,
    RequisitionsController,
    StaffController,
    WorkflowController,
    SignatureController,
    InvoicesController,
  ],
  providers: [
    StockControlAuthGuard,
    StockControlRoleGuard,
    StockControlAuthService,
    BrandingScraperService,
    StockControlInvitationService,
    InventoryService,
    IssuanceService,
    JobCardService,
    DeliveryService,
    MovementService,
    ImportService,
    JobCardImportService,
    M2CalculationService,
    CoatingAnalysisService,
    DashboardService,
    QrCodeService,
    ReportsService,
    RequisitionService,
    StaffService,
    ItemIdentificationService,
    LookupService,
    SignatureService,
    WorkflowAssignmentService,
    WorkflowNotificationService,
    JobCardWorkflowService,
    DispatchService,
    JobCardPdfService,
    JobCardVersionService,
    DrawingExtractionService,
    InvoiceExtractionService,
    InvoiceService,
    PriceHistoryService,
  ],
})
export class StockControlModule {}
