import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NominalOutsideDiameterMm } from "src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { SteelSpecification } from "src/steel-specification/entities/steel-specification.entity";
import { PipeDimension } from "./entities/pipe-dimension.entity";
import { PipeDimensionController } from "./pipe-dimension.controller";
import { PipeDimensionService } from "./pipe-dimension.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([PipeDimension, NominalOutsideDiameterMm, SteelSpecification]),
  ],
  providers: [PipeDimensionService],
  controllers: [PipeDimensionController],
  exports: [PipeDimensionService],
})
export class PipeDimensionModule {}
