import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PvcCementPrice } from "./entities/pvc-cement-price.entity";
import { PvcFittingDimension } from "./entities/pvc-fitting-dimension.entity";
import { PvcFittingType } from "./entities/pvc-fitting-type.entity";
import { PvcFittingWeight } from "./entities/pvc-fitting-weight.entity";
import { PvcPipeSpecification } from "./entities/pvc-pipe-specification.entity";
import { PvcStandard } from "./entities/pvc-standard.entity";
import { PvcController } from "./pvc.controller";
import { PvcService } from "./pvc.service";
import { PvcFittingDimensionController } from "./pvc-fitting-dimension.controller";
import { PvcFittingDimensionService } from "./pvc-fitting-dimension.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PvcPipeSpecification,
      PvcFittingType,
      PvcFittingWeight,
      PvcFittingDimension,
      PvcCementPrice,
      PvcStandard,
    ]),
  ],
  controllers: [PvcController, PvcFittingDimensionController],
  providers: [PvcService, PvcFittingDimensionService],
  exports: [PvcService, PvcFittingDimensionService],
})
export class PvcModule {}
