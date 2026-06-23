import { Module } from "@nestjs/common";
import { StockControlCoreModule } from "../core/stock-control-core.module";
import { DeliverySupplierService } from "../services/delivery-supplier.service";
import { SuppliersModule } from "../suppliers/suppliers.module";

@Module({
  imports: [StockControlCoreModule, SuppliersModule],
  providers: [DeliverySupplierService],
  exports: [DeliverySupplierService],
})
export class DeliverySupportModule {}
