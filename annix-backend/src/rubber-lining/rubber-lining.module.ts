import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { EmailModule } from "../email/email.module";
import { NixModule } from "../nix/nix.module";
import { App } from "../rbac/entities/app.entity";
import { UserAppAccess } from "../rbac/entities/user-app-access.entity";
import { RbacModule } from "../rbac/rbac.module";
import {
  RubberAdhesionRequirement,
  RubberApplicationRating,
  RubberThicknessRecommendation,
} from "./entities/rubber-application.entity";
import { RubberAuCoc } from "./entities/rubber-au-coc.entity";
import { RubberAuCocItem } from "./entities/rubber-au-coc-item.entity";
import { RubberCompany } from "./entities/rubber-company.entity";
import { RubberCompoundBatch } from "./entities/rubber-compound-batch.entity";
import { RubberCompoundMovement } from "./entities/rubber-compound-movement.entity";
import { RubberCompoundOrder } from "./entities/rubber-compound-order.entity";
import { RubberCompoundQualityConfig } from "./entities/rubber-compound-quality-config.entity";
import { RubberCompoundStock } from "./entities/rubber-compound-stock.entity";
import { RubberDeliveryNote } from "./entities/rubber-delivery-note.entity";
import { RubberDeliveryNoteItem } from "./entities/rubber-delivery-note-item.entity";
import { RubberOrder } from "./entities/rubber-order.entity";
import { RubberOrderItem } from "./entities/rubber-order-item.entity";
import { RubberPricingTier } from "./entities/rubber-pricing-tier.entity";
import { RubberProduct } from "./entities/rubber-product.entity";
import { RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { RubberProduction } from "./entities/rubber-production.entity";
import {
  RubberPurchaseRequisition,
  RubberPurchaseRequisitionItem,
} from "./entities/rubber-purchase-requisition.entity";
import { RubberQualityAlert } from "./entities/rubber-quality-alert.entity";
import { RubberRollStock } from "./entities/rubber-roll-stock.entity";
import { RubberSpecification } from "./entities/rubber-specification.entity";
import { RubberStockLocation } from "./entities/rubber-stock-location.entity";
import { RubberSupplierCoc } from "./entities/rubber-supplier-coc.entity";
import { RubberType } from "./entities/rubber-type.entity";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";
import { RubberAdminController } from "./rubber-admin.controller";
import { RubberAuCocService } from "./rubber-au-coc.service";
import { RubberBrandingService } from "./rubber-branding.service";
import { RubberCocService } from "./rubber-coc.service";
import { RubberCocExtractionService } from "./rubber-coc-extraction.service";
import { RubberDeliveryNoteService } from "./rubber-delivery-note.service";
import { RubberEmailMonitorService } from "./rubber-email-monitor.service";
import { RubberInboundEmailController } from "./rubber-inbound-email.controller";
import { RubberInboundEmailService } from "./rubber-inbound-email.service";
import { RubberLiningController } from "./rubber-lining.controller";
import { RubberLiningService } from "./rubber-lining.service";
import { RubberOrderImportService } from "./rubber-order-import.service";
import { RubberQualityTrackingService } from "./rubber-quality-tracking.service";
import { RubberRequisitionService } from "./rubber-requisition.service";
import { RubberRollStockService } from "./rubber-roll-stock.service";
import { RubberStockService } from "./rubber-stock.service";
import { RubberStockLocationService } from "./rubber-stock-location.service";

@Module({
  imports: [
    AdminModule,
    EmailModule,
    NixModule,
    RbacModule,
    TypeOrmModule.forFeature([
      App,
      UserAppAccess,
      RubberType,
      RubberSpecification,
      RubberApplicationRating,
      RubberThicknessRecommendation,
      RubberAdhesionRequirement,
      RubberProductCoding,
      RubberPricingTier,
      RubberCompany,
      RubberProduct,
      RubberOrder,
      RubberOrderItem,
      RubberCompoundStock,
      RubberCompoundMovement,
      RubberProduction,
      RubberCompoundOrder,
      RubberSupplierCoc,
      RubberCompoundBatch,
      RubberDeliveryNote,
      RubberDeliveryNoteItem,
      RubberRollStock,
      RubberAuCoc,
      RubberAuCocItem,
      RubberPurchaseRequisition,
      RubberPurchaseRequisitionItem,
      RubberStockLocation,
      RubberCompoundQualityConfig,
      RubberQualityAlert,
    ]),
  ],
  controllers: [RubberLiningController, RubberAdminController, RubberInboundEmailController],
  providers: [
    RubberLiningService,
    RubberStockService,
    RubberBrandingService,
    RubberCocService,
    RubberCocExtractionService,
    RubberDeliveryNoteService,
    RubberRollStockService,
    RubberAuCocService,
    RubberRequisitionService,
    RubberStockLocationService,
    RubberInboundEmailService,
    RubberEmailMonitorService,
    RubberQualityTrackingService,
    RubberOrderImportService,
    AuRubberAccessGuard,
  ],
  exports: [
    RubberLiningService,
    RubberStockService,
    RubberBrandingService,
    RubberCocService,
    RubberDeliveryNoteService,
    RubberRollStockService,
    RubberAuCocService,
    RubberRequisitionService,
    RubberStockLocationService,
    RubberQualityTrackingService,
  ],
})
export class RubberLiningModule {}
