import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AiUsageModule } from "../../ai-usage/ai-usage.module";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { MetricsModule } from "../../metrics/metrics.module";
import { NixModule } from "../../nix/nix.module";
import { RubberLiningModule } from "../../rubber-lining/rubber-lining.module";
import { SageExportModule } from "../../sage-export/sage-export.module";
import { StockManagementModule } from "../../stock-management/stock-management.module";
import { StorageModule } from "../../storage/storage.module";
import { DeliveriesController } from "../controllers/deliveries.controller";
import { InvoicesController } from "../controllers/invoices.controller";
import { StockControlCoreModule } from "../core/stock-control-core.module";
import { CpoModule } from "../cpo/cpo.module";
import { DeliverySupportModule } from "../delivery-support/delivery-support.module";
import { DnExtractionCorrectionRepository } from "../repositories/dn-extraction-correction.repository";
import { MongoDnExtractionCorrectionRepository } from "../repositories/dn-extraction-correction.repository.mongo";
import { InvoiceClarificationRepository } from "../repositories/invoice-clarification.repository";
import { MongoInvoiceClarificationRepository } from "../repositories/invoice-clarification.repository.mongo";
import { InvoiceExtractionCorrectionRepository } from "../repositories/invoice-extraction-correction.repository";
import { MongoInvoiceExtractionCorrectionRepository } from "../repositories/invoice-extraction-correction.repository.mongo";
import { SupplierInvoiceItemRepository } from "../repositories/supplier-invoice-item.repository";
import { MongoSupplierInvoiceItemRepository } from "../repositories/supplier-invoice-item.repository.mongo";
import { DnExtractionCorrectionSchema } from "../schemas/dn-extraction-correction.schema";
import { InvoiceClarificationSchema } from "../schemas/invoice-clarification.schema";
import { InvoiceExtractionCorrectionSchema } from "../schemas/invoice-extraction-correction.schema";
import { SupplierInvoiceItemSchema } from "../schemas/supplier-invoice-item.schema";
import { DeliveryService } from "../services/delivery.service";
import { DeliveryExtractionService } from "../services/delivery-extraction.service";
import { DeliveryInvoiceService } from "../services/delivery-invoice.service";
import { InvoiceService } from "../services/invoice.service";
import { InvoiceExtractionService } from "../services/invoice-extraction.service";
import { SageInvoiceAdapterService } from "../services/sage-invoice-adapter.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "DnExtractionCorrection", schema: DnExtractionCorrectionSchema },
      { name: "InvoiceClarification", schema: InvoiceClarificationSchema },
      {
        name: "InvoiceExtractionCorrection",
        schema: InvoiceExtractionCorrectionSchema,
      },
      { name: "SupplierInvoiceItem", schema: SupplierInvoiceItemSchema },
    ]),
    StockControlCoreModule,
    NixModule,
    AiUsageModule,
    MetricsModule,
    StorageModule,
    DeliverySupportModule,
    StockManagementModule,
    RubberLiningModule,
    SageExportModule,
    CpoModule,
  ],
  controllers: [DeliveriesController, InvoicesController],
  providers: [
    DeliveryService,
    DeliveryInvoiceService,
    DeliveryExtractionService,
    InvoiceService,
    InvoiceExtractionService,
    SageInvoiceAdapterService,
    repositoryProvider(DnExtractionCorrectionRepository, MongoDnExtractionCorrectionRepository),
    repositoryProvider(InvoiceClarificationRepository, MongoInvoiceClarificationRepository),
    repositoryProvider(
      InvoiceExtractionCorrectionRepository,
      MongoInvoiceExtractionCorrectionRepository,
    ),
    repositoryProvider(SupplierInvoiceItemRepository, MongoSupplierInvoiceItemRepository),
  ],
  exports: [DeliveryService, InvoiceService, InvoiceExtractionService],
})
export class DeliveriesInvoicingModule {}
