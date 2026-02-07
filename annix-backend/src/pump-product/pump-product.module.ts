import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageModule } from "../storage/storage.module";
import { PumpProduct } from "./entities/pump-product.entity";
import { PumpCurveDigitizerService } from "./pump-curve-digitizer.service";
import { PumpDataImportService } from "./pump-data-import.service";
import { PumpDatasheetService } from "./pump-datasheet.service";
import { PumpManufacturerApiService } from "./pump-manufacturer-api.service";
import { PumpProductController } from "./pump-product.controller";
import { PumpProductService } from "./pump-product.service";

@Module({
  imports: [TypeOrmModule.forFeature([PumpProduct]), StorageModule],
  controllers: [PumpProductController],
  providers: [
    PumpProductService,
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
