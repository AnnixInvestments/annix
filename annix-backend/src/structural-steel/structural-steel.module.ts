import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FabricationComplexity } from "./entities/fabrication-complexity.entity";
import { FabricationOperation } from "./entities/fabrication-operation.entity";
import { ShopLaborRate } from "./entities/shop-labor-rate.entity";
import { StructuralSteelGrade } from "./entities/structural-steel-grade.entity";
import { StructuralSteelSection } from "./entities/structural-steel-section.entity";
import { StructuralSteelType } from "./entities/structural-steel-type.entity";
import { StructuralSteelController } from "./structural-steel.controller";
import { StructuralSteelService } from "./structural-steel.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StructuralSteelType,
      StructuralSteelSection,
      StructuralSteelGrade,
      FabricationOperation,
      FabricationComplexity,
      ShopLaborRate,
    ]),
  ],
  controllers: [StructuralSteelController],
  providers: [StructuralSteelService],
  exports: [StructuralSteelService],
})
export class StructuralSteelModule {}
