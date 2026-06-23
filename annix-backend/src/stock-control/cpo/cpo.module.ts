import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { NixModule } from "../../nix/nix.module";
import { StorageModule } from "../../storage/storage.module";
import { StockControlCoreModule } from "../core/stock-control-core.module";
import { M2CalculationModule } from "../m2-calculation/m2-calculation.module";
import { QcModule } from "../qc/qc.module";
import { CpoCalloffRecordRepository } from "../repositories/cpo-calloff-record.repository";
import { MongoCpoCalloffRecordRepository } from "../repositories/cpo-calloff-record.repository.mongo";
import { CustomerPurchaseOrderRepository } from "../repositories/customer-purchase-order.repository";
import { MongoCustomerPurchaseOrderRepository } from "../repositories/customer-purchase-order.repository.mongo";
import { CustomerPurchaseOrderItemRepository } from "../repositories/customer-purchase-order-item.repository";
import { MongoCustomerPurchaseOrderItemRepository } from "../repositories/customer-purchase-order-item.repository.mongo";
import { RequisitionModule } from "../requisition/requisition.module";
import { CpoCalloffRecordSchema } from "../schemas/cpo-calloff-record.schema";
import { CustomerPurchaseOrderSchema } from "../schemas/customer-purchase-order.schema";
import { CustomerPurchaseOrderItemSchema } from "../schemas/customer-purchase-order-item.schema";
import { CoatingAnalysisService } from "../services/coating-analysis.service";
import { CpoService } from "../services/cpo.service";
import { WorkflowNotificationModule } from "../workflow-notification/workflow-notification.module";

@Module({
  imports: [
    StockControlCoreModule,
    RequisitionModule,
    QcModule,
    NixModule,
    StorageModule,
    MongooseModule.forFeature([
      { name: "CpoCalloffRecord", schema: CpoCalloffRecordSchema },
      {
        name: "CustomerPurchaseOrderItem",
        schema: CustomerPurchaseOrderItemSchema,
      },
      { name: "CustomerPurchaseOrder", schema: CustomerPurchaseOrderSchema },
    ]),
    M2CalculationModule,
    WorkflowNotificationModule,
  ],
  providers: [
    CpoService,
    CoatingAnalysisService,
    repositoryProvider(CpoCalloffRecordRepository, MongoCpoCalloffRecordRepository),
    repositoryProvider(
      CustomerPurchaseOrderItemRepository,
      MongoCustomerPurchaseOrderItemRepository,
    ),
    repositoryProvider(CustomerPurchaseOrderRepository, MongoCustomerPurchaseOrderRepository),
  ],
  exports: [
    CpoService,
    CoatingAnalysisService,
    CpoCalloffRecordRepository,
    CustomerPurchaseOrderItemRepository,
    CustomerPurchaseOrderRepository,
  ],
})
export class CpoModule {}
