import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { FabricationComplexitySchema } from "./schemas/fabrication-complexity.schema";
import { FabricationOperationSchema } from "./schemas/fabrication-operation.schema";
import { ShopLaborRateSchema } from "./schemas/shop-labor-rate.schema";
import { StructuralSteelGradeSchema } from "./schemas/structural-steel-grade.schema";
import { StructuralSteelSectionSchema } from "./schemas/structural-steel-section.schema";
import { StructuralSteelTypeSchema } from "./schemas/structural-steel-type.schema";
import { StructuralSteelController } from "./structural-steel.controller";
import { StructuralSteelRepository } from "./structural-steel.repository";
import { MongoStructuralSteelRepository } from "./structural-steel.repository.mongo";
import { StructuralSteelService } from "./structural-steel.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "StructuralSteelType", schema: StructuralSteelTypeSchema },
      { name: "StructuralSteelSection", schema: StructuralSteelSectionSchema },
      { name: "StructuralSteelGrade", schema: StructuralSteelGradeSchema },
      { name: "FabricationOperation", schema: FabricationOperationSchema },
      { name: "FabricationComplexity", schema: FabricationComplexitySchema },
      { name: "ShopLaborRate", schema: ShopLaborRateSchema },
    ]),
  ],
  controllers: [StructuralSteelController],
  providers: [
    StructuralSteelService,
    repositoryProvider(StructuralSteelRepository, MongoStructuralSteelRepository),
  ],
  exports: [StructuralSteelService],
})
export class StructuralSteelModule {}
