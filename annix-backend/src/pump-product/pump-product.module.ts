import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { StorageModule } from "../storage/storage.module";
import { PumpProduct } from "./entities/pump-product.entity";
import { PumpCurveDigitizerService } from "./pump-curve-digitizer.service";
import { PumpDataImportService } from "./pump-data-import.service";
import { PumpDatasheetService } from "./pump-datasheet.service";
import { PumpManufacturerApiService } from "./pump-manufacturer-api.service";
import { PumpProductController } from "./pump-product.controller";
import { PumpProductRepository } from "./pump-product.repository";
import { MongoPumpProductRepository } from "./pump-product.repository.mongo";
import { PostgresPumpProductRepository } from "./pump-product.repository.postgres";
import { PumpProductService } from "./pump-product.service";
import { PumpProductSchema } from "./schemas/pump-product.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "PumpProduct", schema: PumpProductSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([PumpProduct])]),
    StorageModule,
  ],
  controllers: [PumpProductController],
  providers: [
    PumpProductService,
    repositoryProvider(
      PumpProductRepository,
      PostgresPumpProductRepository,
      MongoPumpProductRepository,
    ),
    PumpDataImportService,
    PumpDatasheetService,
    PumpManufacturerApiService,
    PumpCurveDigitizerService,
  ],
  exports: [
    PumpProductService,
    PumpDataImportService,
    PumpDatasheetService,
    PumpManufacturerApiService,
    PumpCurveDigitizerService,
  ],
})
export class PumpProductModule {}
