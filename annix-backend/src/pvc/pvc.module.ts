import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PvcCementPrice } from "./entities/pvc-cement-price.entity";
import { PvcFittingType } from "./entities/pvc-fitting-type.entity";
import { PvcFittingWeight } from "./entities/pvc-fitting-weight.entity";
import { PvcPipeSpecification } from "./entities/pvc-pipe-specification.entity";
import { PvcStandard } from "./entities/pvc-standard.entity";
import { PvcController } from "./pvc.controller";
import { PvcService } from "./pvc.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PvcPipeSpecification,
      PvcFittingType,
      PvcFittingWeight,
      PvcCementPrice,
      PvcStandard,
    ]),
  ],
  controllers: [PvcController],
  providers: [PvcService],
  exports: [PvcService],
})
export class PvcModule {}
