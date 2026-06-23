import { Module } from "@nestjs/common";
import { NixModule } from "../../nix/nix.module";
import { StorageModule } from "../../storage/storage.module";
import { InventoryController } from "../controllers/inventory.controller";
import { StockControlCoreModule } from "../core/stock-control-core.module";
import { DeliverySupportModule } from "../delivery-support/delivery-support.module";
import { RequisitionModule } from "../requisition/requisition.module";
import { InventoryService } from "../services/inventory.service";
import { ItemIdentificationService } from "../services/item-identification.service";
import { PriceHistoryService } from "../services/price-history.service";

@Module({
  imports: [
    StockControlCoreModule,
    NixModule,
    RequisitionModule,
    StorageModule,
    DeliverySupportModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService, ItemIdentificationService, PriceHistoryService],
})
export class InventoryModule {}
