import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { StorageModule } from "../../storage/storage.module";
import { SupplierController } from "../controllers/supplier.controller";
import { SupplierDocumentController } from "../controllers/supplier-document.controller";
import { StockControlCoreModule } from "../core/stock-control-core.module";
import { StockControlSupplierRepository } from "../repositories/stock-control-supplier.repository";
import { MongoStockControlSupplierRepository } from "../repositories/stock-control-supplier.repository.mongo";
import { SupplierDocumentRepository } from "../repositories/supplier-document.repository";
import { MongoSupplierDocumentRepository } from "../repositories/supplier-document.repository.mongo";
import { StockControlSupplierSchema } from "../schemas/stock-control-supplier.schema";
import { SupplierDocumentSchema } from "../schemas/supplier-document.schema";
import { SupplierDocumentService } from "../services/supplier-document.service";

@Module({
  imports: [
    StockControlCoreModule,
    MongooseModule.forFeature([
      { name: "StockControlSupplier", schema: StockControlSupplierSchema },
      { name: "SupplierDocument", schema: SupplierDocumentSchema },
    ]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
    StorageModule,
  ],
  controllers: [SupplierController, SupplierDocumentController],
  providers: [
    SupplierDocumentService,
    repositoryProvider(StockControlSupplierRepository, MongoStockControlSupplierRepository),
    repositoryProvider(SupplierDocumentRepository, MongoSupplierDocumentRepository),
  ],
  exports: [StockControlSupplierRepository],
})
export class SuppliersModule {}
