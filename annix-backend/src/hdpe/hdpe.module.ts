import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HdpeButtweldPrice } from "./entities/hdpe-buttweld-price.entity";
import { HdpeFittingDimension } from "./entities/hdpe-fitting-dimension.entity";
import { HdpeFittingType } from "./entities/hdpe-fitting-type.entity";
import { HdpeFittingWeight } from "./entities/hdpe-fitting-weight.entity";
import { HdpePipeSpecification } from "./entities/hdpe-pipe-specification.entity";
import { HdpeStandard } from "./entities/hdpe-standard.entity";
import { HdpeStubPrice } from "./entities/hdpe-stub-price.entity";
import { HdpeController } from "./hdpe.controller";
import { HdpeService } from "./hdpe.service";
import { HdpeFittingDimensionController } from "./hdpe-fitting-dimension.controller";
import { HdpeFittingDimensionService } from "./hdpe-fitting-dimension.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HdpePipeSpecification,
      HdpeFittingType,
      HdpeFittingWeight,
      HdpeFittingDimension,
      HdpeButtweldPrice,
      HdpeStubPrice,
      HdpeStandard,
    ]),
  ],
  controllers: [HdpeController, HdpeFittingDimensionController],
  providers: [HdpeService, HdpeFittingDimensionService],
  exports: [HdpeService, HdpeFittingDimensionService],
})
export class HdpeModule {}
