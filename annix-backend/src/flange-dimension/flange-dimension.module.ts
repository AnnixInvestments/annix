import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Bolt } from "src/bolt/entities/bolt.entity";
import { BoltMass } from "src/bolt-mass/entities/bolt-mass.entity";
import { FlangePressureClass } from "src/flange-pressure-class/entities/flange-pressure-class.entity";
import { FlangeStandard } from "src/flange-standard/entities/flange-standard.entity";
import { NominalOutsideDiameterMm } from "src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { FlangeDimension } from "./entities/flange-dimension.entity";
import { FlangeDimensionController } from "./flange-dimension.controller";
import { FlangeDimensionService } from "./flange-dimension.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FlangeDimension,
      NominalOutsideDiameterMm,
      FlangeStandard,
      FlangePressureClass,
      Bolt,
      BoltMass,
    ]),
  ],
  controllers: [FlangeDimensionController],
  providers: [FlangeDimensionService],
  exports: [FlangeDimensionService],
})
export class FlangeDimensionModule {}
