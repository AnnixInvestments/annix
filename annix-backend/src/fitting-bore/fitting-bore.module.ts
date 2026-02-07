import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FittingVariant } from "src/fitting-variant/entities/fitting-variant.entity";
import { NominalOutsideDiameterMm } from "src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { FittingBore } from "./entities/fitting-bore.entity";
import { FittingBoreController } from "./fitting-bore.controller";
import { FittingBoreService } from "./fitting-bore.service";

@Module({
  imports: [TypeOrmModule.forFeature([FittingBore, NominalOutsideDiameterMm, FittingVariant])],
  providers: [FittingBoreService],
  controllers: [FittingBoreController],
})
export class FittingBoreModule {}
